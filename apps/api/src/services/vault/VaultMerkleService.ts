import { IObjectStorageService } from '../../interfaces/IObjectStorageService';
import {
  IVaultNodeRepository,
  VaultManifestEntity,
} from '../../interfaces/IVaultNodeRepository';
import { VaultNodeService } from './VaultNodeService';

/**
 * VaultMerkleService
 * Handles Merkle DAG Content-Addressed Storage (CAS) chunks, manifests, and atomic bundle commits.
 */
export class VaultMerkleService {
  constructor(
    private readonly nodeRepo: IVaultNodeRepository,
    private readonly objectStorage: IObjectStorageService,
    private readonly nodeService: VaultNodeService
  ) {}

  public async checkMissingChunks(userId: string, chunkIds: string[]): Promise<string[]> {
    return this.nodeRepo.checkMissingChunks(userId, chunkIds);
  }

  public async putChunk(userId: string, chunkId: string, chunkData: ArrayBuffer): Promise<void> {
    await this.nodeService.ensureStorageQuota(userId, chunkData.byteLength);
    const objectKey = `vaults/${userId}/chunks/${chunkId}`;
    await this.objectStorage.putObject(objectKey, chunkData, 'application/octet-stream');
    await this.nodeRepo.recordChunk(userId, chunkId, chunkData.byteLength);
  }

  public async getChunk(userId: string, chunkId: string): Promise<ArrayBuffer> {
    const objectKey = `vaults/${userId}/chunks/${chunkId}`;
    const obj = await this.objectStorage.getObject(objectKey);
    if (!obj) {
      throw new Error(`NOT_FOUND: Chunk ${chunkId} missing in CAS Object Storage`);
    }
    return this.nodeService.bodyToArrayBuffer(obj.body);
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
    await this.nodeService.getNode(userId, nodeId);
    const objectKey = `vaults/${userId}/manifests/${manifestId}`;
    await this.objectStorage.putObject(objectKey, encryptedManifest, 'application/octet-stream');

    await this.nodeRepo.saveManifest({
      id: manifestId,
      nodeId,
      userId,
      parentManifestId: meta.parentManifestId,
      plainSize: meta.plainSize,
      cipherSize: meta.cipherSize,
      commitMessage: meta.commitMessage,
    });

    await this.nodeRepo.updateNodeActiveManifest(userId, nodeId, manifestId, meta.plainSize);
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
    const node = await this.nodeService.getNode(userId, nodeId);

    // Calculate total incoming byte payload for quota enforcement
    const incomingChunksBytes = incomingChunks.reduce((acc, c) => acc + c.data.byteLength, 0);
    const deltaBytes = Math.max(0, meta.plainSize - node.size) + incomingChunksBytes;
    await this.nodeService.ensureStorageQuota(userId, deltaBytes);

    // 1. First, persist all incoming delta chunk binary blobs into R2
    await Promise.all(
      incomingChunks.map(async (chunk) => {
        const objectKey = `vaults/${userId}/chunks/${chunk.id}`;
        await this.objectStorage.putObject(objectKey, chunk.data, 'application/octet-stream');
      })
    );

    // 2. Persist encrypted manifest binary into R2
    const manifestObjectKey = `vaults/${userId}/manifests/${manifestId}`;
    await this.objectStorage.putObject(manifestObjectKey, encryptedManifest, 'application/octet-stream');

    // 3. Execute DB atomic transaction and integrity barrier
    const commitResult = await this.nodeRepo.commitBundle({
      userId,
      nodeId,
      manifestDto: {
        id: manifestId,
        nodeId,
        userId,
        parentManifestId: meta.parentManifestId,
        plainSize: meta.plainSize,
        cipherSize: meta.cipherSize,
        commitMessage: meta.commitMessage,
      },
      incomingChunks: incomingChunks.map((c) => ({ id: c.id, size: c.data.byteLength })),
      allRequiredChunkIds: meta.chunkIds,
    });

    return commitResult;
  }

  public async getManifest(userId: string, manifestId: string): Promise<ArrayBuffer> {
    const objectKey = `vaults/${userId}/manifests/${manifestId}`;
    const obj = await this.objectStorage.getObject(objectKey);
    if (!obj) {
      throw new Error(`NOT_FOUND: Manifest ${manifestId} missing in Object Storage`);
    }
    return this.nodeService.bodyToArrayBuffer(obj.body);
  }

  public async getNodeManifestHistory(
    userId: string,
    nodeId: string
  ): Promise<VaultManifestEntity[]> {
    await this.nodeService.getNode(userId, nodeId);
    return this.nodeRepo.listManifestsByNode(userId, nodeId);
  }
}
