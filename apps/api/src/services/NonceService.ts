export interface NonceInfo {
  nonce: string;
  expiresAt: number;
}

export class NonceService {
  // Active valid nonces map: nonce -> expiresAt (timestamp)
  private static readonly activeNonces = new Map<string, number>();
  // Grace window map for recently consumed nonces: nonce -> graceUntil (timestamp)
  private static readonly graceNonces = new Map<string, number>();

  /**
   * Generate a fresh 5-byte (10 hex characters) cryptographic anti-replay nonce.
   */
  public generateNonce(): NonceInfo {
    this.cleanExpired();
    const bytes = new Uint8Array(5); // 5 bytes = 40 bits of entropy
    crypto.getRandomValues(bytes);
    const nonce = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = Date.now() + 120 * 1000; // 120s TTL
    NonceService.activeNonces.set(nonce, expiresAt);
    return { nonce, expiresAt };
  }

  /**
   * Validates and consumes a nonce with AOP concurrency protection.
   * Allows a 5-second grace period for concurrent in-flight requests.
   */
  public consumeNonce(nonce: string): boolean {
    if (!nonce || typeof nonce !== 'string') return false;
    this.cleanExpired();

    const now = Date.now();

    // Check if nonce is currently active
    const expiresAt = NonceService.activeNonces.get(nonce);
    if (expiresAt) {
      NonceService.activeNonces.delete(nonce);
      if (now <= expiresAt) {
        // Move to grace window (5 seconds) to prevent parallel request race failures
        NonceService.graceNonces.set(nonce, now + 5000);
        return true;
      }
      return false;
    }

    // Check if within the 5-second grace window of a parallel request
    const graceUntil = NonceService.graceNonces.get(nonce);
    if (graceUntil && now <= graceUntil) {
      return true;
    }

    return false;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [nonce, expiresAt] of NonceService.activeNonces.entries()) {
      if (now > expiresAt) {
        NonceService.activeNonces.delete(nonce);
      }
    }
    for (const [nonce, graceUntil] of NonceService.graceNonces.entries()) {
      if (now > graceUntil) {
        NonceService.graceNonces.delete(nonce);
      }
    }
  }
}
