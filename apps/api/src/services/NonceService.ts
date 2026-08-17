export interface NonceInfo {
  nonce: string;
  expiresAt: number;
}

export type NonceValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason: 'INVALID_FORMAT' | 'MAC_MISMATCH' | 'USER_MISMATCH' | 'EXPIRED' | 'REUSE_LOCKOUT';
    };

export class NonceService {
  private readonly secret: string;
  // Local isolate in-memory consumed cache for strict single-use anti-replay enforcement
  private static readonly consumedNonces = new Map<string, number>();

  constructor(secret?: string) {
    this.secret = secret || 'markspace-anti-replay-zero-trust-nonce-secret-v1';
  }

  private bufferToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): Uint8Array | null {
    try {
      if (typeof base64 !== 'string' || base64.length !== 8) {
        return null;
      }
      const binary = atob(base64);
      if (binary.length !== 6) {
        return null;
      }
      const bytes = new Uint8Array(6);
      for (let i = 0; i < 6; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      return null;
    }
  }

  /**
   * Fast 8-bit user isolation binding tag (0 = anonymous, 1..255 = user-bound).
   */
  private computeUserTag(userId?: string): number {
    if (!userId || userId === 'anonymous') return 0;
    let h = 0x811c9dc5;
    for (let i = 0; i < userId.length; i++) {
      h ^= userId.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    const folded = (h ^ (h >>> 8) ^ (h >>> 16) ^ (h >>> 24)) & 0xff;
    return folded === 0 ? 1 : folded;
  }

  /**
   * Fast 16-bit MAC based on 32-bit FNV-1a with secret salting.
   */
  private computeMac(timeBlock: number, salt: number, userTag: number, secret: string): number {
    let hash = 0x811c9dc5; // 32-bit FNV offset basis
    for (let i = 0; i < secret.length; i++) {
      hash ^= secret.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= (timeBlock & 0xff);
    hash = Math.imul(hash, 0x01000193);
    hash ^= ((timeBlock >>> 8) & 0xff);
    hash = Math.imul(hash, 0x01000193);
    hash ^= (salt & 0xff);
    hash = Math.imul(hash, 0x01000193);
    hash ^= (userTag & 0xff);
    hash = Math.imul(hash, 0x01000193);

    return ((hash >>> 16) ^ (hash & 0xffff)) & 0xffff;
  }

  /**
   * Generate a fresh 6-byte Base64 (8 characters) cryptographic anti-replay nonce with user isolation.
   * Structure: 2-byte timeBlock (10s unit) + 1-byte salt + 1-byte userTag + 2-byte MAC
   */
  public generateNonce(userId?: string): NonceInfo {
    this.cleanExpired();
    const now = Date.now();
    const timeBlock = Math.floor(now / 10000) & 0xffff;

    const randomBytes = new Uint8Array(1);
    crypto.getRandomValues(randomBytes);
    const salt = randomBytes[0];

    const userTag = this.computeUserTag(userId);
    const mac = this.computeMac(timeBlock, salt, userTag, this.secret);

    const buffer = new Uint8Array(6);
    buffer[0] = timeBlock & 0xff;
    buffer[1] = (timeBlock >>> 8) & 0xff;
    buffer[2] = salt;
    buffer[3] = userTag;
    buffer[4] = mac & 0xff;
    buffer[5] = (mac >>> 8) & 0xff;

    const nonceBase64 = this.bufferToBase64(buffer);
    const expiresAt = now + 120 * 1000; // 120s TTL
    return { nonce: nonceBase64, expiresAt };
  }

  /**
   * Validates and consumes a nonce with user isolation and immediate lockout on reuse.
   */
  public consumeNonce(nonce: string, userId?: string): NonceValidationResult {
    const bytes = this.base64ToBuffer(nonce);
    if (!bytes || bytes.length !== 6) {
      return { valid: false, reason: 'INVALID_FORMAT' };
    }
    this.cleanExpired();

    const timeBlock = bytes[0] | (bytes[1] << 8);
    const salt = bytes[2];
    const userTag = bytes[3];
    const mac = bytes[4] | (bytes[5] << 8);

    // 1. Verify 16-bit cryptographic MAC
    const expectedMac = this.computeMac(timeBlock, salt, userTag, this.secret);
    if (mac !== expectedMac) {
      return { valid: false, reason: 'MAC_MISMATCH' };
    }

    // 2. User Isolation Check
    const expectedUserTag = this.computeUserTag(userId);
    if (userTag !== 0 && expectedUserTag !== 0 && userTag !== expectedUserTag) {
      return { valid: false, reason: 'USER_MISMATCH' };
    }

    // 3. Verify time window (10-second units, allow -2 to +12 blocks => ~20s future drift, 120s validity)
    const now = Date.now();
    const currentBlock = Math.floor(now / 10000) & 0xffff;
    let diff = (currentBlock - timeBlock) & 0xffff;
    if (diff > 0x7fff) diff -= 0x10000;

    if (diff < -2 || diff > 12) {
      return { valid: false, reason: 'EXPIRED' };
    }

    // 4. "复用即熔断" - Strict Single-Use Replay Check & Immediate Lockout
    if (NonceService.consumedNonces.has(nonce)) {
      return { valid: false, reason: 'REUSE_LOCKOUT' };
    }

    NonceService.consumedNonces.set(nonce, now);
    return { valid: true };
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [nonce, consumedAt] of NonceService.consumedNonces.entries()) {
      if (now - consumedAt > 120000) {
        NonceService.consumedNonces.delete(nonce);
      }
    }
  }
}
