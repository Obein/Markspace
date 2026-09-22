import { MemoryScrubber } from './memoryScrubber';
import { MnemonicService } from './MnemonicService';

/**
 * UserMasterKeyService
 * Manages the client-side lifecycle of the User Master Key (UMK).
 *
 * Implements the Zero-Knowledge Hierarchical Key Management System:
 * - UMK (256-bit AES-GCM) is the root symmetric key for the user account.
 * - Wrapped by UEK (derived from WebAuthn PRF) -> wrapped_umk_by_prf
 * - Wrapped by REK (derived from 12-word BIP-39 phrase) -> wrapped_umk_by_recovery
 * - UMK in turn wraps each Vault Master Key (VMK) -> wrapped_vmk
 */
export class UserMasterKeyService {
  private static base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private static bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Generates a random 16-byte cryptographic salt in hex format.
   */
  public static generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const saltHex = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
    MemoryScrubber.wipe(array);
    return saltHex;
  }

  /**
   * Generates a new random 256-bit User Master Key (UMK).
   * Note: Initial creation is extractable so it can be wrapped by UEK/REK during enrollment.
   */
  public static async generateUMK(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable during enrollment wrapping
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  /**
   * Derives User Encryption Key (UEK) from WebAuthn PRF output bytes.
   *
   * @param prfEntropy 32-byte deterministic seed returned by WebAuthn PRF extension
   * @param salt Unique per-user or per-vault salt
   */
  public static async deriveUEKFromPrf(prfEntropy: Uint8Array, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const prfSalt = encoder.encode(`markspace-uek-salt:${salt}`);

    try {
      const baseKey = await crypto.subtle.importKey(
        'raw',
        prfEntropy as BufferSource,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      return await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: prfSalt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false, // non-extractable wrapper key
        ['wrapKey', 'unwrapKey']
      );
    } finally {
      MemoryScrubber.wipe(prfSalt);
    }
  }

  /**
   * Derives Recovery Encryption Key (REK) from normalized 12-word BIP-39 mnemonic.
   *
   * @param mnemonic 12-word BIP-39 phrase
   * @param recoverySalt Per-user recovery salt
   */
  public static async deriveREKFromMnemonic(mnemonic: string, recoverySalt: string): Promise<CryptoKey> {
    const normalized = MnemonicService.normalizeMnemonic(mnemonic);
    const encoder = new TextEncoder();
    const mnemonicBuffer = encoder.encode(normalized);
    const saltBuffer = encoder.encode(`markspace-rek-salt:${recoverySalt}`);

    try {
      const baseKey = await crypto.subtle.importKey(
        'raw',
        mnemonicBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );

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
    } finally {
      MemoryScrubber.wipeMultiple(mnemonicBuffer, saltBuffer);
    }
  }

  /**
   * Wraps UMK using a wrapping key (UEK or REK) via AES-GCM.
   * Prepends a 12-byte IV to the ciphertext and returns Base64.
   */
  public static async wrapUMK(umk: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedBuffer = await crypto.subtle.wrapKey('raw', umk, wrappingKey, {
      name: 'AES-GCM',
      iv,
    });

    const combined = new Uint8Array(iv.length + wrappedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(wrappedBuffer), iv.length);

    const base64Str = this.bufferToBase64(combined.buffer);
    MemoryScrubber.wipeMultiple(combined, iv);
    return base64Str;
  }

  /**
   * Unwraps UMK from Base64 ciphertext into a non-extractable session CryptoKey.
   */
  public static async unwrapUMK(wrappedBase64: string, unwrappingKey: CryptoKey): Promise<CryptoKey> {
    const combined = new Uint8Array(this.base64ToBuffer(wrappedBase64));
    const iv = combined.slice(0, 12);
    const wrappedData = combined.slice(12);

    try {
      return await crypto.subtle.unwrapKey(
        'raw',
        wrappedData,
        unwrappingKey,
        { name: 'AES-GCM', iv },
        { name: 'AES-GCM', length: 256 },
        false, // CRITICAL: Non-extractable root UMK in browser session memory
        ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
      );
    } finally {
      MemoryScrubber.wipeMultiple(combined, iv);
    }
  }

  /**
   * Wraps a Vault Master Key (VMK) with the User Master Key (UMK).
   */
  public static async wrapVMK(vmk: CryptoKey, umk: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedBuffer = await crypto.subtle.wrapKey('raw', vmk, umk, {
      name: 'AES-GCM',
      iv,
    });

    const combined = new Uint8Array(iv.length + wrappedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(wrappedBuffer), iv.length);

    const base64Str = this.bufferToBase64(combined.buffer);
    MemoryScrubber.wipeMultiple(combined, iv);
    return base64Str;
  }

  /**
   * Unwraps a Vault Master Key (VMK) using the User Master Key (UMK).
   * Returns a non-extractable session CryptoKey for file encryption/decryption.
   */
  public static async unwrapVMK(wrappedVmkBase64: string, umk: CryptoKey): Promise<CryptoKey> {
    const combined = new Uint8Array(this.base64ToBuffer(wrappedVmkBase64));
    const iv = combined.slice(0, 12);
    const wrappedData = combined.slice(12);

    try {
      return await crypto.subtle.unwrapKey(
        'raw',
        wrappedData,
        umk,
        { name: 'AES-GCM', iv },
        { name: 'AES-GCM', length: 256 },
        false, // CRITICAL: Non-extractable VMK in browser session memory
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );
    } finally {
      MemoryScrubber.wipeMultiple(combined, iv);
    }
  }
}
