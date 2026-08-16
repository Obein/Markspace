import { ICryptoService } from '../interfaces/ICryptoService';
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

  async deriveCMK(masterPassword: string, saltInput?: string): Promise<{ cmk: CryptoKey; salt: string }> {
    const salt = saltInput || this.generateSalt();

    try {
      // Offload to Web Worker cryptographic sandbox if supported
      const res = await WorkerCryptoBridge.executeTask<{ cmk: CryptoKey }>('DERIVE_CMK', {
        password: masterPassword,
        salt,
      });
      return { cmk: res.cmk, salt };
    } catch {
      // Main-thread fallback with strict memory scrubbing
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
          false, // CRITICAL: Non-extractable key
          ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
        );

        return { cmk, salt };
      } finally {
        // Explicit memory scrubbing
        pwdBuffer.fill(0);
        saltBuffer.fill(0);
      }
    }
  }

  private generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const saltHex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
    array.fill(0); // Memory scrubbing
    return saltHex;
  }

  async generateDEK(): Promise<CryptoKey> {
    // Generate key for wrapping. WebCrypto wrapKey requires the key being wrapped to be extractable (extractable: true).
    // Once wrapped by wrapDEK and stored, unwrapDEK unwraps it strictly as non-extractable (extractable: false).
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async wrapDEK(dek: CryptoKey, cmk: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedBuffer = await crypto.subtle.wrapKey('raw', dek, cmk, {
      name: 'AES-GCM',
      iv,
    });

    const combined = new Uint8Array(iv.length + wrappedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(wrappedBuffer), iv.length);

    const base64Str = this.bufferToBase64(combined.buffer);
    combined.fill(0); // Memory scrubbing
    iv.fill(0);
    return base64Str;
  }

  async unwrapDEK(encryptedDekBase64: string, cmk: CryptoKey): Promise<CryptoKey> {
    const combined = new Uint8Array(this.base64ToBuffer(encryptedDekBase64));
    const iv = combined.slice(0, 12);
    const wrappedData = combined.slice(12);

    try {
      return await crypto.subtle.unwrapKey(
        'raw',
        wrappedData,
        cmk,
        { name: 'AES-GCM', iv },
        { name: 'AES-GCM', length: 256 },
        false, // CRITICAL: Non-extractable unwrapped DEK in browser memory!
        ['encrypt', 'decrypt']
      );
    } finally {
      combined.fill(0); // Memory scrubbing
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
      plainBuffer.fill(0); // Memory scrubbing
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
      combined.fill(0); // Memory scrubbing
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
      data.fill(0); // Memory scrubbing
    }
  }
}
