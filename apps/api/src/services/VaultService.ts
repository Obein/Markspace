import { IObjectStorageService } from '../interfaces/IObjectStorageService';
import {
  CreateVaultNodeDTO,
  IVaultNodeRepository,
  VaultNodeEntity,
  VaultNodeVersionEntity,
  VaultManifestEntity,
} from '../interfaces/IVaultNodeRepository';

export interface CreateNodeRequest {
  path: string;
  name: string;
  isDirectory: boolean;
  size?: number;
  mimeType?: string;
  category?: 'markdown' | 'image' | 'audio' | 'video' | 'binary';
  encryptedDek: string;
  contentBlob?: ArrayBuffer | Uint8Array | string;
}

export class VaultService {
  constructor(
    private readonly nodeRepo: IVaultNodeRepository,
    private readonly objectStorage: IObjectStorageService
  ) {}

  public async getTree(userId: string): Promise<VaultNodeEntity[]> {
    return this.nodeRepo.listNodesByUser(userId);
  }

  private async bodyToArrayBuffer(body: ArrayBuffer | ReadableStream): Promise<ArrayBuffer> {
    if (body instanceof ArrayBuffer) return body;
    const response = new Response(body as any);
    return response.arrayBuffer();
  }

  public async createNode(userId: string, req: CreateNodeRequest): Promise<VaultNodeEntity> {
    const normalizedPath = this.normalizePath(req.path);
    const parentPath = this.getParentPath(normalizedPath);

    const existing = await this.nodeRepo.getNodeByPath(userId, normalizedPath);
    if (existing) {
      throw new Error(`CONFLICT: Node already exists at path ${normalizedPath}`);
    }

    const nodeId = crypto.randomUUID();
    let objectKey: string | null = null;
    let size = req.size || 0;

    if (!req.isDirectory) {
      objectKey = `vaults/${userId}/${nodeId}`;
      const blob = req.contentBlob !== undefined ? req.contentBlob : '';

      if (typeof blob === 'string') {
        size = new TextEncoder().encode(blob).byteLength;
      } else if (blob instanceof ArrayBuffer || blob instanceof Uint8Array) {
        size = blob.byteLength;
      }

      await this.objectStorage.putObject(objectKey, blob, req.mimeType || 'application/octet-stream');
    }

    const dto: CreateVaultNodeDTO = {
      id: nodeId,
      userId,
      path: normalizedPath,
      parentPath,
      name: req.name,
      isDirectory: req.isDirectory,
      size,
      mimeType: req.mimeType,
      category: req.category,
      encryptedDek: req.encryptedDek,
      objectKey,
    };

    return this.nodeRepo.createNode(dto);
  }

  public async getNode(userId: string, nodeId: string): Promise<VaultNodeEntity> {
    const node = await this.nodeRepo.getNodeById(userId, nodeId);
    if (!node) {
      throw new Error(`NOT_FOUND: Node not found with id ${nodeId}`);
    }
    return node;
  }

  public async getFileContent(
    userId: string,
    nodeId: string
  ): Promise<{ node: VaultNodeEntity; body: ArrayBuffer; contentType: string }> {
    const node = await this.getNode(userId, nodeId);
    if (node.isDirectory || !node.objectKey) {
      throw new Error('BAD_REQUEST: Cannot fetch file content for a directory node');
    }

    let obj = await this.objectStorage.getObject(node.objectKey);
    if (!obj) {
      // Fallback: Check if legacy path format exists
      const fallbackKey = node.objectKey.startsWith('vaults/')
        ? node.objectKey.replace(/^vaults\//, 'vault/')
        : node.objectKey.replace(/^vault\//, 'vaults/');
      obj = await this.objectStorage.getObject(fallbackKey);
    }

    if (!obj) {
      if (node.category === 'markdown' || node.mimeType?.startsWith('text/')) {
        return {
          node,
          body: new ArrayBuffer(0),
          contentType: node.mimeType || 'text/markdown',
        };
      }
      throw new Error('NOT_FOUND: File content payload missing in Object Storage');
    }

    const arrayBuf = await this.bodyToArrayBuffer(obj.body);

    return {
      node,
      body: arrayBuf,
      contentType: obj.contentType,
    };
  }

  public async updateFileContent(
    userId: string,
    nodeId: string,
    contentBlob: ArrayBuffer | Uint8Array | string,
    mimeType?: string,
    encryptedDek?: string
  ): Promise<VaultNodeEntity> {
    const node = await this.getNode(userId, nodeId);
    if (node.isDirectory || !node.objectKey) {
      throw new Error('BAD_REQUEST: Cannot update content of a directory node');
    }

    let size = 0;
    if (typeof contentBlob === 'string') {
      size = new TextEncoder().encode(contentBlob).byteLength;
    } else if (contentBlob instanceof ArrayBuffer || contentBlob instanceof Uint8Array) {
      size = contentBlob.byteLength;
    }

    const contentType = mimeType || node.mimeType;
    await this.objectStorage.putObject(node.objectKey, contentBlob, contentType);

    const updated = await this.nodeRepo.updateNode(userId, nodeId, {
      size,
      encryptedDek: encryptedDek || undefined,
    });
    if (!updated) {
      throw new Error('INTERNAL_ERROR: Failed to update node metadata size');
    }

    return updated;
  }

  public async getNodeHistory(userId: string, nodeId: string): Promise<VaultNodeVersionEntity[]> {
    await this.getNode(userId, nodeId);
    return this.nodeRepo.listVersionsByNode(userId, nodeId);
  }

  public async getVersionContent(
    userId: string,
    nodeId: string,
    timestamp: number
  ): Promise<{ version: VaultNodeVersionEntity; body: ArrayBuffer }> {
    const version = await this.nodeRepo.getVersionByTimestamp(userId, nodeId, timestamp);
    if (!version) {
      throw new Error(`NOT_FOUND: Version snapshot not found for timestamp ${timestamp}`);
    }

    const obj = await this.objectStorage.getObject(version.objectKey);
    if (!obj) {
      throw new Error(`NOT_FOUND: Version object payload missing in Object Storage for key ${version.objectKey}`);
    }

    const arrayBuf = await this.bodyToArrayBuffer(obj.body);

    return {
      version,
      body: arrayBuf,
    };
  }

  public async revertNodeToVersion(
    userId: string,
    nodeId: string,
    timestamp: number
  ): Promise<VaultNodeEntity> {
    const node = await this.getNode(userId, nodeId);
    const version = await this.nodeRepo.getVersionByTimestamp(userId, nodeId, timestamp);
    if (!version) {
      throw new Error(`NOT_FOUND: Version snapshot not found for timestamp ${timestamp}`);
    }

    const versionObj = await this.objectStorage.getObject(version.objectKey);
    if (!versionObj) {
      throw new Error('NOT_FOUND: Version content payload missing in Object Storage');
    }

    const arrayBuf = await this.bodyToArrayBuffer(versionObj.body);

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

  public async deleteNode(userId: string, nodeId: string): Promise<void> {
    const node = await this.getNode(userId, nodeId);

    if (node.isDirectory) {
      const deletedNodes = await this.nodeRepo.deleteDirectoryTree(userId, node.path);
      const objectKeysToDelete = deletedNodes
        .map((n) => n.objectKey)
        .filter((k): k is string => Boolean(k));

      if (objectKeysToDelete.length > 0) {
        await this.objectStorage.deleteObjects(objectKeysToDelete);
      }
    } else {
      if (node.objectKey) {
        await this.objectStorage.deleteObject(node.objectKey);
      }
      await this.nodeRepo.deleteNode(userId, nodeId);
    }
  }

  public async moveNode(userId: string, nodeId: string, newPath: string): Promise<VaultNodeEntity> {
    const currentNode = await this.getNode(userId, nodeId);
    const normalizedNewPath = this.normalizePath(newPath);
    const newParentPath = this.getParentPath(normalizedNewPath);
    const newName = this.getFileName(normalizedNewPath);

    if (currentNode.path === normalizedNewPath) {
      return currentNode;
    }

    const existing = await this.nodeRepo.getNodeByPath(userId, normalizedNewPath);
    if (existing && existing.id !== nodeId) {
      throw new Error(`CONFLICT: Node already exists at path ${normalizedNewPath}`);
    }

    const updated = await this.nodeRepo.updateNode(userId, nodeId, {
      path: normalizedNewPath,
      parentPath: newParentPath,
      name: newName,
    });

    if (!updated) {
      throw new Error('INTERNAL_ERROR: Failed to move node path');
    }

    if (currentNode.isDirectory) {
      const oldDirPath = currentNode.path;
      const allUserNodes = await this.nodeRepo.listNodesByUser(userId);

      for (const child of allUserNodes) {
        if (child.path.startsWith(`${oldDirPath}/`)) {
          const childSuffix = child.path.substring(oldDirPath.length);
          const childNewPath = `${normalizedNewPath}${childSuffix}`;
          const childNewParent = this.getParentPath(childNewPath);

          await this.nodeRepo.updateNode(userId, child.id, {
            path: childNewPath,
            parentPath: childNewParent,
          });
        }
      }
    }

    return updated;
  }

  public async checkMissingChunks(userId: string, chunkIds: string[]): Promise<string[]> {
    return this.nodeRepo.checkMissingChunks(userId, chunkIds);
  }

  public async putChunk(userId: string, chunkId: string, chunkData: ArrayBuffer): Promise<void> {
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
    return this.bodyToArrayBuffer(obj.body);
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
    await this.getNode(userId, nodeId);
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
    await this.getNode(userId, nodeId);

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
    return this.bodyToArrayBuffer(obj.body);
  }

  public async getNodeManifestHistory(userId: string, nodeId: string): Promise<any[]> {
    await this.getNode(userId, nodeId);
    return this.nodeRepo.listManifestsByNode(userId, nodeId);
  }

  private normalizePath(pathStr: string): string {
    const cleaned = pathStr.replace(/\\/g, '/').replace(/\/+/g, '/');
    return cleaned.startsWith('/') ? cleaned : '/' + cleaned;
  }

  private getParentPath(pathStr: string): string {
    const lastSlash = pathStr.lastIndexOf('/');
    if (lastSlash <= 0) return '/';
    return pathStr.substring(0, lastSlash);
  }

  private getFileName(pathStr: string): string {
    const lastSlash = pathStr.lastIndexOf('/');
    if (lastSlash < 0) return pathStr;
    return pathStr.substring(lastSlash + 1);
  }
}
