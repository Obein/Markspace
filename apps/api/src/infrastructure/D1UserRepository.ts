import { IUserRepository } from '../interfaces/IUserRepository';
import { SystemConfig, User, UserAdminSummary, UserRole } from '../types/domain';

interface D1UserRow {
  id: string;
  username: string;
  auth_token_hash: string;
  salt: string;
  role: string;
  encrypted_totp_secret: string | null;
  is_totp_enabled: number;
  created_at: number;
  updated_at: number;
  last_active_at: number | null;
  storage_quota_bytes: number | null;
}

export class D1UserRepository implements IUserRepository {
  constructor(private readonly db: D1Database) {}

  private mapRowToUser(result: D1UserRow): User {
    return {
      id: result.id,
      username: result.username,
      authTokenHash: result.auth_token_hash,
      salt: result.salt,
      role: (result.role as UserRole) || 'user',
      encryptedTotpSecret: result.encrypted_totp_secret || undefined,
      isTotpEnabled: Boolean(result.is_totp_enabled),
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      lastActiveAt: result.last_active_at || result.created_at,
      storageQuotaBytes: result.storage_quota_bytes,
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db
      .prepare(
        'SELECT id, username, auth_token_hash, salt, role, encrypted_totp_secret, is_totp_enabled, created_at, updated_at, last_active_at, storage_quota_bytes FROM users WHERE username = ?'
      )
      .bind(username.toLowerCase().trim())
      .first<D1UserRow>();

    if (!result) return null;
    return this.mapRowToUser(result);
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare(
        'SELECT id, username, auth_token_hash, salt, role, encrypted_totp_secret, is_totp_enabled, created_at, updated_at, last_active_at, storage_quota_bytes FROM users WHERE id = ?'
      )
      .bind(id)
      .first<D1UserRow>();

    if (!result) return null;
    return this.mapRowToUser(result);
  }

  async create(user: User): Promise<User> {
    const now = Date.now();
    const lastActive = user.lastActiveAt || now;
    await this.db
      .prepare(
        'INSERT INTO users (id, username, auth_token_hash, salt, role, encrypted_totp_secret, is_totp_enabled, created_at, updated_at, last_active_at, storage_quota_bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        user.id,
        user.username.toLowerCase().trim(),
        user.authTokenHash,
        user.salt,
        user.role,
        user.encryptedTotpSecret || null,
        user.isTotpEnabled ? 1 : 0,
        user.createdAt,
        user.updatedAt,
        lastActive,
        user.storageQuotaBytes || null
      )
      .run();

    return user;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const result = await this.db
      .prepare('SELECT 1 FROM users WHERE username = ? LIMIT 1')
      .bind(username.toLowerCase().trim())
      .first();

    return result !== null;
  }

  async countTotalUsers(): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as total FROM users')
      .first<{ total: number }>();

    return result?.total ?? 0;
  }

  async findAllUsers(): Promise<User[]> {
    const { results } = await this.db
      .prepare(
        'SELECT id, username, auth_token_hash, salt, role, encrypted_totp_secret, is_totp_enabled, created_at, updated_at, last_active_at, storage_quota_bytes FROM users ORDER BY created_at ASC'
      )
      .all<D1UserRow>();

    return (results || []).map((row) => this.mapRowToUser(row));
  }

  async updateRole(id: string, role: UserRole): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .bind(role, Date.now(), id)
      .run();

    return (result.meta.changes ?? 0) > 0;
  }

  async updateTotpSecret(
    id: string,
    encryptedSecret: string | null,
    isEnabled: boolean
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        'UPDATE users SET encrypted_totp_secret = ?, is_totp_enabled = ?, updated_at = ? WHERE id = ?'
      )
      .bind(encryptedSecret, isEnabled ? 1 : 0, Date.now(), id)
      .run();

    return (result.meta.changes ?? 0) > 0;
  }

  async updateLastActive(id: string, timestamp = Date.now()): Promise<void> {
    try {
      await this.db
        .prepare('UPDATE users SET last_active_at = ? WHERE id = ?')
        .bind(timestamp, id)
        .run();
    } catch (err) {
      console.warn(`Failed to update last_active_at for user ${id}`, err);
    }
  }

  async updateStorageQuota(id: string, quotaBytes: number | null): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE users SET storage_quota_bytes = ?, updated_at = ? WHERE id = ?')
      .bind(quotaBytes, Date.now(), id)
      .run();

    return (result.meta.changes ?? 0) > 0;
  }

  async getUserStorageUsage(userId: string): Promise<number> {
    // 1. Sum up vault_nodes size
    const vaultNodesResult = await this.db
      .prepare('SELECT SUM(size) as total FROM vault_nodes WHERE user_id = ? AND is_directory = 0')
      .bind(userId)
      .first<{ total: number | null }>();

    // 2. Sum up media size
    const mediaResult = await this.db
      .prepare('SELECT SUM(size) as total FROM media WHERE user_id = ?')
      .bind(userId)
      .first<{ total: number | null }>();

    const nodesTotal = vaultNodesResult?.total || 0;
    const mediaTotal = mediaResult?.total || 0;

    return nodesTotal + mediaTotal;
  }

  async getSystemConfig(): Promise<SystemConfig> {
    const { results } = await this.db
      .prepare('SELECT key, value FROM system_config')
      .all<{ key: string; value: string }>();

    const configMap: Record<string, string> = {};
    for (const row of results || []) {
      configMap[row.key] = row.value;
    }

    return {
      defaultStorageQuotaBytes: Number(configMap['default_storage_quota_bytes']) || 10485760, // 10MB
      idleDestructionPeriodMs: Number(configMap['idle_destruction_period_ms']) || 2592000000, // 30 days
      maxAuditLogsPerUser: Number(configMap['max_audit_logs_per_user']) || 100,
    };
  }

  async updateSystemConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
    const now = Date.now();
    const statements: D1PreparedStatement[] = [];

    if (config.defaultStorageQuotaBytes !== undefined) {
      statements.push(
        this.db
          .prepare(
            'INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
          )
          .bind('default_storage_quota_bytes', String(config.defaultStorageQuotaBytes), now)
      );
    }

    if (config.idleDestructionPeriodMs !== undefined) {
      statements.push(
        this.db
          .prepare(
            'INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
          )
          .bind('idle_destruction_period_ms', String(config.idleDestructionPeriodMs), now)
      );
    }

    if (statements.length > 0) {
      await this.db.batch(statements);
    }

    return this.getSystemConfig();
  }

  async getUserAdminSummaries(): Promise<UserAdminSummary[]> {
    const users = await this.findAllUsers();
    const systemConfig = await this.getSystemConfig();

    const summaries: UserAdminSummary[] = [];
    for (const u of users) {
      const usedStorageBytes = await this.getUserStorageUsage(u.id);
      const isCustomQuota = u.storageQuotaBytes !== null && u.storageQuotaBytes !== undefined;
      const storageQuotaBytes = isCustomQuota
        ? (u.storageQuotaBytes as number)
        : systemConfig.defaultStorageQuotaBytes;

      summaries.push({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastActiveAt: u.lastActiveAt,
        usedStorageBytes,
        storageQuotaBytes,
        isCustomQuota,
      });
    }

    return summaries;
  }

  async deleteUserCascade(userId: string): Promise<boolean> {
    // Delete all child relations for user in D1
    const stmts: D1PreparedStatement[] = [
      this.db.prepare('DELETE FROM notes WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM media WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM vault_nodes WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM merkle_manifests WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM vault_manifest_history WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM token_families WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM audit_logs WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM vault_security WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM node_versions WHERE user_id = ?').bind(userId),
      this.db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
    ];

    await this.db.batch(stmts);
    return true;
  }

  async findIdleUsers(idleThresholdMs: number): Promise<User[]> {
    if (idleThresholdMs <= 0) return []; // 0 means idle destruction disabled

    const cutoffTimestamp = Date.now() - idleThresholdMs;
    const { results } = await this.db
      .prepare(
        'SELECT id, username, auth_token_hash, salt, role, encrypted_totp_secret, is_totp_enabled, created_at, updated_at, last_active_at, storage_quota_bytes FROM users WHERE role != ? AND last_active_at < ?'
      )
      .bind('admin', cutoffTimestamp)
      .all<D1UserRow>();

    return (results || []).map((row) => this.mapRowToUser(row));
  }
}
