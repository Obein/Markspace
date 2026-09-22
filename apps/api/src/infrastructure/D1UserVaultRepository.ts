export interface UserVaultEntity {
  id: string;
  userId: string;
  name: string;
  salt: string;
  wrappedVmk: string;
  encryptedStorageConfig: string | null;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export class D1UserVaultRepository {
  constructor(private readonly db: D1Database) {}

  async getVaultsByUserId(userId: string): Promise<UserVaultEntity[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, user_id, name, salt, wrapped_vmk, encrypted_storage_config, is_default, created_at, updated_at
         FROM user_vaults WHERE user_id = ? ORDER BY is_default DESC, created_at ASC`
      )
      .bind(userId)
      .all<{
        id: string;
        user_id: string;
        name: string;
        salt: string;
        wrapped_vmk: string;
        encrypted_storage_config: string | null;
        is_default: number;
        created_at: number;
        updated_at: number;
      }>();

    return (results || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      salt: r.salt,
      wrappedVmk: r.wrapped_vmk,
      encryptedStorageConfig: r.encrypted_storage_config,
      isDefault: Boolean(r.is_default),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async getVaultById(userId: string, vaultId: string): Promise<UserVaultEntity | null> {
    const r = await this.db
      .prepare(
        `SELECT id, user_id, name, salt, wrapped_vmk, encrypted_storage_config, is_default, created_at, updated_at
         FROM user_vaults WHERE id = ? AND user_id = ?`
      )
      .bind(vaultId, userId)
      .first<{
        id: string;
        user_id: string;
        name: string;
        salt: string;
        wrapped_vmk: string;
        encrypted_storage_config: string | null;
        is_default: number;
        created_at: number;
        updated_at: number;
      }>();

    if (!r) return null;

    return {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      salt: r.salt,
      wrappedVmk: r.wrapped_vmk,
      encryptedStorageConfig: r.encrypted_storage_config,
      isDefault: Boolean(r.is_default),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async createVault(vault: {
    id: string;
    userId: string;
    name: string;
    salt: string;
    wrappedVmk: string;
    encryptedStorageConfig?: string | null;
    isDefault?: boolean;
  }): Promise<UserVaultEntity> {
    const now = Date.now();
    await this.db
      .prepare(
        `INSERT INTO user_vaults (id, user_id, name, salt, wrapped_vmk, encrypted_storage_config, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        vault.id,
        vault.userId,
        vault.name,
        vault.salt,
        vault.wrappedVmk,
        vault.encryptedStorageConfig || null,
        vault.isDefault ? 1 : 0,
        now,
        now
      )
      .run();

    return {
      id: vault.id,
      userId: vault.userId,
      name: vault.name,
      salt: vault.salt,
      wrappedVmk: vault.wrappedVmk,
      encryptedStorageConfig: vault.encryptedStorageConfig || null,
      isDefault: Boolean(vault.isDefault),
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateVault(
    userId: string,
    vaultId: string,
    updates: {
      name?: string;
      wrappedVmk?: string;
      encryptedStorageConfig?: string | null;
    }
  ): Promise<void> {
    const existing = await this.getVaultById(userId, vaultId);
    if (!existing) {
      throw new Error('VAULT_NOT_FOUND: Vault does not exist or permission denied');
    }

    const now = Date.now();
    const newName = updates.name !== undefined ? updates.name : existing.name;
    const newWrappedVmk = updates.wrappedVmk !== undefined ? updates.wrappedVmk : existing.wrappedVmk;
    const newStorageConfig =
      updates.encryptedStorageConfig !== undefined ? updates.encryptedStorageConfig : existing.encryptedStorageConfig;

    await this.db
      .prepare(
        `UPDATE user_vaults SET name = ?, wrapped_vmk = ?, encrypted_storage_config = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(newName, newWrappedVmk, newStorageConfig, now, vaultId, userId)
      .run();
  }

  async deleteVault(userId: string, vaultId: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM user_vaults WHERE id = ? AND user_id = ?`)
      .bind(vaultId, userId)
      .run();
  }
}
