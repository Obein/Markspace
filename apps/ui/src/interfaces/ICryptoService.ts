export interface ICryptoService {
  /**
   * Derive Customer Master Key (CMK) in browser memory using PBKDF2.
   */
  deriveCMK(masterPassword: string, salt?: string): Promise<{ cmk: CryptoKey; salt: string }>;

  /**
   * Generate a random AES-GCM Data Encryption Key (DEK).
   */
  generateDEK(): Promise<CryptoKey>;

  /**
   * Wrap (encrypt) a DEK using the CMK.
   */
  wrapDEK(dek: CryptoKey, cmk: CryptoKey): Promise<string>;

  /**
   * Unwrap (decrypt) an Encrypted_DEK string using the CMK.
   */
  unwrapDEK(encryptedDekBase64: string, cmk: CryptoKey): Promise<CryptoKey>;

  /**
   * Encrypt text payload with DEK.
   */
  encryptText(plainText: string, dek: CryptoKey): Promise<string>;

  /**
   * Decrypt text payload with DEK.
   */
  decryptText(cipherTextBase64: string, dek: CryptoKey): Promise<string>;

  /**
   * Derive auth token for API registration/login (hash of password + salt).
   */
  deriveAuthToken(masterPassword: string, salt: string): Promise<string>;
}
