import { ICryptoService } from '../interfaces/ICryptoService';
import { MnemonicService } from './MnemonicService';
import { WorkerCryptoBridge } from './WorkerCryptoBridge';

export class EnvelopeCryptoService implements ICryptoService {
  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  public generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const saltHex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
    array.fill(0); // Memory scrubbing
    return saltHex;
  }

  public async generateVMK(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable for envelope wrapping by PIN and Recovery key
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  /**
   * Computes one-way blinded element M for OPRF evaluation using HMAC-SHA256.
   */
  public async computeOprfBlindPoint(input: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const saltKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(`markspace-oprf-salt:${salt}`),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const blindPayload = encoder.encode(`markspace-blind-input:${input.trim()}`);
    const sig = await crypto.subtle.sign('HMAC', saltKey, blindPayload);
    const bytes = new Uint8Array(sig);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Multi-Factor Key Derivation combining user PIN with OPRF Evaluation Response:
   * 1. Local PBKDF2(PIN, salt, 100,000, SHA-256)
   * 2. HMAC-SHA256(LocalKey, oprfEvaluatedPoint)
   */
  public async deriveKeyFromPin(pin: string, salt: string, oprfEvaluatedPoint?: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const pinBuffer = encoder.encode(pin.trim());
    const saltBuffer = encoder.encode(`markspace-pin-salt:${salt}`);

    try {
      const baseKey = await crypto.subtle.importKey('raw', pinBuffer, 'PBKDF2', false, ['deriveKey', 'deriveBits']);
      
      if (!oprfEvaluatedPoint) {
        // Fallback without server factor
        return await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256',
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['wrapKey', 'unwrapKey']
        );
      }

      // Multi-factor server assisted binding
      const localBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        256
      );

      const serverKeyData = encoder.encode(oprfEvaluatedPoint);
      const hmacKey = await crypto.subtle.importKey(
        'raw',
        serverKeyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const combinedSignature = await crypto.subtle.sign('HMAC', hmacKey, localBits);

      return await crypto.subtle.importKey(
        'raw',
        combinedSignature,
        { name: 'AES-GCM', length: 256 },
        false,
        ['wrapKey', 'unwrapKey']
      );
    } finally {
      pinBuffer.fill(0);
      saltBuffer.fill(0);
    }
  }

  /**
   * Multi-Factor Key Derivation combining 8-word Mnemonic with OPRF Evaluation Response:
   * 1. Local PBKDF2(Mnemonic, salt, 100,000, SHA-256)
   * 2. HMAC-SHA256(LocalKey, oprfEvaluatedPoint)
   */
  public async deriveKeyFromRecoveryKey(
    mnemonic: string,
    salt: string,
    oprfEvaluatedPoint?: string
  ): Promise<CryptoKey> {
    const normalized = MnemonicService.normalizeMnemonic(mnemonic);
    const encoder = new TextEncoder();
    const mnemonicBuffer = encoder.encode(normalized);
    const saltBuffer = encoder.encode(`markspace-recovery-salt:${salt}`);

    try {
      const baseKey = await crypto.subtle.importKey('raw', mnemonicBuffer, 'PBKDF2', false, ['deriveKey', 'deriveBits']);

      if (!oprfEvaluatedPoint) {
        return await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256',
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['wrapKey', 'unwrapKey']
        );
      }

      const localBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        256
      );

      const serverKeyData = encoder.encode(oprfEvaluatedPoint);
      const hmacKey = await crypto.subtle.importKey(
        'raw',
        serverKeyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const combinedSignature = await crypto.subtle.sign('HMAC', hmacKey, localBits);

      return await crypto.subtle.importKey(
        'raw',
        combinedSignature,
        { name: 'AES-GCM', length: 256 },
        false,
        ['wrapKey', 'unwrapKey']
      );
    } finally {
      mnemonicBuffer.fill(0);
      saltBuffer.fill(0);
    }
  }

  public async wrapVMK(vmk: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedBuffer = await crypto.subtle.wrapKey('raw', vmk, wrappingKey, {
      name: 'AES-GCM',
      iv,
    });

    const combined = new Uint8Array(iv.length + wrappedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(wrappedBuffer), iv.length);

    const base64Str = this.bufferToBase64(combined.buffer);
    combined.fill(0);
    iv.fill(0);
    return base64Str;
  }

  public async unwrapVMK(wrappedVmkBase64: string, unwrappingKey: CryptoKey): Promise<CryptoKey> {
    const combined = new Uint8Array(this.base64ToBuffer(wrappedVmkBase64));
    const iv = combined.slice(0, 12);
    const wrappedData = combined.slice(12);

    try {
      return await crypto.subtle.unwrapKey(
        'raw',
        wrappedData,
        unwrappingKey,
        { name: 'AES-GCM', iv },
        { name: 'AES-GCM', length: 256 },
        false, // CRITICAL: Non-extractable VMK in browser memory!
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );
    } finally {
      combined.fill(0);
      iv.fill(0);
    }
  }

  async deriveCMK(masterPassword: string, saltInput?: string): Promise<{ cmk: CryptoKey; salt: string }> {
    const salt = saltInput || this.generateSalt();

    try {
      const res = await WorkerCryptoBridge.executeTask<{ cmk: CryptoKey }>('DERIVE_CMK', {
        password: masterPassword,
        salt,
      });
      return { cmk: res.cmk, salt };
    } catch {
      const encoder = new TextEncoder();
      const saltBuffer = encoder.encode(salt);
      const pwdBuffer = encoder.encode(masterPassword);

      try {
        const baseKey = await crypto.subtle.importKey('raw', pwdBuffer, 'PBKDF2', false, ['deriveKey']);

        const cmk = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256',
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
        );

        return { cmk, salt };
      } finally {
        pwdBuffer.fill(0);
        saltBuffer.fill(0);
      }
    }
  }

  async generateDEK(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async wrapDEK(dek: CryptoKey, vmk: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedBuffer = await crypto.subtle.wrapKey('raw', dek, vmk, {
      name: 'AES-GCM',
      iv,
    });

    const combined = new Uint8Array(iv.length + wrappedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(wrappedBuffer), iv.length);

    const base64Str = this.bufferToBase64(combined.buffer);
    combined.fill(0);
    iv.fill(0);
    return base64Str;
  }

  async unwrapDEK(encryptedDekBase64: string, vmk: CryptoKey): Promise<CryptoKey> {
    const combined = new Uint8Array(this.base64ToBuffer(encryptedDekBase64));
    const iv = combined.slice(0, 12);
    const wrappedData = combined.slice(12);

    try {
      return await crypto.subtle.unwrapKey(
        'raw',
        wrappedData,
        vmk,
        { name: 'AES-GCM', iv },
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } finally {
      combined.fill(0);
      iv.fill(0);
    }
  }

  async encryptText(plainText: string, dek: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const plainBuffer = encoder.encode(plainText);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    try {
      const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        dek,
        plainBuffer
      );

      const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(cipherBuffer), iv.length);

      const base64Str = this.bufferToBase64(combined.buffer);
      combined.fill(0);
      return base64Str;
    } finally {
      plainBuffer.fill(0);
      iv.fill(0);
    }
  }

  async decryptText(cipherTextBase64: string, dek: CryptoKey): Promise<string> {
    const combined = new Uint8Array(this.base64ToBuffer(cipherTextBase64));
    const iv = combined.slice(0, 12);
    const cipherData = combined.slice(12);

    try {
      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        dek,
        cipherData
      );

      return new TextDecoder().decode(plainBuffer);
    } finally {
      combined.fill(0);
      iv.fill(0);
    }
  }

  async deriveAuthToken(masterPassword: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${masterPassword}:${salt}`);
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return hex;
    } finally {
      data.fill(0);
    }
  }
}
