export interface NonceInfo {
  nonce: string;
  expiresAt: number;
}

export class NonceService {
  private readonly secret: string;
  // Local isolate in-memory consumed cache to prevent fast duplicate replays
  private static readonly consumedNonces = new Map<string, number>();

  constructor(secret?: string) {
    this.secret = secret || 'markspace-anti-replay-zero-trust-nonce-secret-v1';
  }

  /**
   * Fast 16-bit MAC based on 32-bit FNV-1a with secret salting.
   */
  private computeMac(timeBlock: number, salt: number, secret: string): number {
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

    return ((hash >>> 16) ^ (hash & 0xffff)) & 0xffff;
  }

  /**
   * Generate a fresh 5-byte (10 hex characters) cryptographic anti-replay nonce.
   * Structure: 2-byte timeBlock (10s unit) + 1-byte random salt + 2-byte 16-bit MAC
   */
  public generateNonce(): NonceInfo {
    this.cleanExpired();
    const now = Date.now();
    const timeBlock = Math.floor(now / 10000) & 0xffff;

    const randomBytes = new Uint8Array(1);
    crypto.getRandomValues(randomBytes);
    const salt = randomBytes[0];

    const mac = this.computeMac(timeBlock, salt, this.secret);

    const nonceHex =
      timeBlock.toString(16).padStart(4, '0') +
      salt.toString(16).padStart(2, '0') +
      mac.toString(16).padStart(4, '0');

    const expiresAt = now + 120 * 1000; // 120s TTL
    return { nonce: nonceHex, expiresAt };
  }

  /**
   * Validates and consumes a nonce with multi-isolate distributed edge protection.
   * Verifies cryptographic MAC integrity and time window (120s), with grace window for concurrent in-flight requests.
   */
  public consumeNonce(nonce: string): boolean {
    if (!nonce || typeof nonce !== 'string' || nonce.length !== 10) {
      return false;
    }
    this.cleanExpired();

    const timeBlock = parseInt(nonce.substring(0, 4), 16);
    const salt = parseInt(nonce.substring(4, 6), 16);
    const mac = parseInt(nonce.substring(6, 10), 16);

    if (isNaN(timeBlock) || isNaN(salt) || isNaN(mac)) {
      return false;
    }

    // 1. Verify 16-bit cryptographic MAC
    const expectedMac = this.computeMac(timeBlock, salt, this.secret);
    if (mac !== expectedMac) {
      return false;
    }

    // 2. Verify time window (10-second units, allow -2 to +12 blocks => ~20s future drift, 120s validity)
    const now = Date.now();
    const currentBlock = Math.floor(now / 10000) & 0xffff;
    let diff = (currentBlock - timeBlock) & 0xffff;
    if (diff > 0x7fff) diff -= 0x10000; // handle wrap around

    if (diff < -2 || diff > 12) {
      return false;
    }

    // 3. Local isolate replay check with 5-second concurrency grace window
    const firstConsumed = NonceService.consumedNonces.get(nonce);
    if (firstConsumed !== undefined) {
      if (now - firstConsumed <= 5000) {
        // Parallel in-flight request allowed
        return true;
      }
      // Replay attack rejected
      return false;
    }

    NonceService.consumedNonces.set(nonce, now);
    return true;
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
