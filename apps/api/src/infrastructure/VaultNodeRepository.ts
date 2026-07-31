import { D1Database } from '@cloudflare/workers-types';
import {
  CreateVaultNodeDTO,
  IVaultNodeRepository,
  UpdateVaultNodeDTO,
  VaultNodeEntity,
} from '../interfaces/IVaultNodeRepository';

interface D1VaultNodeRow {
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
  created_at: number;
  updated_at: number;
}

export class VaultNodeRepository implements IVaultNodeRepository {
  constructor(private readonly db: D1Database) {}

  public async createNode(dto: CreateVaultNodeDTO): Promise<VaultNodeEntity> {
    const now = Date.now();
    const isDirInt = dto.isDirectory ? 1 : 0;
    const size = dto.size || 0;
    const mimeType = dto.mimeType || (dto.isDirectory ? 'inode/directory' : 'text/markdown');
    const category = dto.category || (dto.isDirectory ? 'markdown' : 'markdown');
    const objectKey = dto.objectKey || null;

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
      category: category as any,
      encryptedDek: dto.encryptedDek,
      objectKey,
      createdAt: now,
      updatedAt: now,
    };
  }

  public async getNodeById(userId: string, nodeId: string): Promise<VaultNodeEntity | null> {
    const row = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE id = ? AND user_id = ?`)
      .bind(nodeId, userId)
      .first<D1VaultNodeRow>();

    return row ? this.mapRow(row) : null;
  }

  public async getNodeByPath(userId: string, path: string): Promise<VaultNodeEntity | null> {
    const row = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE path = ? AND user_id = ?`)
      .bind(path, userId)
      .first<D1VaultNodeRow>();

    return row ? this.mapRow(row) : null;
  }

  public async listNodesByUser(userId: string): Promise<VaultNodeEntity[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? ORDER BY is_directory DESC, name ASC`)
      .bind(userId)
      .all<D1VaultNodeRow>();

    return (results || []).map((row) => this.mapRow(row));
  }

  public async listChildren(userId: string, parentPath: string): Promise<VaultNodeEntity[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? AND parent_path = ? ORDER BY is_directory DESC, name ASC`)
      .bind(userId, parentPath)
      .all<D1VaultNodeRow>();

    return (results || []).map((row) => this.mapRow(row));
  }

  public async updateNode(userId: string, nodeId: string, dto: UpdateVaultNodeDTO): Promise<VaultNodeEntity | null> {
    const existing = await this.getNodeById(userId, nodeId);
    if (!existing) return null;

    const now = Date.now();
    const updatedName = dto.name !== undefined ? dto.name : existing.name;
    const updatedPath = dto.path !== undefined ? dto.path : existing.path;
    const updatedParentPath = dto.parentPath !== undefined ? dto.parentPath : existing.parentPath;
    const updatedSize = dto.size !== undefined ? dto.size : existing.size;
    const updatedDek = dto.encryptedDek !== undefined ? dto.encryptedDek : existing.encryptedDek;

    await this.db
      .prepare(
        `UPDATE vault_nodes 
         SET name = ?, path = ?, parent_path = ?, size = ?, encrypted_dek = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(updatedName, updatedPath, updatedParentPath, updatedSize, updatedDek, now, nodeId, userId)
      .run();

    return {
      ...existing,
      name: updatedName,
      path: updatedPath,
      parentPath: updatedParentPath,
      size: updatedSize,
      encryptedDek: updatedDek,
      updatedAt: now,
    };
  }

  public async deleteNode(userId: string, nodeId: string): Promise<boolean> {
    const result = await this.db
      .prepare(`DELETE FROM vault_nodes WHERE id = ? AND user_id = ?`)
      .bind(nodeId, userId)
      .run();

    return (result.meta.changes || 0) > 0;
  }

  public async deleteDirectoryTree(userId: string, targetPath: string): Promise<VaultNodeEntity[]> {
    // Select target node and all descendant nodes under targetPath
    const { results } = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? AND (path = ? OR path LIKE ?)` )
      .bind(userId, targetPath, `${targetPath}/%`)
      .all<D1VaultNodeRow>();

    const nodesToDelete = (results || []).map((row) => this.mapRow(row));

    if (nodesToDelete.length > 0) {
      await this.db
        .prepare(`DELETE FROM vault_nodes WHERE user_id = ? AND (path = ? OR path LIKE ?)` )
        .bind(userId, targetPath, `${targetPath}/%`)
        .run();
    }

    return nodesToDelete;
  }

  private mapRow(row: D1VaultNodeRow): VaultNodeEntity {
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
