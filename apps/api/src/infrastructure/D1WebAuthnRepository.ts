export interface WebAuthnCredentialEntity {
  id: string;
  userId: string;
  publicKey: string;
  counter: number;
  transports: string | null;
  deviceName: string | null;
  aaguid: string | null;
  createdAt: number;
  lastUsedAt: number;
}

export interface WebAuthnChallengeEntity {
  challenge: string;
  userId: string | null;
  type: 'registration' | 'authentication';
  createdAt: number;
  expiresAt: number;
}

export interface UserCryptoKeysEntity {
  userId: string;
  wrappedUmkByPrf: string | null;
  wrappedUmkByRecovery: string;
  recoverySalt: string;
  createdAt: number;
  updatedAt: number;
}

export class D1WebAuthnRepository {
  constructor(private readonly db: D1Database) {}

  // ── Credentials ─────────────────────────────────────────────────────────────

  async saveCredential(cred: {
    id: string;
    userId: string;
    publicKey: string;
    counter: number;
    transports?: string;
    deviceName?: string;
    aaguid?: string;
  }): Promise<void> {
    const now = Date.now();
    await this.db
      .prepare(
        `INSERT INTO webauthn_credentials (id, user_id, public_key, counter, transports, device_name, aaguid, created_at, last_used_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        cred.id,
        cred.userId,
        cred.publicKey,
        cred.counter,
        cred.transports || null,
        cred.deviceName || null,
        cred.aaguid || null,
        now,
        now
      )
      .run();
  }

  async findCredentialById(id: string): Promise<WebAuthnCredentialEntity | null> {
    const row = await this.db
      .prepare(
        `SELECT id, user_id, public_key, counter, transports, device_name, aaguid, created_at, last_used_at
         FROM webauthn_credentials WHERE id = ?`
      )
      .bind(id)
      .first<{
        id: string;
        user_id: string;
        public_key: string;
        counter: number;
        transports: string | null;
        device_name: string | null;
        aaguid: string | null;
        created_at: number;
        last_used_at: number;
      }>();

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      counter: row.counter,
      transports: row.transports,
      deviceName: row.device_name,
      aaguid: row.aaguid,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    };
  }

  async findCredentialsByUserId(userId: string): Promise<WebAuthnCredentialEntity[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, user_id, public_key, counter, transports, device_name, aaguid, created_at, last_used_at
         FROM webauthn_credentials WHERE user_id = ? ORDER BY last_used_at DESC`
      )
      .bind(userId)
      .all<{
        id: string;
        user_id: string;
        public_key: string;
        counter: number;
        transports: string | null;
        device_name: string | null;
        aaguid: string | null;
        created_at: number;
        last_used_at: number;
      }>();

    return (results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      publicKey: row.public_key,
      counter: row.counter,
      transports: row.transports,
      deviceName: row.device_name,
      aaguid: row.aaguid,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    }));
  }

  async updateCredentialCounter(id: string, counter: number): Promise<void> {
    const now = Date.now();
    await this.db
      .prepare(
        `UPDATE webauthn_credentials SET counter = ?, last_used_at = ? WHERE id = ?`
      )
      .bind(counter, now, id)
      .run();
  }

  async deleteCredential(userId: string, id: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM webauthn_credentials WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .run();
  }

  // ── Challenges ─────────────────────────────────────────────────────────────

  async saveChallenge(
    challenge: string,
    type: 'registration' | 'authentication',
    userId?: string,
    ttlSeconds: number = 300
  ): Promise<void> {
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO webauthn_challenges (challenge, user_id, type, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(challenge, userId || null, type, now, expiresAt)
      .run();
  }

  async getChallenge(challenge: string): Promise<WebAuthnChallengeEntity | null> {
    const now = Date.now();
    const row = await this.db
      .prepare(
        `SELECT challenge, user_id, type, created_at, expires_at
         FROM webauthn_challenges WHERE challenge = ? AND expires_at > ?`
      )
      .bind(challenge, now)
      .first<{
        challenge: string;
        user_id: string | null;
        type: 'registration' | 'authentication';
        created_at: number;
        expires_at: number;
      }>();

    if (!row) return null;

    return {
      challenge: row.challenge,
      userId: row.user_id,
      type: row.type,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  async deleteChallenge(challenge: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM webauthn_challenges WHERE challenge = ?`)
      .bind(challenge)
      .run();
  }

  // ── User Crypto Keys (UMK) ──────────────────────────────────────────────────

  async saveUserCryptoKeys(keys: {
    userId: string;
    wrappedUmkByPrf?: string | null;
    wrappedUmkByRecovery: string;
    recoverySalt: string;
  }): Promise<void> {
    const now = Date.now();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO user_crypto_keys (user_id, wrapped_umk_by_prf, wrapped_umk_by_recovery, recovery_salt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        keys.userId,
        keys.wrappedUmkByPrf || null,
        keys.wrappedUmkByRecovery,
        keys.recoverySalt,
        now,
        now
      )
      .run();
  }

  async getUserCryptoKeys(userId: string): Promise<UserCryptoKeysEntity | null> {
    const row = await this.db
      .prepare(
        `SELECT user_id, wrapped_umk_by_prf, wrapped_umk_by_recovery, recovery_salt, created_at, updated_at
         FROM user_crypto_keys WHERE user_id = ?`
      )
      .bind(userId)
      .first<{
        user_id: string;
        wrapped_umk_by_prf: string | null;
        wrapped_umk_by_recovery: string;
        recovery_salt: string;
        created_at: number;
        updated_at: number;
      }>();

    if (!row) return null;

    return {
      userId: row.user_id,
      wrappedUmkByPrf: row.wrapped_umk_by_prf,
      wrappedUmkByRecovery: row.wrapped_umk_by_recovery,
      recoverySalt: row.recovery_salt,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateWrappedUmkByPrf(userId: string, wrappedUmkByPrf: string): Promise<void> {
    const now = Date.now();
    await this.db
      .prepare(
        `UPDATE user_crypto_keys SET wrapped_umk_by_prf = ?, updated_at = ? WHERE user_id = ?`
      )
      .bind(wrappedUmkByPrf, now, userId)
      .run();
  }
}
