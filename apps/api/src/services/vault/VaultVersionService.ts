import { IObjectStorageService } from '../../interfaces/IObjectStorageService';
import {
  IVaultNodeRepository,
  VaultNodeEntity,
  VaultNodeVersionEntity,
} from '../../interfaces/IVaultNodeRepository';
import { VaultNodeService } from './VaultNodeService';

/**
 * VaultVersionService
 * Handles snapshot-based version creation, history listing, and version content recovery.
 */
export class VaultVersionService {
  constructor(
    private readonly nodeRepo: IVaultNodeRepository,
    private readonly objectStorage: IObjectStorageService,
    private readonly nodeService: VaultNodeService
  ) {}

  public async createVersion(
    userId: string,
    nodeId: string,
    commitMessage: string,
    commitHash: string,
    contentBlob: ArrayBuffer | Uint8Array | string,
    encryptedDek: string
  ): Promise<VaultNodeVersionEntity> {
    const node = await this.nodeService.getNode(userId, nodeId);

    const timestamp = Date.now();
    const versionId = crypto.randomUUID();
    const objectKey = `vaults/${userId}/versions/${nodeId}_${timestamp}`;

    let size = 0;
    if (typeof contentBlob === 'string') {
      size = new TextEncoder().encode(contentBlob).byteLength;
    } else if (contentBlob instanceof ArrayBuffer || contentBlob instanceof Uint8Array) {
      size = contentBlob.byteLength;
    }

    await this.nodeService.ensureStorageQuota(userId, size);
    await this.objectStorage.putObject(objectKey, contentBlob, node.mimeType || 'text/markdown');

    return this.nodeRepo.createVersion({
      id: versionId,
      nodeId,
      userId,
      timestamp,
      commitHash,
      size,
      encryptedDek,
      objectKey,
      commitMessage,
    });
  }

  public async listVersions(userId: string, nodeId: string): Promise<VaultNodeVersionEntity[]> {
    await this.nodeService.getNode(userId, nodeId);
    return this.nodeRepo.listVersionsByNode(userId, nodeId);
  }

  public async getVersionContent(
    userId: string,
    nodeId: string,
    timestamp: number
  ): Promise<{ version: VaultNodeVersionEntity; body: ArrayBuffer | null }> {
    const version = await this.nodeRepo.getVersionByTimestamp(userId, nodeId, timestamp);
    if (!version) {
      throw new Error(`NOT_FOUND: Version for node ${nodeId} at ${timestamp} not found`);
    }

    let body: ArrayBuffer | null = null;
    if (version.objectKey) {
      const obj = await this.objectStorage.getObject(version.objectKey);
      if (obj) {
        body = await this.nodeService.bodyToArrayBuffer(obj.body);
      }
    }

    return { version, body };
  }

  public async revertNodeToVersion(
    userId: string,
    nodeId: string,
    timestamp: number
  ): Promise<VaultNodeEntity> {
    const node = await this.nodeService.getNode(userId, nodeId);
    const version = await this.nodeRepo.getVersionByTimestamp(userId, nodeId, timestamp);
    if (!version) {
      throw new Error(`NOT_FOUND: Version snapshot not found for timestamp ${timestamp}`);
    }

    const versionObj = await this.objectStorage.getObject(version.objectKey);
    if (!versionObj) {
      throw new Error('NOT_FOUND: Version content payload missing in Object Storage');
    }

    const arrayBuf = await this.nodeService.bodyToArrayBuffer(versionObj.body);

    // Revert main R2 object content & update metadata size and DEK
    await this.objectStorage.putObject(node.objectKey!, arrayBuf, node.mimeType);

    const updatedNode = await this.nodeRepo.updateNode(userId, nodeId, {
      size: version.size,
      encryptedDek: version.encryptedDek,
    });

    if (!updatedNode) {
      throw new Error('INTERNAL_ERROR: Failed to revert node metadata');
    }

    return updatedNode;
  }
}
