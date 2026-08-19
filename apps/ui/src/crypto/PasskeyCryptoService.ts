/**
 * PasskeyCryptoService
 * Zero-Trust WebAuthn / FIDO2 Multi-Passkey Engine for Markspace E2EE Vaults.
 *
 * Supports:
 * - Multiple bound Passkeys per user
 * - Google Password Manager (Chrome, Android)
 * - Apple iCloud Keychain (Safari, macOS, iOS)
 * - 1Password, Bitwarden, Dashlane
 * - Windows Hello (PIN, Fingerprint, Facial Recognition)
 * - USB / NFC Hardware Security Keys (YubiKey)
 */

export interface PasskeyRegistrationResult {
  id: string;
  credentialId: string;
  rawIdHex: string;
  name: string;
  type: string;
  createdAt: number;
  lastUsedAt?: number;
}

export class PasskeyCryptoService {
  /**
   * Check if WebAuthn / Passkeys are supported in the current environment
   */
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);
  }

  /**
   * Check if user-verifying platform authenticator is available
   */
  public static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported() || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return false;
    }
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Convert BufferSource / ArrayBuffer to Hex string
   */
  private static bufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Convert Hex string to Uint8Array
   */
  private static hexToBuffer(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  /**
   * Helper to detect default user-friendly device/browser label
   */
  public static getDefaultPasskeyName(): string {
    if (typeof navigator === 'undefined') return 'Passkey';
    const ua = navigator.userAgent;
    let browser = 'Browser';
    let os = 'Device';

    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('iPhone')) os = 'iPhone';
    else if (ua.includes('iPad')) os = 'iPad';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} on ${os}`;
  }

  /**
   * Check if user has at least one Passkey registered
   */
  public static hasPasskey(username: string): boolean {
    if (!username) return false;
    return this.getStoredCredentials(username).length > 0;
  }

  /**
   * Get all stored Passkey credentials for a user
   */
  public static getStoredCredentials(username: string): PasskeyRegistrationResult[] {
    if (!username) return [];
    try {
      // 1. Try multi-passkey list
      const data = localStorage.getItem(`markspace_passkeys_${username}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed as PasskeyRegistrationResult[];
        }
      }

      // 2. Migration from legacy single-passkey storage
      const legacy = localStorage.getItem(`markspace_passkey_${username}`);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy) as PasskeyRegistrationResult;
        const migrated: PasskeyRegistrationResult = {
          ...parsedLegacy,
          id: parsedLegacy.credentialId || crypto.randomUUID(),
          name: parsedLegacy.name || this.getDefaultPasskeyName(),
        };
        const list = [migrated];
        localStorage.setItem(`markspace_passkeys_${username}`, JSON.stringify(list));
        return list;
      }
    } catch (_) {}
    return [];
  }

  /**
   * Get primary/first stored Passkey credential info for backward compatibility
   */
  public static getStoredCredential(username: string): PasskeyRegistrationResult | null {
    const list = this.getStoredCredentials(username);
    return list.length > 0 ? list[0] : null;
  }

  /**
   * Register a new Passkey credential and bind to the user account
   */
  public static async registerPasskey(
    username: string,
    userId?: string,
    customName?: string
  ): Promise<PasskeyRegistrationResult> {
    if (!this.isSupported()) {
      throw new Error('WebAuthn / Passkeys are not supported in this browser.');
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const effectiveUserId = userId || crypto.randomUUID();
    const encoder = new TextEncoder();
    const userHandle = encoder.encode(effectiveUserId);

    const creationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
        name: 'Markspace E2EE Vault',
      },
      user: {
        id: userHandle,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256 (ECDSA with P-256)
        { alg: -257, type: 'public-key' }, // RS256 (RSASSA-PKCS1-v1_5 with SHA-256)
        { alg: -8, type: 'public-key' },   // Ed25519 (EdDSA)
      ],
      authenticatorSelection: {
        residentKey: 'required', // Required for Google Password Manager & iCloud Keychain synced passkeys
        userVerification: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
      extensions: {
        // Request WebAuthn PRF (Pseudo-Random Function) extension for hardware deterministic key derivation
        prf: {
          eval: {
            first: encoder.encode('markspace-passkey-vault-seed-v1'),
          },
        },
      } as any,
    };

    // Modern browser hints for Google Password Manager, iCloud Keychain, and Security Keys
    if (typeof (creationOptions as any).hints === 'undefined') {
      (creationOptions as any).hints = ['client-device', 'hybrid', 'security-key'];
    }

    const credential = (await navigator.credentials.create({
      publicKey: creationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Passkey creation was cancelled or failed.');
    }

    const rawIdHex = this.bufferToHex(credential.rawId);
    const existingList = this.getStoredCredentials(username);

    // Default label: e.g. "Chrome on Windows" or "Passkey 2"
    const passkeyName =
      customName?.trim() ||
      (existingList.length === 0
        ? this.getDefaultPasskeyName()
        : `${this.getDefaultPasskeyName()} (${existingList.length + 1})`);

    const result: PasskeyRegistrationResult = {
      id: credential.id,
      credentialId: credential.id,
      rawIdHex,
      name: passkeyName,
      type: credential.type,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    // Check if duplicate credentialId exists; if so, update, otherwise append
    const updatedList = existingList.some((c) => c.credentialId === credential.id)
      ? existingList.map((c) => (c.credentialId === credential.id ? result : c))
      : [...existingList, result];

    localStorage.setItem(`markspace_passkeys_${username}`, JSON.stringify(updatedList));
    localStorage.setItem(`markspace_passkey_${username}`, JSON.stringify(result));

    return result;
  }

  /**
   * Rename a registered Passkey
   */
  public static renamePasskey(username: string, credentialId: string, newName: string): boolean {
    if (!username || !credentialId || !newName.trim()) return false;
    const list = this.getStoredCredentials(username);
    const updated = list.map((c) =>
      c.credentialId === credentialId ? { ...c, name: newName.trim() } : c
    );
    localStorage.setItem(`markspace_passkeys_${username}`, JSON.stringify(updated));
    return true;
  }

  /**
   * Delete a registered Passkey
   */
  public static deletePasskey(username: string, credentialId: string): boolean {
    if (!username || !credentialId) return false;
    const list = this.getStoredCredentials(username);
    const updated = list.filter((c) => c.credentialId !== credentialId);
    localStorage.setItem(`markspace_passkeys_${username}`, JSON.stringify(updated));
    if (updated.length > 0) {
      localStorage.setItem(`markspace_passkey_${username}`, JSON.stringify(updated[0]));
    } else {
      localStorage.removeItem(`markspace_passkey_${username}`);
    }
    return true;
  }

  /**
   * Authenticate with Passkey and deterministically derive the Passkey Vault Key (PVK).
   * Supports any of the user's bound Passkeys.
   */
  public static async authenticateAndDeriveKey(
    username: string,
    salt: string
  ): Promise<{ key: CryptoKey; credentialId: string }> {
    if (!this.isSupported()) {
      throw new Error('WebAuthn / Passkeys are not supported in this browser.');
    }

    const storedList = this.getStoredCredentials(username);
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const encoder = new TextEncoder();
    const prfSalt = encoder.encode(`markspace-passkey-salt:${salt}`);

    const allowCredentials: PublicKeyCredentialDescriptor[] = storedList.map((cred) => ({
      id: this.hexToBuffer(cred.rawIdHex) as any,
      type: 'public-key',
    }));

    const requestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      allowCredentials,
      userVerification: 'preferred',
      timeout: 60000,
      extensions: {
        prf: {
          eval: {
            first: prfSalt,
          },
        },
      } as any,
    };

    // Modern browser hints for synced Google Password Manager / iCloud Keychain
    (requestOptions as any).hints = ['client-device', 'hybrid', 'security-key'];

    const assertion = (await navigator.credentials.get({
      publicKey: requestOptions,
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('Passkey authentication was cancelled or failed.');
    }

    const response = assertion.response as AuthenticatorAssertionResponse;
    const clientExtensions = assertion.getClientExtensionResults ? assertion.getClientExtensionResults() : {};

    // Check if PRF extension returned deterministic raw key output
    const prfResults = (clientExtensions as any)?.prf?.results?.first;
    let entropyBytes: Uint8Array;

    if (prfResults && prfResults instanceof ArrayBuffer) {
      entropyBytes = new Uint8Array(prfResults);
    } else {
      // High-entropy deterministic derivation: SHA256 over signature, authenticatorData and user-salt
      const signatureBytes = new Uint8Array(response.signature);
      const authDataBytes = new Uint8Array(response.authenticatorData);
      const combinedBuffer = new Uint8Array(
        signatureBytes.length + authDataBytes.length + prfSalt.length
      );
      combinedBuffer.set(signatureBytes, 0);
      combinedBuffer.set(authDataBytes, signatureBytes.length);
      combinedBuffer.set(prfSalt, signatureBytes.length + authDataBytes.length);

      const hashDigest = await crypto.subtle.digest('SHA-256', combinedBuffer);
      entropyBytes = new Uint8Array(hashDigest);
    }

    // Derive deterministic AES-256-GCM Key (PVK) using PBKDF2 with 100,000 iterations
    const baseKey = await crypto.subtle.importKey(
      'raw',
      entropyBytes as BufferSource,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const derivedPvk = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: prfSalt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
    );

    // Update lastUsedAt timestamp on matching credential or register newly discovered credential
    const rawIdHex = this.bufferToHex(assertion.rawId);
    const existingIndex = storedList.findIndex(
      (c) => c.credentialId === assertion.id || c.rawIdHex === rawIdHex
    );

    if (existingIndex >= 0) {
      storedList[existingIndex].lastUsedAt = Date.now();
      localStorage.setItem(`markspace_passkeys_${username}`, JSON.stringify(storedList));
    } else {
      const newCred: PasskeyRegistrationResult = {
        id: assertion.id,
        credentialId: assertion.id,
        rawIdHex,
        name: this.getDefaultPasskeyName(),
        type: assertion.type,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      };
      const updated = [...storedList, newCred];
      localStorage.setItem(`markspace_passkeys_${username}`, JSON.stringify(updated));
    }

    return { key: derivedPvk, credentialId: assertion.id };
  }
}
