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
import { VaultNodeCrudRepository } from './vault/VaultNodeCrudRepository';
import { VaultVersionRepository } from './vault/VaultVersionRepository';
import { VaultMerkleRepository } from './vault/VaultMerkleRepository';

/**
 * VaultNodeRepository
 * Unified Facade for Vault Persistence in Cloudflare D1.
 *
 * Adheres to Separation of Concerns (SoC) by delegating to specialized sub-repositories:
 * - VaultNodeCrudRepository: Core file & directory tree operations.
 * - VaultVersionRepository: Snapshot-based version history.
 * - VaultMerkleRepository: Content-Addressed Storage (CAS) chunks & Merkle DAG manifests.
 */
export class VaultNodeRepository implements IVaultNodeRepository {
  private readonly crudRepo: VaultNodeCrudRepository;
  private readonly versionRepo: VaultVersionRepository;
  private readonly merkleRepo: VaultMerkleRepository;

  constructor(private readonly db: D1Database) {
    this.crudRepo = new VaultNodeCrudRepository(this.db);
    this.versionRepo = new VaultVersionRepository(this.db);
    this.merkleRepo = new VaultMerkleRepository(this.db);
  }

  // ── Hierarchical Node CRUD ──────────────────────────────────────────────────

  public async createNode(dto: CreateVaultNodeDTO): Promise<VaultNodeEntity> {
    return this.crudRepo.createNode(dto);
  }

  public async getNodeById(userId: string, nodeId: string): Promise<VaultNodeEntity | null> {
    return this.crudRepo.getNodeById(userId, nodeId);
  }

  public async getNodeByPath(userId: string, path: string): Promise<VaultNodeEntity | null> {
    return this.crudRepo.getNodeByPath(userId, path);
  }

  public async listNodesByUser(userId: string): Promise<VaultNodeEntity[]> {
    return this.crudRepo.listNodesByUser(userId);
  }

  public async listChildren(userId: string, parentPath: string): Promise<VaultNodeEntity[]> {
    return this.crudRepo.listChildren(userId, parentPath);
  }

  public async updateNode(
    userId: string,
    nodeId: string,
    dto: UpdateVaultNodeDTO
  ): Promise<VaultNodeEntity | null> {
    return this.crudRepo.updateNode(userId, nodeId, dto);
  }

  public async deleteNode(userId: string, nodeId: string): Promise<boolean> {
    return this.crudRepo.deleteNode(userId, nodeId);
  }

  public async deleteDirectoryTree(userId: string, targetPath: string): Promise<VaultNodeEntity[]> {
    return this.crudRepo.deleteDirectoryTree(userId, targetPath);
  }

  // ── Snapshot-based Version Control ──────────────────────────────────────────

  public async createVersion(dto: CreateVaultNodeVersionDTO): Promise<VaultNodeVersionEntity> {
    return this.versionRepo.createVersion(dto);
  }

  public async listVersionsByNode(userId: string, nodeId: string): Promise<VaultNodeVersionEntity[]> {
    return this.versionRepo.listVersionsByNode(userId, nodeId);
  }

  public async getVersionByTimestamp(
    userId: string,
    nodeId: string,
    timestamp: number
  ): Promise<VaultNodeVersionEntity | null> {
    return this.versionRepo.getVersionByTimestamp(userId, nodeId, timestamp);
  }

  // ── Merkle DAG CAS & Manifests ──────────────────────────────────────────────

  public async checkMissingChunks(userId: string, chunkIds: string[]): Promise<string[]> {
    return this.merkleRepo.checkMissingChunks(userId, chunkIds);
  }

  public async recordChunk(userId: string, chunkId: string, size: number): Promise<void> {
    return this.merkleRepo.recordChunk(userId, chunkId, size);
  }

  public async saveManifest(dto: CreateVaultManifestDTO): Promise<VaultManifestEntity> {
    return this.merkleRepo.saveManifest(dto);
  }

  public async listManifestsByNode(userId: string, nodeId: string): Promise<VaultManifestEntity[]> {
    return this.merkleRepo.listManifestsByNode(userId, nodeId);
  }

  public async getManifestById(userId: string, manifestId: string): Promise<VaultManifestEntity | null> {
    return this.merkleRepo.getManifestById(userId, manifestId);
  }

  public async updateNodeActiveManifest(
    userId: string,
    nodeId: string,
    manifestId: string,
    plainSize: number
  ): Promise<void> {
    return this.merkleRepo.updateNodeActiveManifest(userId, nodeId, manifestId, plainSize);
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
    return this.merkleRepo.commitBundle(params);
  }
}
