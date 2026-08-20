import { D1Database } from '@cloudflare/workers-types';
import {
  CreateVaultNodeDTO,
  UpdateVaultNodeDTO,
  VaultNodeEntity,
} from '../../interfaces/IVaultNodeRepository';
import { VaultSchemaManager } from './VaultSchemaManager';

export interface D1VaultNodeRow {
  id: string;
  user_id: string;
  path: string;
  parent_path: string;
  name: string;
  is_directory: number;
  size: number;
  mime_type: string;
  category: string;
  encrypted_dek: string;
  object_key: string | null;
  active_manifest_id?: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * VaultNodeCrudRepository
 * Handles core hierarchical node CRUD operations (files and directories) in Cloudflare D1.
 */
export class VaultNodeCrudRepository {
  constructor(private readonly db: D1Database) {}

  public async createNode(dto: CreateVaultNodeDTO): Promise<VaultNodeEntity> {
    await VaultSchemaManager.ensureSchema(this.db);
    const now = Date.now();
    const isDirInt = dto.isDirectory ? 1 : 0;
    const size = dto.size || 0;
    const mimeType = dto.mimeType || (dto.isDirectory ? 'inode/directory' : 'text/markdown');
    const category = dto.category || 'markdown';
    const objectKey = dto.objectKey || null;
    const activeManifestId = dto.activeManifestId || null;

    await this.db
      .prepare(
        `INSERT INTO vault_nodes 
         (id, user_id, path, parent_path, name, is_directory, size, mime_type, category, encrypted_dek, object_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        dto.id,
        dto.userId,
        dto.path,
        dto.parentPath,
        dto.name,
        isDirInt,
        size,
        mimeType,
        category,
        dto.encryptedDek,
        objectKey,
        now,
        now
      )
      .run();

    return {
      id: dto.id,
      userId: dto.userId,
      path: dto.path,
      parentPath: dto.parentPath,
      name: dto.name,
      isDirectory: dto.isDirectory,
      size,
      mimeType,
      category,
      encryptedDek: dto.encryptedDek,
      objectKey,
      activeManifestId,
      createdAt: now,
      updatedAt: now,
    };
  }

  public async getNodeById(userId: string, nodeId: string): Promise<VaultNodeEntity | null> {
    await VaultSchemaManager.ensureSchema(this.db);
    const row = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE id = ? AND user_id = ?`)
      .bind(nodeId, userId)
      .first<D1VaultNodeRow>();

    return row ? this.mapRow(row) : null;
  }

  public async getNodeByPath(userId: string, path: string): Promise<VaultNodeEntity | null> {
    await VaultSchemaManager.ensureSchema(this.db);
    const row = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? AND path = ?`)
      .bind(userId, path)
      .first<D1VaultNodeRow>();

    return row ? this.mapRow(row) : null;
  }

  public async listNodesByUser(userId: string): Promise<VaultNodeEntity[]> {
    await VaultSchemaManager.ensureSchema(this.db);
    const { results } = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? ORDER BY is_directory DESC, name ASC`)
      .bind(userId)
      .all<D1VaultNodeRow>();

    return (results || []).map((row) => this.mapRow(row));
  }

  public async listChildren(userId: string, parentPath: string): Promise<VaultNodeEntity[]> {
    await VaultSchemaManager.ensureSchema(this.db);
    const { results } = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? AND parent_path = ? ORDER BY is_directory DESC, name ASC`)
      .bind(userId, parentPath)
      .all<D1VaultNodeRow>();

    return (results || []).map((row) => this.mapRow(row));
  }

  public async updateNode(
    userId: string,
    nodeId: string,
    dto: UpdateVaultNodeDTO
  ): Promise<VaultNodeEntity | null> {
    await VaultSchemaManager.ensureSchema(this.db);
    const node = await this.getNodeById(userId, nodeId);
    if (!node) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (dto.name !== undefined) {
      updates.push('name = ?');
      values.push(dto.name);
    }
    if (dto.path !== undefined) {
      updates.push('path = ?');
      values.push(dto.path);
    }
    if (dto.parentPath !== undefined) {
      updates.push('parent_path = ?');
      values.push(dto.parentPath);
    }
    if (dto.size !== undefined) {
      updates.push('size = ?');
      values.push(dto.size);
    }
    if (dto.encryptedDek !== undefined) {
      updates.push('encrypted_dek = ?');
      values.push(dto.encryptedDek);
    }

    const now = Date.now();
    updates.push('updated_at = ?');
    values.push(now);

    values.push(nodeId);
    values.push(userId);

    await this.db
      .prepare(`UPDATE vault_nodes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();

    return this.getNodeById(userId, nodeId);
  }

  public async deleteNode(userId: string, nodeId: string): Promise<boolean> {
    await VaultSchemaManager.ensureSchema(this.db);
    const result = await this.db
      .prepare(`DELETE FROM vault_nodes WHERE id = ? AND user_id = ?`)
      .bind(nodeId, userId)
      .run();

    return Boolean(result && result.meta && result.meta.changes > 0);
  }

  public async deleteDirectoryTree(userId: string, targetPath: string): Promise<VaultNodeEntity[]> {
    await VaultSchemaManager.ensureSchema(this.db);
    const prefix = targetPath.endsWith('/') ? targetPath : `${targetPath}/`;
    const { results } = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? AND (path = ? OR path LIKE ?)`)
      .bind(userId, targetPath, `${prefix}%`)
      .all<D1VaultNodeRow>();

    const nodes = (results || []).map((row) => this.mapRow(row));

    await this.db
      .prepare(`DELETE FROM vault_nodes WHERE user_id = ? AND (path = ? OR path LIKE ?)`)
      .bind(userId, targetPath, `${prefix}%`)
      .run();

    return nodes;
  }

  public mapRow(row: D1VaultNodeRow): VaultNodeEntity {
    return {
      id: row.id,
      userId: row.user_id,
      path: row.path,
      parentPath: row.parent_path,
      name: row.name,
      isDirectory: row.is_directory === 1,
      size: row.size,
      mimeType: row.mime_type,
      category: row.category as any,
      encryptedDek: row.encrypted_dek,
      objectKey: row.object_key,
      activeManifestId: row.active_manifest_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
