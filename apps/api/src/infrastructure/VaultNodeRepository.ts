import { D1Database } from '@cloudflare/workers-types';
import {
  CreateVaultManifestDTO,
  CreateVaultNodeDTO,
  CreateVaultNodeVersionDTO,
  IVaultNodeRepository,
  UpdateVaultNodeDTO,
  VaultManifestEntity,
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
  active_manifest_id?: string | null;
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

interface D1VaultManifestRow {
  id: string;
  node_id: string;
  user_id: string;
  parent_manifest_id: string | null;
  plain_size: number;
  cipher_size: number;
  commit_message: string | null;
  created_at: number;
}

export class VaultNodeRepository implements IVaultNodeRepository {
  private schemaInitPromise: Promise<void> | null = null;

  constructor(private readonly db: D1Database) {}

  private async ensureSchema(): Promise<void> {
    if (!this.schemaInitPromise) {
      this.schemaInitPromise = (async () => {
        // 1. Ensure Legacy Versions Table
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

        // 2. Ensure CAS Chunks Table
        await this.db
          .prepare(
            `CREATE TABLE IF NOT EXISTS vault_chunks (
              id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              size INTEGER NOT NULL,
              created_at INTEGER NOT NULL,
              PRIMARY KEY (user_id, id)
            )`
          )
          .run();

        await this.db
          .prepare(
            `CREATE INDEX IF NOT EXISTS idx_vault_chunks_user ON vault_chunks(user_id)`
          )
          .run();

        // 3. Ensure Merkle Manifests Table
        await this.db
          .prepare(
            `CREATE TABLE IF NOT EXISTS vault_manifests (
              id TEXT NOT NULL,
              node_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              parent_manifest_id TEXT,
              plain_size INTEGER NOT NULL,
              cipher_size INTEGER NOT NULL,
              commit_message TEXT,
              created_at INTEGER NOT NULL,
              PRIMARY KEY (user_id, id)
            )`
          )
          .run();

        await this.db
          .prepare(
            `CREATE INDEX IF NOT EXISTS idx_vault_manifests_node_ts ON vault_manifests(user_id, node_id, created_at DESC)`
          )
          .run();

        // 4. Ensure active_manifest_id column on vault_nodes
        try {
          await this.db
            .prepare(`ALTER TABLE vault_nodes ADD COLUMN active_manifest_id TEXT`)
            .run();
        } catch (colErr: any) {
          // Column already exists in SQLite/D1 - safe to ignore
        }
      })();
    }
    return this.schemaInitPromise;
  }

  public async createNode(dto: CreateVaultNodeDTO): Promise<VaultNodeEntity> {
    await this.ensureSchema();
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
    await this.ensureSchema();
    const row = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE id = ? AND user_id = ?`)
      .bind(nodeId, userId)
      .first<D1VaultNodeRow>();

    return row ? this.mapRow(row) : null;
  }

  public async getNodeByPath(userId: string, path: string): Promise<VaultNodeEntity | null> {
    await this.ensureSchema();
    const row = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? AND path = ?`)
      .bind(userId, path)
      .first<D1VaultNodeRow>();

    return row ? this.mapRow(row) : null;
  }

  public async listNodesByUser(userId: string): Promise<VaultNodeEntity[]> {
    await this.ensureSchema();
    const { results } = await this.db
      .prepare(`SELECT * FROM vault_nodes WHERE user_id = ? ORDER BY is_directory DESC, name ASC`)
      .bind(userId)
      .all<D1VaultNodeRow>();

    return (results || []).map((row) => this.mapRow(row));
  }

  public async listChildren(userId: string, parentPath: string): Promise<VaultNodeEntity[]> {
    await this.ensureSchema();
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
    await this.ensureSchema();
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
    await this.ensureSchema();
    const result = await this.db
      .prepare(`DELETE FROM vault_nodes WHERE id = ? AND user_id = ?`)
      .bind(nodeId, userId)
      .run();

    return Boolean(result && result.meta && result.meta.changes > 0);
  }

  public async deleteDirectoryTree(userId: string, targetPath: string): Promise<VaultNodeEntity[]> {
    await this.ensureSchema();
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

  public async createVersion(dto: CreateVaultNodeVersionDTO): Promise<VaultNodeVersionEntity> {
    await this.ensureSchema();
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
    await this.ensureSchema();
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
    await this.ensureSchema();
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

  // Merkle DAG CAS & Manifest Methods

  public async checkMissingChunks(userId: string, chunkIds: string[]): Promise<string[]> {
    if (chunkIds.length === 0) return [];
    await this.ensureSchema();

    // Query in batches of 50 to respect SQLite parameter limits
    const existingSet = new Set<string>();
    const batchSize = 50;

    for (let i = 0; i < chunkIds.length; i += batchSize) {
      const slice = chunkIds.slice(i, i + batchSize);
      const placeholders = slice.map(() => '?').join(',');
      const { results } = await this.db
        .prepare(`SELECT id FROM vault_chunks WHERE user_id = ? AND id IN (${placeholders})`)
        .bind(userId, ...slice)
        .all<{ id: string }>();

      if (results) {
        for (const row of results) {
          existingSet.add(row.id);
        }
      }
    }

    return chunkIds.filter((id) => !existingSet.has(id));
  }

  public async recordChunk(userId: string, chunkId: string, size: number): Promise<void> {
    await this.ensureSchema();
    const now = Date.now();
    await this.db
      .prepare(
        `INSERT OR IGNORE INTO vault_chunks (id, user_id, size, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(chunkId, userId, size, now)
      .run();
  }

  public async saveManifest(dto: CreateVaultManifestDTO): Promise<VaultManifestEntity> {
    await this.ensureSchema();
    const now = Date.now();
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO vault_manifests
         (id, node_id, user_id, parent_manifest_id, plain_size, cipher_size, commit_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        dto.id,
        dto.nodeId,
        dto.userId,
        dto.parentManifestId || null,
        dto.plainSize,
        dto.cipherSize,
        dto.commitMessage || null,
        now
      )
      .run();

    return {
      id: dto.id,
      nodeId: dto.nodeId,
      userId: dto.userId,
      parentManifestId: dto.parentManifestId || null,
      plainSize: dto.plainSize,
      cipherSize: dto.cipherSize,
      commitMessage: dto.commitMessage || null,
      createdAt: now,
    };
  }

  public async listManifestsByNode(userId: string, nodeId: string): Promise<VaultManifestEntity[]> {
    await this.ensureSchema();
    const { results } = await this.db
      .prepare(
        `SELECT * FROM vault_manifests 
         WHERE user_id = ? AND node_id = ? 
         ORDER BY created_at DESC`
      )
      .bind(userId, nodeId)
      .all<D1VaultManifestRow>();

    return (results || []).map((row) => ({
      id: row.id,
      nodeId: row.node_id,
      userId: row.user_id,
      parentManifestId: row.parent_manifest_id,
      plainSize: row.plain_size,
      cipherSize: row.cipher_size,
      commitMessage: row.commit_message,
      createdAt: row.created_at,
    }));
  }

  public async getManifestById(userId: string, manifestId: string): Promise<VaultManifestEntity | null> {
    await this.ensureSchema();
    const row = await this.db
      .prepare(`SELECT * FROM vault_manifests WHERE user_id = ? AND id = ?`)
      .bind(userId, manifestId)
      .first<D1VaultManifestRow>();

    if (!row) return null;

    return {
      id: row.id,
      nodeId: row.node_id,
      userId: row.user_id,
      parentManifestId: row.parent_manifest_id,
      plainSize: row.plain_size,
      cipherSize: row.cipher_size,
      commitMessage: row.commit_message,
      createdAt: row.created_at,
    };
  }

  public async updateNodeActiveManifest(
    userId: string,
    nodeId: string,
    manifestId: string,
    plainSize: number
  ): Promise<void> {
    await this.ensureSchema();
    const now = Date.now();
    await this.db
      .prepare(`UPDATE vault_nodes SET size = ?, active_manifest_id = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
      .bind(plainSize, manifestId, now, nodeId, userId)
      .run();
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
      activeManifestId: row.active_manifest_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
