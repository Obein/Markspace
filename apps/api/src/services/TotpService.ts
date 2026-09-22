import { DerivedKek, KekProvider } from './security/KekProvider';

export interface EncryptedTotpPayload {
  v?: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface DecryptedTotpResult {
  secret: string;
  version: number;
}

/**
 * TOTP Service: Implements RFC 6238 Time-Based One-Time Password and Base32 encoding
 * with AES-GCM Envelope Encryption backed by MASTER_ENCRYPTION_KEY (KEK) with multi-version rotation.
 */
export class TotpService {
  private static readonly BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  /**
   * Encodes a Uint8Array buffer into a Base32 string.
   */
  public static encodeBase32(buffer: Uint8Array): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += TotpService.BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += TotpService.BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Decodes a Base32 string into a Uint8Array buffer.
   */
  public static decodeBase32(base32: string): Uint8Array {
    const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < clean.length; i++) {
      const idx = TotpService.BASE32_ALPHABET.indexOf(clean[i]);
      if (idx === -1) {
        throw new Error(`INVALID_BASE32: Invalid base32 character ${clean[i]}`);
      }

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return new Uint8Array(output);
  }

  /**
   * Generates a cryptographically secure 20-byte Base32 TOTP secret key (160 bits).
   */
  public generateSecret(): string {
    const randomBytes = new Uint8Array(20);
    crypto.getRandomValues(randomBytes);
    return TotpService.encodeBase32(randomBytes);
  }

  /**
   * Generates standard otpauth:// URI for authenticator applications.
   */
  public generateOtpauthUri(username: string, secret: string, issuer: string = 'Markspace'): string {
    const encodedUser = encodeURIComponent(username);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer}:${encodedUser}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Generates a 6-digit TOTP code for a given timestamp and secret.
   */
  public async generateCode(secretBase32: string, timestampMs = Date.now(), stepSeconds = 30): Promise<string> {
    const keyBytes = TotpService.decodeBase32(secretBase32);
    const counter = Math.floor(timestampMs / 1000 / stepSeconds);

    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setBigUint64(0, BigInt(counter), false);

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', hmacKey, counterBuffer);
    const hmac = new Uint8Array(signature);

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Verifies a TOTP code against a secret, with clock skew tolerance (+/- 1 step).
   * Automatically detects parameter order for both (code, secret) and (secret, code).
   */
  public async verifyCode(
    arg1: string,
    arg2: string,
    timestampMs = Date.now(),
    stepSeconds = 30,
    window = 1
  ): Promise<boolean> {
    let code: string;
    let secretBase32: string;
    if (arg1.trim().length === 6 && arg2.trim().length !== 6) {
      code = arg1.trim();
      secretBase32 = arg2.trim();
    } else {
      code = arg2.trim();
      secretBase32 = arg1.trim();
    }

    if (!code || code.length !== 6) return false;

    for (let i = -window; i <= window; i++) {
      const checkTime = timestampMs + i * stepSeconds * 1000;
      const expected = await this.generateCode(secretBase32, checkTime, stepSeconds);
      if (expected === code) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper to normalize KEK buffer.
   */
  private async resolveKeyBuffer(keyInput: DerivedKek | string): Promise<{ buffer: Uint8Array; version: number }> {
    if (typeof keyInput === 'object' && 'rawKey' in keyInput) {
      return { buffer: keyInput.rawKey, version: keyInput.version };
    }
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(keyInput.trim()));
    return { buffer: new Uint8Array(hash), version: 0 };
  }

  /**
   * Envelope encrypt the TOTP secret using a KEK (versioned).
   */
  public async encryptSecret(
    secret: string,
    keyInput: DerivedKek | string,
    version?: number
  ): Promise<string> {
    const { buffer: kekBuffer, version: resolvedVersion } = await this.resolveKeyBuffer(keyInput);
    const ver = version !== undefined ? version : resolvedVersion;

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const baseKey = await crypto.subtle.importKey('raw', kekBuffer, 'PBKDF2', false, ['deriveKey']);
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const encoder = new TextEncoder();
    const secretBuffer = encoder.encode(secret);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      secretBuffer
    );

    const payload: EncryptedTotpPayload = {
      v: ver,
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv)),
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    };

    return JSON.stringify(payload);
  }

  /**
   * Envelope decrypt the TOTP secret using the MASTER_ENCRYPTION_KEY (KEK).
   * Supports both KekProvider (auto version lookup) and legacy string key.
   */
  public async decryptSecret(
    encryptedJson: string,
    kekInput: KekProvider | DerivedKek | string
  ): Promise<DecryptedTotpResult> {
    const payload = JSON.parse(encryptedJson) as EncryptedTotpPayload;
    const version = payload.v !== undefined ? payload.v : 0;

    let kekBuffer: Uint8Array;
    if (kekInput instanceof KekProvider) {
      const derived = await kekInput.getKey(version);
      kekBuffer = derived.rawKey;
    } else {
      const resolved = await this.resolveKeyBuffer(kekInput);
      kekBuffer = resolved.buffer;
    }

    const salt = Uint8Array.from(atob(payload.salt), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(payload.ciphertext), (c) => c.charCodeAt(0));

    const baseKey = await crypto.subtle.importKey('raw', kekBuffer, 'PBKDF2', false, ['deriveKey']);
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      ciphertext
    );

    return {
      secret: new TextDecoder().decode(decrypted),
      version,
    };
  }
}
