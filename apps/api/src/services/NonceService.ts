export interface NonceInfo {
  nonce: string;
  expiresAt: number;
}

export class NonceService {
  private static readonly nonces = new Map<string, number>();

  /**
   * Generate a fresh single-use cryptographic anti-replay nonce (TTL = 90 seconds).
   */
  public generateNonce(): NonceInfo {
    this.cleanExpiredNonces();
    const nonce = `nonce_${crypto.randomUUID()}`;
    const expiresAt = Date.now() + 90 * 1000;
    NonceService.nonces.set(nonce, expiresAt);
    return { nonce, expiresAt };
  }

  /**
   * Atomically consume a single-use nonce (GETDEL).
   * Returns true if valid and unconsumed, false if invalid or expired.
   */
  public consumeNonce(nonce: string): boolean {
    this.cleanExpiredNonces();
    const expiresAt = NonceService.nonces.get(nonce);
    if (!expiresAt) {
      return false;
    }
    // Atomic single-use consumption
    NonceService.nonces.delete(nonce);

    if (Date.now() > expiresAt) {
      return false;
    }
    return true;
  }

  private cleanExpiredNonces(): void {
    const now = Date.now();
    for (const [nonce, expiresAt] of NonceService.nonces.entries()) {
      if (now > expiresAt) {
        NonceService.nonces.delete(nonce);
      }
    }
  }
}
