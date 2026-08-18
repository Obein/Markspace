export interface ICryptoService {
  /**
   * Generates a 16-byte cryptographically secure random hex salt.
   */
  generateSalt(): string;

  /**
   * Generates a random 256-bit AES-GCM Vault Master Key (VMK).
   */
  generateVMK(): Promise<CryptoKey>;

  /**
   * Computes one-way blinded element M for OPRF evaluation.
   */
  computeOprfBlindPoint(input: string, salt: string): Promise<string>;

  /**
   * Derives a cryptographic wrapping key from a Vault PIN (4-6 digits) combined with OPRF evaluation.
   */
  deriveKeyFromPin(pin: string, salt: string, oprfEvaluatedPoint?: string): Promise<CryptoKey>;

  /**
   * Derives a cryptographic wrapping key from an 8-word Mnemonic Recovery Key combined with OPRF evaluation.
   */
  deriveKeyFromRecoveryKey(mnemonic: string, salt: string, oprfEvaluatedPoint?: string): Promise<CryptoKey>;

  /**
   * Wraps (encrypts) a Vault Master Key (VMK) with a wrapping key.
   */
  wrapVMK(vmk: CryptoKey, wrappingKey: CryptoKey): Promise<string>;

  /**
   * Unwraps (decrypts) a wrapped VMK string using a wrapping key.
   */
  unwrapVMK(wrappedVmkBase64: string, unwrappingKey: CryptoKey): Promise<CryptoKey>;

  /**
   * Derive Customer Master Key (CMK) in browser memory using PBKDF2 (legacy fallback).
   */
  deriveCMK(masterPassword: string, salt?: string): Promise<{ cmk: CryptoKey; salt: string }>;

  /**
   * Generate a random AES-GCM Data Encryption Key (DEK).
   */
  generateDEK(): Promise<CryptoKey>;

  /**
   * Wrap (encrypt) a DEK using the CMK / VMK.
   */
  wrapDEK(dek: CryptoKey, vmk: CryptoKey): Promise<string>;

  /**
   * Unwrap (decrypt) an Encrypted_DEK string using the CMK / VMK.
   */
  unwrapDEK(encryptedDekBase64: string, vmk: CryptoKey): Promise<CryptoKey>;

  /**
   * Encrypt text payload with DEK to raw binary bytes (12-byte IV + AES-GCM ciphertext).
   */
  encryptText(plainText: string, dek: CryptoKey): Promise<Uint8Array>;

  /**
   * Decrypt raw binary or legacy string payload with DEK.
   */
  decryptText(cipherInput: ArrayBuffer | Uint8Array | string, dek: CryptoKey): Promise<string>;

  /**
   * Derive auth token for API registration/login (hash of password + salt).
   */
  deriveAuthToken(masterPassword: string, salt: string): Promise<string>;
}
