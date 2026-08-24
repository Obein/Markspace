export interface UserStorageConfigRecord {
  id: string;
  userId: string;
  vaultId: string;
  provider: string;
  encryptedConfig: string;
  iv: string;
  tag?: string;
  createdAt: number;
  updatedAt: number;
}

interface D1StorageConfigRow {
  id: string;
  user_id: string;
  vault_id: string;
  provider: string;
  encrypted_config: string;
  iv: string;
  tag: string | null;
  created_at: number;
  updated_at: number;
}

export class D1UserStorageConfigRepository {
  constructor(private readonly db: D1Database) {}

  private mapRow(row: D1StorageConfigRow): UserStorageConfigRecord {
    return {
      id: row.id,
      userId: row.user_id,
      vaultId: row.vault_id,
      provider: row.provider,
      encryptedConfig: row.encrypted_config,
      iv: row.iv,
      tag: row.tag || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getByVaultId(userId: string, vaultId: string): Promise<UserStorageConfigRecord | null> {
    const row = await this.db
      .prepare(
        'SELECT id, user_id, vault_id, provider, encrypted_config, iv, tag, created_at, updated_at FROM user_storage_configs WHERE user_id = ? AND vault_id = ?'
      )
      .bind(userId, vaultId)
      .first<D1StorageConfigRow>();

    if (!row) return null;
    return this.mapRow(row);
  }

  async upsert(record: UserStorageConfigRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO user_storage_configs (id, user_id, vault_id, provider, encrypted_config, iv, tag, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, vault_id) DO UPDATE SET
           provider = excluded.provider,
           encrypted_config = excluded.encrypted_config,
           iv = excluded.iv,
           tag = excluded.tag,
           updated_at = excluded.updated_at`
      )
      .bind(
        record.id,
        record.userId,
        record.vaultId,
        record.provider,
        record.encryptedConfig,
        record.iv,
        record.tag || null,
        record.createdAt,
        record.updatedAt
      )
      .run();
  }

  async delete(userId: string, vaultId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM user_storage_configs WHERE user_id = ? AND vault_id = ?')
      .bind(userId, vaultId)
      .run();
  }
}
