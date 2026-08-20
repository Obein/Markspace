import { D1Database } from '@cloudflare/workers-types';
import {
  CreateVaultManifestDTO,
  VaultManifestEntity,
} from '../../interfaces/IVaultNodeRepository';
import { VaultSchemaManager } from './VaultSchemaManager';

export interface D1VaultManifestRow {
  id: string;
  node_id: string;
  user_id: string;
  parent_manifest_id: string | null;
  plain_size: number;
  cipher_size: number;
  commit_message: string | null;
  created_at: number;
}

/**
 * VaultMerkleRepository
 * Handles Content-Addressed Storage (CAS) chunks and Merkle DAG manifests in Cloudflare D1.
 */
export class VaultMerkleRepository {
  constructor(private readonly db: D1Database) {}

  public async checkMissingChunks(userId: string, chunkIds: string[]): Promise<string[]> {
    if (chunkIds.length === 0) return [];
    await VaultSchemaManager.ensureSchema(this.db);

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
    await VaultSchemaManager.ensureSchema(this.db);
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
    await VaultSchemaManager.ensureSchema(this.db);
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
    await VaultSchemaManager.ensureSchema(this.db);
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
    await VaultSchemaManager.ensureSchema(this.db);
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
    await VaultSchemaManager.ensureSchema(this.db);
    const now = Date.now();
    await this.db
      .prepare(`UPDATE vault_nodes SET size = ?, active_manifest_id = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
      .bind(plainSize, manifestId, now, nodeId, userId)
      .run();
  }

  public async commitBundle(params: {
    userId: string;
    nodeId: string;
    manifestDto: CreateVaultManifestDTO;
    incomingChunks: { id: string; size: number }[];
    allRequiredChunkIds: string[];
  }): Promise<{
    missingChunkIds: string[];
    success: boolean;
    manifest?: VaultManifestEntity;
  }> {
    await VaultSchemaManager.ensureSchema(this.db);
    const { userId, nodeId, manifestDto, incomingChunks, allRequiredChunkIds } = params;

    // 1. CAS Integrity Barrier: Check if any required chunk is missing from DB and not supplied in incomingChunks
    const incomingChunkIds = new Set(incomingChunks.map((c) => c.id));
    const chunksToCheck = allRequiredChunkIds.filter((id) => !incomingChunkIds.has(id));

    if (chunksToCheck.length > 0) {
      const missingFromDb = await this.checkMissingChunks(userId, chunksToCheck);
      if (missingFromDb.length > 0) {
        return {
          missingChunkIds: missingFromDb,
          success: false,
        };
      }
    }

    // 2. Prepare Atomic Batch Transaction in D1
    const now = Date.now();
    const statements: any[] = [];

    // Insert incoming delta chunks
    for (const chunk of incomingChunks) {
      statements.push(
        this.db
          .prepare(
            `INSERT OR IGNORE INTO vault_chunks (id, user_id, size, created_at)
             VALUES (?, ?, ?, ?)`
          )
          .bind(chunk.id, userId, chunk.size, now)
      );
    }

    // Insert manifest
    statements.push(
      this.db
        .prepare(
          `INSERT OR REPLACE INTO vault_manifests
           (id, node_id, user_id, parent_manifest_id, plain_size, cipher_size, commit_message, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          manifestDto.id,
          manifestDto.nodeId,
          manifestDto.userId,
          manifestDto.parentManifestId || null,
          manifestDto.plainSize,
          manifestDto.cipherSize,
          manifestDto.commitMessage || null,
          now
        )
    );

    // Update active manifest pointer and size on vault_nodes
    statements.push(
      this.db
        .prepare(
          `UPDATE vault_nodes 
           SET size = ?, active_manifest_id = ?, updated_at = ? 
           WHERE id = ? AND user_id = ?`
        )
        .bind(manifestDto.plainSize, manifestDto.id, now, nodeId, userId)
    );

    // Execute atomic batch
    await this.db.batch(statements);

    return {
      missingChunkIds: [],
      success: true,
      manifest: {
        id: manifestDto.id,
        nodeId: manifestDto.nodeId,
        userId: manifestDto.userId,
        parentManifestId: manifestDto.parentManifestId || null,
        plainSize: manifestDto.plainSize,
        cipherSize: manifestDto.cipherSize,
        commitMessage: manifestDto.commitMessage || null,
        createdAt: now,
      },
    };
  }
}
