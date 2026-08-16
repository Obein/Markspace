import { D1Database } from '@cloudflare/workers-types';
import {
  CreateVaultNodeDTO,
  CreateVaultNodeVersionDTO,
  IVaultNodeRepository,
  UpdateVaultNodeDTO,
  VaultNodeEntity,
  VaultNodeVersionEntity,
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

interface D1VaultNodeVersionRow {
  id: string;
  node_id: string;
  user_id: string;
  timestamp: number;
  commit_hash: string;
  size: number;
  encrypted_dek: string;
  object_key: string;
  commit_message: string;
  created_at: number;
}

export class VaultNodeRepository implements IVaultNodeRepository {
  private versionsTableInit: Promise<void> | null = null;

  constructor(private readonly db: D1Database) {}

  private async ensureVersionsTable(): Promise<void> {
    if (!this.versionsTableInit) {
      this.versionsTableInit = (async () => {
        await this.db
          .prepare(
            `CREATE TABLE IF NOT EXISTS vault_node_versions (
              id TEXT PRIMARY KEY,
              node_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              commit_hash TEXT NOT NULL,
              size INTEGER NOT NULL,
              encrypted_dek TEXT NOT NULL,
              object_key TEXT NOT NULL,
              commit_message TEXT,
              created_at INTEGER NOT NULL
            )`
          )
          .run();

        await this.db
          .prepare(
            `CREATE INDEX IF NOT EXISTS idx_versions_node_ts ON vault_node_versions(user_id, node_id, timestamp DESC)`
          )
          .run();
      })();
    }
    return this.versionsTableInit;
  }

  public async createNode(dto: CreateVaultNodeDTO): Promise<VaultNodeEntity> {
    const now = Date.now();
    const isDirInt = dto.isDirectory ? 1 : 0;
    const size = dto.size || 0;
    const mimeType = dto.mimeType || (dto.isDirectory ? 'inode/directory' : 'text/markdown');
    const category = dto.category || 'markdown';
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
      category,
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
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? AND path = ?`)
      .bind(userId, path)
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

  public async updateNode(
    userId: string,
    nodeId: string,
    dto: UpdateVaultNodeDTO
  ): Promise<VaultNodeEntity | null> {
    const existing = await this.getNodeById(userId, nodeId);
    if (!existing) return null;

    const name = dto.name !== undefined ? dto.name : existing.name;
    const path = dto.path !== undefined ? dto.path : existing.path;
    const parentPath = dto.parentPath !== undefined ? dto.parentPath : existing.parentPath;
    const size = dto.size !== undefined ? dto.size : existing.size;
    const encryptedDek = dto.encryptedDek !== undefined ? dto.encryptedDek : existing.encryptedDek;
    const now = Date.now();

    await this.db
      .prepare(
        `UPDATE vault_nodes 
         SET name = ?, path = ?, parent_path = ?, size = ?, encrypted_dek = ?, updated_at = ? 
         WHERE id = ? AND user_id = ?`
      )
      .bind(name, path, parentPath, size, encryptedDek, now, nodeId, userId)
      .run();

    return {
      ...existing,
      name,
      path,
      parentPath,
      size,
      encryptedDek,
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
    const { results } = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? AND (path = ? OR path LIKE ?)`)
      .bind(userId, targetPath, `${targetPath}/%`)
      .all<D1VaultNodeRow>();

    const nodesToDelete = (results || []).map((row) => this.mapRow(row));

    if (nodesToDelete.length > 0) {
      await this.db
        .prepare(`DELETE FROM vault_nodes WHERE user_id = ? AND (path = ? OR path LIKE ?)`)
        .bind(userId, targetPath, `${targetPath}/%`)
        .run();
    }

    return nodesToDelete;
  }

  // Version Control Database Methods
  public async createVersion(dto: CreateVaultNodeVersionDTO): Promise<VaultNodeVersionEntity> {
    await this.ensureVersionsTable();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO vault_node_versions 
         (id, node_id, user_id, timestamp, commit_hash, size, encrypted_dek, object_key, commit_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        dto.id,
        dto.nodeId,
        dto.userId,
        dto.timestamp,
        dto.commitHash,
        dto.size,
        dto.encryptedDek,
        dto.objectKey,
        dto.commitMessage || '',
        now
      )
      .run();

    return {
      id: dto.id,
      nodeId: dto.nodeId,
      userId: dto.userId,
      timestamp: dto.timestamp,
      commitHash: dto.commitHash,
      size: dto.size,
      encryptedDek: dto.encryptedDek,
      objectKey: dto.objectKey,
      commitMessage: dto.commitMessage || '',
      createdAt: now,
    };
  }

  public async listVersionsByNode(userId: string, nodeId: string): Promise<VaultNodeVersionEntity[]> {
    await this.ensureVersionsTable();

    const { results } = await this.db
      .prepare(
        `SELECT * FROM vault_node_versions 
         WHERE user_id = ? AND node_id = ? 
         ORDER BY timestamp DESC`
      )
      .bind(userId, nodeId)
      .all<D1VaultNodeVersionRow>();

    return (results || []).map((row) => ({
      id: row.id,
      nodeId: row.node_id,
      userId: row.user_id,
      timestamp: row.timestamp,
      commitHash: row.commit_hash,
      size: row.size,
      encryptedDek: row.encrypted_dek,
      objectKey: row.object_key,
      commitMessage: row.commit_message || '',
      createdAt: row.created_at,
    }));
  }

  public async getVersionByTimestamp(
    userId: string,
    nodeId: string,
    timestamp: number
  ): Promise<VaultNodeVersionEntity | null> {
    await this.ensureVersionsTable();

    const row = await this.db
      .prepare(
        `SELECT * FROM vault_node_versions 
         WHERE user_id = ? AND node_id = ? AND timestamp = ?`
      )
      .bind(userId, nodeId, timestamp)
      .first<D1VaultNodeVersionRow>();

    if (!row) return null;

    return {
      id: row.id,
      nodeId: row.node_id,
      userId: row.user_id,
      timestamp: row.timestamp,
      commitHash: row.commit_hash,
      size: row.size,
      encryptedDek: row.encrypted_dek,
      objectKey: row.object_key,
      commitMessage: row.commit_message || '',
      createdAt: row.created_at,
    };
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
