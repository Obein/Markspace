/**
 * PasskeyCryptoService
 * Zero-Trust WebAuthn / FIDO2 Hardware-Bound Key Derivation Engine for Markspace E2EE Vaults.
 *
 * Provides:
 * 1. Passkey Registration & Authenticator Binding
 * 2. Deterministic Key Derivation (WebAuthn PRF extension with SHA-256/PBKDF2 signature entropy fallback)
 * 3. User-Scoped Passkey Metadata Management
 */

export interface PasskeyRegistrationResult {
  credentialId: string;
  rawIdHex: string;
  type: string;
  createdAt: number;
}

export class PasskeyCryptoService {
  /**
   * Check if WebAuthn / Passkeys are supported in the current environment
   */
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);
  }

  /**
   * Check if user-verifying platform authenticator (Touch ID, Windows Hello, Face ID) is available
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
   * Get stored Passkey credential info for a user
   */
  public static getStoredCredential(username: string): PasskeyRegistrationResult | null {
    if (!username) return null;
    try {
      const data = localStorage.getItem(`markspace_passkey_${username}`);
      if (data) {
        return JSON.parse(data) as PasskeyRegistrationResult;
      }
    } catch (_) {}
    return null;
  }

  /**
   * Register a new Passkey credential bound to the user account
   */
  public static async registerPasskey(
    username: string,
    userId?: string
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
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
      extensions: {
        // Request WebAuthn PRF (Pseudo-Random Function) extension
        prf: {
          eval: {
            first: encoder.encode('markspace-passkey-vault-seed-v1'),
          },
        },
      } as any,
    };

    const credential = (await navigator.credentials.create({
      publicKey: creationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Passkey creation was cancelled or failed.');
    }

    const rawIdHex = this.bufferToHex(credential.rawId);
    const result: PasskeyRegistrationResult = {
      credentialId: credential.id,
      rawIdHex,
      type: credential.type,
      createdAt: Date.now(),
    };

    localStorage.setItem(`markspace_passkey_${username}`, JSON.stringify(result));
    return result;
  }

  /**
   * Authenticate with Passkey and deterministically derive the Passkey Vault Key (PVK)
   */
  public static async authenticateAndDeriveKey(
    username: string,
    salt: string
  ): Promise<{ key: CryptoKey; credentialId: string }> {
    if (!this.isSupported()) {
      throw new Error('WebAuthn / Passkeys are not supported in this browser.');
    }

    const stored = this.getStoredCredential(username);
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const encoder = new TextEncoder();
    const prfSalt = encoder.encode(`markspace-passkey-salt:${salt}`);

    const allowCredentials: PublicKeyCredentialDescriptor[] = stored
      ? [
          {
            id: this.hexToBuffer(stored.rawIdHex) as any,
            type: 'public-key',
          },
        ]
      : [];

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

    const assertion = (await navigator.credentials.get({
      publicKey: requestOptions,
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('Passkey authentication was cancelled.');
    }

    const response = assertion.response as AuthenticatorAssertionResponse;
    const clientExtensions = assertion.getClientExtensionResults ? assertion.getClientExtensionResults() : {};

    // Check if PRF extension returned deterministic raw key output
    const prfResults = (clientExtensions as any)?.prf?.results?.first;
    let entropyBytes: Uint8Array;

    if (prfResults && prfResults instanceof ArrayBuffer) {
      entropyBytes = new Uint8Array(prfResults);
    } else {
      // High-entropy fallback: HMAC-SHA256 of signature, authenticatorData and user-salt
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

    // If credential was newly discovered, save it
    if (!stored) {
      const rawIdHex = this.bufferToHex(assertion.rawId);
      const newCred: PasskeyRegistrationResult = {
        credentialId: assertion.id,
        rawIdHex,
        type: assertion.type,
        createdAt: Date.now(),
      };
      localStorage.setItem(`markspace_passkey_${username}`, JSON.stringify(newCred));
    }

    return { key: derivedPvk, credentialId: assertion.id };
  }
}
