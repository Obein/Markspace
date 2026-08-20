import { IObjectStorageService } from '../interfaces/IObjectStorageService';
import { IUserRepository } from '../interfaces/IUserRepository';
import {
  IVaultNodeRepository,
  VaultManifestEntity,
  VaultNodeEntity,
  VaultNodeVersionEntity,
} from '../interfaces/IVaultNodeRepository';
import { CreateNodeRequest, VaultNodeService } from './vault/VaultNodeService';
import { VaultVersionService } from './vault/VaultVersionService';
import { VaultMerkleService } from './vault/VaultMerkleService';

export type { CreateNodeRequest };

/**
 * VaultService
 * High-level orchestration facade for Vault operations.
 *
 * Decomposes domain logic across:
 * - VaultNodeService: Core tree node CRUD & R2 object storage.
 * - VaultVersionService: Snapshot version management.
 * - VaultMerkleService: Merkle DAG CAS chunks & manifests.
 */
export class VaultService {
  private readonly nodeService: VaultNodeService;
  private readonly versionService: VaultVersionService;
  private readonly merkleService: VaultMerkleService;

  constructor(
    private readonly nodeRepo: IVaultNodeRepository,
    private readonly objectStorage: IObjectStorageService,
    private readonly userRepository?: IUserRepository
  ) {
    this.nodeService = new VaultNodeService(this.nodeRepo, this.objectStorage, this.userRepository);
    this.versionService = new VaultVersionService(this.nodeRepo, this.objectStorage, this.nodeService);
    this.merkleService = new VaultMerkleService(this.nodeRepo, this.objectStorage, this.nodeService);
  }

  // ── Node CRUD ───────────────────────────────────────────────────────────────

  public async getTree(userId: string): Promise<VaultNodeEntity[]> {
    return this.nodeService.getTree(userId);
  }

  public async createNode(userId: string, req: CreateNodeRequest): Promise<VaultNodeEntity> {
    return this.nodeService.createNode(userId, req);
  }

  public async getNode(userId: string, nodeId: string): Promise<VaultNodeEntity> {
    return this.nodeService.getNode(userId, nodeId);
  }

  public async getContent(userId: string, nodeId: string): Promise<ArrayBuffer> {
    return this.nodeService.getContent(userId, nodeId);
  }

  public async updateNodeContent(
    userId: string,
    nodeId: string,
    body: ArrayBuffer | Uint8Array | string,
    mimeType: string,
    encryptedDek?: string
  ): Promise<VaultNodeEntity> {
    return this.nodeService.updateNodeContent(userId, nodeId, body, mimeType, encryptedDek);
  }

  public async deleteNode(userId: string, nodeId: string): Promise<void> {
    return this.nodeService.deleteNode(userId, nodeId);
  }

  public async moveNode(userId: string, nodeId: string, newPath: string): Promise<VaultNodeEntity> {
    return this.nodeService.moveNode(userId, nodeId, newPath);
  }

  public async deleteDirectoryTree(userId: string, targetPath: string): Promise<VaultNodeEntity[]> {
    return this.nodeService.deleteDirectoryTree(userId, targetPath);
  }

  // ── Snapshot Versioning ─────────────────────────────────────────────────────

  public async createVersion(
    userId: string,
    nodeId: string,
    commitMessage: string,
    commitHash: string,
    contentBlob: ArrayBuffer | Uint8Array | string,
    encryptedDek: string
  ): Promise<VaultNodeVersionEntity> {
    return this.versionService.createVersion(
      userId,
      nodeId,
      commitMessage,
      commitHash,
      contentBlob,
      encryptedDek
    );
  }

  public async listVersions(userId: string, nodeId: string): Promise<VaultNodeVersionEntity[]> {
    return this.versionService.listVersions(userId, nodeId);
  }

  public async getVersionContent(
    userId: string,
    nodeId: string,
    timestamp: number
  ): Promise<{ version: VaultNodeVersionEntity; body: ArrayBuffer | null }> {
    return this.versionService.getVersionContent(userId, nodeId, timestamp);
  }

  public async revertNodeToVersion(
    userId: string,
    nodeId: string,
    timestamp: number
  ): Promise<VaultNodeEntity> {
    return this.versionService.revertNodeToVersion(userId, nodeId, timestamp);
  }

  // ── Merkle DAG CAS & Manifests ──────────────────────────────────────────────

  public async checkMissingChunks(userId: string, chunkIds: string[]): Promise<string[]> {
    return this.merkleService.checkMissingChunks(userId, chunkIds);
  }

  public async putChunk(userId: string, chunkId: string, chunkData: ArrayBuffer): Promise<void> {
    return this.merkleService.putChunk(userId, chunkId, chunkData);
  }

  public async getChunk(userId: string, chunkId: string): Promise<ArrayBuffer> {
    return this.merkleService.getChunk(userId, chunkId);
  }

  public async commitManifest(
    userId: string,
    nodeId: string,
    manifestId: string,
    encryptedManifest: ArrayBuffer,
    meta: {
      parentManifestId?: string;
      plainSize: number;
      cipherSize: number;
      commitMessage?: string;
    }
  ): Promise<void> {
    return this.merkleService.commitManifest(userId, nodeId, manifestId, encryptedManifest, meta);
  }

  public async commitSyncBundle(
    userId: string,
    nodeId: string,
    manifestId: string,
    encryptedManifest: ArrayBuffer,
    meta: {
      parentManifestId?: string;
      plainSize: number;
      cipherSize: number;
      commitMessage?: string;
      chunkIds: string[];
    },
    incomingChunks: { id: string; data: ArrayBuffer }[]
  ): Promise<{
    success: boolean;
    missingChunkIds?: string[];
    manifest?: VaultManifestEntity;
  }> {
    return this.merkleService.commitSyncBundle(
      userId,
      nodeId,
      manifestId,
      encryptedManifest,
      meta,
      incomingChunks
    );
  }

  public async getManifest(userId: string, manifestId: string): Promise<ArrayBuffer> {
    return this.merkleService.getManifest(userId, manifestId);
  }

  public async getNodeManifestHistory(
    userId: string,
    nodeId: string
  ): Promise<VaultManifestEntity[]> {
    return this.merkleService.getNodeManifestHistory(userId, nodeId);
  }
}
