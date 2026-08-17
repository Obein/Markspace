/**
 * TOTP Service: Implements RFC 6238 Time-Based One-Time Password and Base32 encoding
 * with AES-GCM Envelope Encryption backed by MASTER_ENCRYPTION_KEY (KEK).
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
   * Generate a random 20-byte Base32 TOTP secret key (160 bits).
   */
  public generateSecret(): string {
    const randomBytes = new Uint8Array(20);
    crypto.getRandomValues(randomBytes);
    return TotpService.encodeBase32(randomBytes);
  }

  /**
   * Generate standard otpauth:// URI for authenticator applications.
   */
  public generateOtpauthUri(username: string, secret: string, issuer: string = 'Markspace'): string {
    const encodedUser = encodeURIComponent(username);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer}:${encodedUser}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Generate TOTP 6-digit code for a given timestamp and secret.
   */
  public async generateCode(secret: string, timestamp: number = Date.now()): Promise<string> {
    const keyBytes = TotpService.decodeBase32(secret);
    const timeStep = Math.floor(timestamp / 1000 / 30);

    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setBigUint64(0, BigInt(timeStep), false); // Big-endian

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const hmacSig = await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
    const hmacBytes = new Uint8Array(hmacSig);

    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const binary =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Verify TOTP code with ±1 step (±30 seconds) clock drift tolerance.
   */
  public async verifyCode(secret: string, code: string, timestamp: number = Date.now()): Promise<boolean> {
    if (!code || code.trim().length !== 6) {
      return false;
    }
    const cleanCode = code.trim();

    // Check t-1, t, t+1
    for (const offset of [-1, 0, 1]) {
      const checkTime = timestamp + offset * 30 * 1000;
      const expectedCode = await this.generateCode(secret, checkTime);
      if (expectedCode === cleanCode) {
        return true;
      }
    }

    return false;
  }

  /**
   * Envelope encrypt the TOTP secret using the MASTER_ENCRYPTION_KEY (KEK).
   */
  public async encryptSecret(secret: string, kek?: string): Promise<string> {
    if (!kek || kek.trim().length === 0) {
      throw new Error(
        'CONFIG_ERROR: MASTER_ENCRYPTION_KEY environment binding is missing. Please set MASTER_ENCRYPTION_KEY in your Cloudflare Worker environment (.dev.vars or wrangler secret put MASTER_ENCRYPTION_KEY).'
      );
    }

    const encoder = new TextEncoder();
    const kekBuffer = encoder.encode(kek);
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

    const secretBuffer = encoder.encode(secret);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      secretBuffer
    );

    const payload = {
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv)),
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    };

    return JSON.stringify(payload);
  }

  /**
   * Envelope decrypt the TOTP secret using the MASTER_ENCRYPTION_KEY (KEK).
   */
  public async decryptSecret(encryptedJson: string, kek?: string): Promise<string> {
    if (!kek || kek.trim().length === 0) {
      throw new Error(
        'CONFIG_ERROR: MASTER_ENCRYPTION_KEY environment binding is missing. Please set MASTER_ENCRYPTION_KEY in your Cloudflare Worker environment.'
      );
    }

    const payload = JSON.parse(encryptedJson);
    const salt = Uint8Array.from(atob(payload.salt), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(payload.ciphertext), (c) => c.charCodeAt(0));

    const encoder = new TextEncoder();
    const kekBuffer = encoder.encode(kek);

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

    return new TextDecoder().decode(decrypted);
  }
}
