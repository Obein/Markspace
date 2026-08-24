/**
 * StorageConfigCrypto
 * Zero-Knowledge AES-256-GCM Client-Side Encryption for Third-Party Storage Credentials.
 */
export class StorageConfigCrypto {
  public static bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  public static base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Derives a deterministic client-side key for storage configuration encryption
   * based on user credentials or user-specific context if VMK is not yet unlocked.
   */
  public static async deriveFallbackKey(username: string, vaultId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const material = encoder.encode(`markspace-storage-sec:${username.toLowerCase().trim()}:${vaultId}`);
    const hash = await crypto.subtle.digest('SHA-256', material);
    return await crypto.subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a storage configuration object into AES-256-GCM ciphertext
   */
  public static async encryptConfig(
    config: unknown,
    key: CryptoKey
  ): Promise<{ encryptedConfig: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const jsonString = JSON.stringify(config);
    const encoded = new TextEncoder().encode(jsonString);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encoded
    );

    return {
      encryptedConfig: this.bufferToBase64(ciphertext),
      iv: this.bufferToBase64(iv.buffer),
    };
  }

  /**
   * Decrypts an AES-256-GCM ciphertext back into the storage configuration object
   */
  public static async decryptConfig<T = any>(
    encryptedConfig: string,
    ivBase64: string,
    key: CryptoKey
  ): Promise<T> {
    const iv = new Uint8Array(this.base64ToBuffer(ivBase64));
    const data = this.base64ToBuffer(encryptedConfig);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data
    );

    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded) as T;
  }
}
