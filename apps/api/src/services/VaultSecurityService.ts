export interface VaultSecurityRecord {
  vault_id: string;
  user_id: string;
  server_salt: string;
  fail_count: number;
  locked_until: number;
  created_at: number;
  updated_at: number;
}

export interface OprfEvaluationResponse {
  evaluatedPoint: string;
  failCount: number;
  lockedUntil: number;
  remainingSeconds: number;
  serverTime: number;
}

export class VaultSecurityService {
  private static readonly LOCKOUT_TIERS: Record<number, number> = {
    3: 60, // 3 failures = 1 minute cooldown
    4: 300, // 4 failures = 5 minutes cooldown
    5: 900, // 5 failures = 15 minutes cooldown
    6: 3600, // 6+ failures = 60 minutes cooldown
  };

  constructor(private readonly db: D1Database) {}

  /**
   * Derives vault-specific OPRF server evaluation key k.
   */
  private async deriveOprfKey(
    userId: string,
    vaultId: string,
    serverSalt: string,
    kek?: string
  ): Promise<CryptoKey> {
    const secret = kek || 'markspace-zero-trust-oprf-server-master-secret-v1';
    if (!secret || secret.length < 16) {
      throw new Error('SECURITY_ERROR: Server KEK (Key Encryption Key) master secret is not configured.');
    }
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const message = encoder.encode(`oprf_vault_key:${userId}:${vaultId}:${serverSalt}`);

    const masterHmacKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const subKeyBytes = await crypto.subtle.sign('HMAC', masterHmacKey, message);

    return crypto.subtle.importKey(
      'raw',
      subKeyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }

  /**
   * Evaluates blinded element M using OPRF server key k: Z = HMAC(k, M).
   */
  private async computeOprfEvaluation(
    oprfKey: CryptoKey,
    blindedPoint: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    const sig = await crypto.subtle.sign('HMAC', oprfKey, encoder.encode(blindedPoint));
    const bytes = new Uint8Array(sig);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * OPRF Evaluation for Vault Creation (Initial setup, no failure count penalty).
   */
  public async setupVaultOprf(
    userId: string,
    vaultId: string,
    blindedPoint: string,
    kek?: string
  ): Promise<string> {
    let existing = await this.db
      .prepare('SELECT * FROM vault_security WHERE vault_id = ? AND user_id = ?')
      .bind(vaultId, userId)
      .first<VaultSecurityRecord>();

    let serverSalt: string;
    const now = Date.now();

    if (!existing) {
      serverSalt = crypto.randomUUID();
      await this.db
        .prepare(
          'INSERT INTO vault_security (vault_id, user_id, server_salt, fail_count, locked_until, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?)'
        )
        .bind(vaultId, userId, serverSalt, now, now)
        .run();
    } else {
      serverSalt = existing.server_salt;
    }

    const oprfKey = await this.deriveOprfKey(userId, vaultId, serverSalt, kek);
    return this.computeOprfEvaluation(oprfKey, blindedPoint);
  }

  /**
   * OPRF Evaluation for Vault Unlock (Enforces Pre-Charge & Server Rate-Limiting Gate).
   * Charges 1 attempt on every evaluation call to prevent offline dictionary brute force.
   */
  public async evaluateOprf(
    userId: string,
    vaultId: string,
    blindedPoint: string,
    kek?: string
  ): Promise<OprfEvaluationResponse> {
    let existing = await this.db
      .prepare('SELECT * FROM vault_security WHERE vault_id = ? AND user_id = ?')
      .bind(vaultId, userId)
      .first<VaultSecurityRecord>();

    const now = Date.now();

    if (!existing) {
      const serverSalt = crypto.randomUUID();
      await this.db
        .prepare(
          'INSERT INTO vault_security (vault_id, user_id, server_salt, fail_count, locked_until, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?)'
        )
        .bind(vaultId, userId, serverSalt, now, now)
        .run();

      existing = {
        vault_id: vaultId,
        user_id: userId,
        server_salt: serverSalt,
        fail_count: 0,
        locked_until: 0,
        created_at: now,
        updated_at: now,
      };
    }

    // 1. Check if vault is currently locked out
    if (existing.locked_until > now) {
      const remainingSecs = Math.ceil((existing.locked_until - now) / 1000);
      const error: any = new Error(
        `VAULT_LOCKED_OUT: Vault is temporarily locked due to multiple incorrect attempts. Try again in ${remainingSecs} seconds.`
      );
      error.status = 403;
      error.code = 'VAULT_LOCKED_OUT';
      error.lockedUntil = existing.locked_until;
      error.remainingSeconds = remainingSecs;
      throw error;
    }

    // 2. Active Server-side Pre-Charge: Increment failure counter on every evaluation
    const newFailCount = existing.fail_count + 1;
    let penaltySeconds = 0;
    if (newFailCount >= 6) {
      penaltySeconds = VaultSecurityService.LOCKOUT_TIERS[6];
    } else if (VaultSecurityService.LOCKOUT_TIERS[newFailCount]) {
      penaltySeconds = VaultSecurityService.LOCKOUT_TIERS[newFailCount];
    }

    const lockedUntil = penaltySeconds > 0 ? now + penaltySeconds * 1000 : 0;

    await this.db
      .prepare(
        'UPDATE vault_security SET fail_count = ?, locked_until = ?, updated_at = ? WHERE vault_id = ? AND user_id = ?'
      )
      .bind(newFailCount, lockedUntil, now, vaultId, userId)
      .run();

    // 3. Compute OPRF response
    const oprfKey = await this.deriveOprfKey(userId, vaultId, existing.server_salt, kek);
    const evaluatedPoint = await this.computeOprfEvaluation(oprfKey, blindedPoint);

    return {
      evaluatedPoint,
      failCount: newFailCount,
      lockedUntil,
      remainingSeconds: penaltySeconds,
      serverTime: now,
    };
  }

  /**
   * Resets failure counter upon confirmed successful VMK unwrap by user.
   */
  public async reportPinSuccess(userId: string, vaultId: string): Promise<boolean> {
    const now = Date.now();
    await this.db
      .prepare(
        'UPDATE vault_security SET fail_count = 0, locked_until = 0, updated_at = ? WHERE vault_id = ? AND user_id = ?'
      )
      .bind(now, vaultId, userId)
      .run();

    return true;
  }
}
