export interface VaultSecurityRecord {
  vault_id: string;
  user_id: string;
  server_salt: string;
  fail_count: number;
  locked_until: number;
  created_at: number;
  updated_at: number;
}

export interface UnlockTicketResponse {
  serverTicketKey: string;
  failCount: number;
  serverTime: number;
}

export interface FailureReportResponse {
  failCount: number;
  lockedUntil: number;
  remainingSeconds: number;
}

export class VaultSecurityService {
  private static readonly LOCKOUT_TIERS: Record<number, number> = {
    3: 60, // 3 failures = 1 minute
    4: 300, // 4 failures = 5 minutes
    5: 900, // 5 failures = 15 minutes
    6: 3600, // 6+ failures = 60 minutes
  };

  constructor(private readonly db: D1Database) {}

  private async deriveTicketKey(
    userId: string,
    vaultId: string,
    serverSalt: string,
    kek?: string
  ): Promise<string> {
    const secret = kek || 'markspace-default-server-ticket-secret';
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const message = encoder.encode(`vault_ticket_key:${userId}:${vaultId}:${serverSalt}`);

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sig = await crypto.subtle.sign('HMAC', hmacKey, message);
    const bytes = new Uint8Array(sig);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  public async getOrCreateTicketKey(
    userId: string,
    vaultId: string,
    kek?: string
  ): Promise<string> {
    const existing = await this.db
      .prepare('SELECT * FROM vault_security WHERE vault_id = ? AND user_id = ?')
      .bind(vaultId, userId)
      .first<VaultSecurityRecord>();

    if (existing) {
      return this.deriveTicketKey(userId, vaultId, existing.server_salt, kek);
    }

    const serverSalt = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        'INSERT INTO vault_security (vault_id, user_id, server_salt, fail_count, locked_until, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?)'
      )
      .bind(vaultId, userId, serverSalt, now, now)
      .run();

    return this.deriveTicketKey(userId, vaultId, serverSalt, kek);
  }

  public async requestUnlockTicket(
    userId: string,
    vaultId: string,
    kek?: string
  ): Promise<UnlockTicketResponse> {
    let existing = await this.db
      .prepare('SELECT * FROM vault_security WHERE vault_id = ? AND user_id = ?')
      .bind(vaultId, userId)
      .first<VaultSecurityRecord>();

    if (!existing) {
      const serverSalt = crypto.randomUUID();
      const now = Date.now();
      await this.db
        .prepare(
          'INSERT INTO vault_security (vault_id, user_id, server_salt, fail_count, locked_until, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?)'
        )
        .bind(vaultId, userId, serverSalt, now, now)
        .run();

      const ticketKey = await this.deriveTicketKey(userId, vaultId, serverSalt, kek);
      return {
        serverTicketKey: ticketKey,
        failCount: 0,
        serverTime: now,
      };
    }

    const now = Date.now();

    // Check if vault is currently locked out
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

    const ticketKey = await this.deriveTicketKey(userId, vaultId, existing.server_salt, kek);
    return {
      serverTicketKey: ticketKey,
      failCount: existing.fail_count,
      serverTime: now,
    };
  }

  public async reportPinFailure(
    userId: string,
    vaultId: string
  ): Promise<FailureReportResponse> {
    const existing = await this.db
      .prepare('SELECT * FROM vault_security WHERE vault_id = ? AND user_id = ?')
      .bind(vaultId, userId)
      .first<VaultSecurityRecord>();

    const now = Date.now();
    const newFailCount = (existing?.fail_count ?? 0) + 1;

    let penaltySeconds = 0;
    if (newFailCount >= 6) {
      penaltySeconds = VaultSecurityService.LOCKOUT_TIERS[6];
    } else if (VaultSecurityService.LOCKOUT_TIERS[newFailCount]) {
      penaltySeconds = VaultSecurityService.LOCKOUT_TIERS[newFailCount];
    }

    const lockedUntil = penaltySeconds > 0 ? now + penaltySeconds * 1000 : 0;

    if (existing) {
      await this.db
        .prepare(
          'UPDATE vault_security SET fail_count = ?, locked_until = ?, updated_at = ? WHERE vault_id = ? AND user_id = ?'
        )
        .bind(newFailCount, lockedUntil, now, vaultId, userId)
        .run();
    } else {
      const serverSalt = crypto.randomUUID();
      await this.db
        .prepare(
          'INSERT INTO vault_security (vault_id, user_id, server_salt, fail_count, locked_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(vaultId, userId, serverSalt, newFailCount, lockedUntil, now, now)
        .run();
    }

    return {
      failCount: newFailCount,
      lockedUntil,
      remainingSeconds: penaltySeconds,
    };
  }

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
