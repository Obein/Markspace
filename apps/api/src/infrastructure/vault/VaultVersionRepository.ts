import { D1Database } from '@cloudflare/workers-types';
import {
  CreateVaultNodeVersionDTO,
  VaultNodeVersionEntity,
} from '../../interfaces/IVaultNodeRepository';
import { VaultSchemaManager } from './VaultSchemaManager';

export interface D1VaultNodeVersionRow {
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

/**
 * VaultVersionRepository
 * Handles snapshot-based version control operations in Cloudflare D1.
 */
export class VaultVersionRepository {
  constructor(private readonly db: D1Database) {}

  public async createVersion(dto: CreateVaultNodeVersionDTO): Promise<VaultNodeVersionEntity> {
    await VaultSchemaManager.ensureSchema(this.db);
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
    await VaultSchemaManager.ensureSchema(this.db);
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
    await VaultSchemaManager.ensureSchema(this.db);
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
}
