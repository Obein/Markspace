import { ICryptoService } from '../interfaces/ICryptoService';

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
    const encoder = new TextEncoder();
    const salt = saltInput || this.generateSalt();
    const saltBuffer = encoder.encode(salt);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(masterPassword),
      'PBKDF2',
      false,
      ['deriveKey']
    );

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
  }

  private generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async generateDEK(): Promise<CryptoKey> {
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

    return this.bufferToBase64(combined.buffer);
  }

  async unwrapDEK(encryptedDekBase64: string, cmk: CryptoKey): Promise<CryptoKey> {
    const combined = new Uint8Array(this.base64ToBuffer(encryptedDekBase64));
    const iv = combined.slice(0, 12);
    const wrappedData = combined.slice(12);

    return crypto.subtle.unwrapKey(
      'raw',
      wrappedData,
      cmk,
      { name: 'AES-GCM', iv },
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptText(plainText: string, dek: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      dek,
      encoder.encode(plainText)
    );

    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.length);

    return this.bufferToBase64(combined.buffer);
  }

  async decryptText(cipherTextBase64: string, dek: CryptoKey): Promise<string> {
    const combined = new Uint8Array(this.base64ToBuffer(cipherTextBase64));
    const iv = combined.slice(0, 12);
    const cipherData = combined.slice(12);

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      dek,
      cipherData
    );

    return new TextDecoder().decode(plainBuffer);
  }

  async deriveAuthToken(masterPassword: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${masterPassword}:${salt}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
