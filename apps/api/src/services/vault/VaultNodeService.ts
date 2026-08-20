import { IObjectStorageService } from '../../interfaces/IObjectStorageService';
import { IUserRepository } from '../../interfaces/IUserRepository';
import {
  CreateVaultNodeDTO,
  IVaultNodeRepository,
  VaultNodeEntity,
} from '../../interfaces/IVaultNodeRepository';

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

/**
 * VaultNodeService
 * Handles hierarchical node CRUD, path normalization, storage quotas, and R2 Object Storage integration.
 */
export class VaultNodeService {
  constructor(
    private readonly nodeRepo: IVaultNodeRepository,
    private readonly objectStorage: IObjectStorageService,
    private readonly userRepository?: IUserRepository
  ) {}

  public async ensureStorageQuota(userId: string, incomingBytes: number): Promise<void> {
    if (!this.userRepository || incomingBytes <= 0) return;
    const user = await this.userRepository.findById(userId);
    if (user?.role === 'admin') return; // Admins are exempt from default quota

    const systemConfig = await this.userRepository.getSystemConfig();
    const quota = user?.storageQuotaBytes ?? systemConfig.defaultStorageQuotaBytes;
    const currentUsage = await this.userRepository.getUserStorageUsage(userId);

    if (currentUsage + incomingBytes > quota) {
      const quotaMb = (quota / (1024 * 1024)).toFixed(1);
      const usedMb = (currentUsage / (1024 * 1024)).toFixed(1);
      const error: any = new Error(
        `STORAGE_QUOTA_EXCEEDED: Storage quota exceeded (${usedMb}MB / ${quotaMb}MB). Please clean up data or ask an administrator to expand your quota.`
      );
      error.status = 413;
      error.code = 'STORAGE_QUOTA_EXCEEDED';
      throw error;
    }
  }

  public async getTree(userId: string): Promise<VaultNodeEntity[]> {
    if (this.userRepository) {
      await this.userRepository.updateLastActive(userId);
    }
    return this.nodeRepo.listNodesByUser(userId);
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

      await this.ensureStorageQuota(userId, size);
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
      throw new Error(`NOT_FOUND: Node ${nodeId} not found`);
    }
    return node;
  }

  public async getContent(userId: string, nodeId: string): Promise<ArrayBuffer> {
    const node = await this.getNode(userId, nodeId);
    if (node.isDirectory || !node.objectKey) {
      throw new Error(`BAD_REQUEST: Node ${nodeId} is a directory or has no content`);
    }

    const obj = await this.objectStorage.getObject(node.objectKey);
    if (!obj) {
      throw new Error(`NOT_FOUND: Node content payload missing in Object Storage`);
    }

    return this.bodyToArrayBuffer(obj.body);
  }

  public async updateNodeContent(
    userId: string,
    nodeId: string,
    body: ArrayBuffer | Uint8Array | string,
    mimeType: string,
    encryptedDek?: string
  ): Promise<VaultNodeEntity> {
    const node = await this.getNode(userId, nodeId);
    if (node.isDirectory) {
      throw new Error(`BAD_REQUEST: Cannot write file content to a directory node`);
    }

    const objectKey = node.objectKey || `vaults/${userId}/${nodeId}`;
    let newSize = 0;
    if (typeof body === 'string') {
      newSize = new TextEncoder().encode(body).byteLength;
    } else if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
      newSize = body.byteLength;
    }

    const deltaBytes = Math.max(0, newSize - (node.size || 0));
    if (deltaBytes > 0) {
      await this.ensureStorageQuota(userId, deltaBytes);
    }

    await this.objectStorage.putObject(objectKey, body, mimeType);

    const updated = await this.nodeRepo.updateNode(userId, nodeId, {
      size: newSize,
      encryptedDek: encryptedDek || node.encryptedDek,
    });

    if (!updated) {
      throw new Error(`INTERNAL_ERROR: Failed to update node metadata for ${nodeId}`);
    }

    return updated;
  }

  public async deleteNode(userId: string, nodeId: string): Promise<void> {
    const node = await this.getNode(userId, nodeId);

    if (node.isDirectory) {
      const deletedNodes = await this.nodeRepo.deleteDirectoryTree(userId, node.path);
      const objectKeysToDelete = deletedNodes
        .filter((n) => !n.isDirectory && n.objectKey)
        .map((n) => n.objectKey as string);

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
    const normalizedNewPath = this.normalizePath(newPath);
    const newParentPath = this.getParentPath(normalizedNewPath);
    const newName = this.getNodeName(normalizedNewPath);

    const existingTarget = await this.nodeRepo.getNodeByPath(userId, normalizedNewPath);
    if (existingTarget && existingTarget.id !== nodeId) {
      throw new Error(`CONFLICT: Target path ${normalizedNewPath} already exists`);
    }

    const node = await this.getNode(userId, nodeId);
    const oldDirPath = node.path;
    const wasDirectory = node.isDirectory;

    const updated = await this.nodeRepo.updateNode(userId, nodeId, {
      path: normalizedNewPath,
      parentPath: newParentPath,
      name: newName,
    });

    if (!updated) {
      throw new Error('INTERNAL_ERROR: Failed to move node');
    }

    if (wasDirectory) {
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

  public async deleteDirectoryTree(userId: string, targetPath: string): Promise<VaultNodeEntity[]> {
    const normalized = this.normalizePath(targetPath);
    const deletedNodes = await this.nodeRepo.deleteDirectoryTree(userId, normalized);

    const keysToDelete = deletedNodes
      .filter((n) => !n.isDirectory && n.objectKey)
      .map((n) => n.objectKey as string);

    if (keysToDelete.length > 0) {
      await this.objectStorage.deleteObjects(keysToDelete);
    }

    return deletedNodes;
  }

  public normalizePath(path: string): string {
    const clean = path.trim().replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
    return clean;
  }

  public getParentPath(normalizedPath: string): string {
    const lastSlash = normalizedPath.lastIndexOf('/');
    if (lastSlash === -1) return '';
    return normalizedPath.substring(0, lastSlash);
  }

  public getNodeName(normalizedPath: string): string {
    const lastSlashIndex = normalizedPath.lastIndexOf('/');
    if (lastSlashIndex === -1) return normalizedPath;
    return normalizedPath.substring(lastSlashIndex + 1);
  }

  public async bodyToArrayBuffer(body: ArrayBuffer | ReadableStream): Promise<ArrayBuffer> {
    if (body instanceof ArrayBuffer) return body;
    const response = new Response(body as any);
    return response.arrayBuffer();
  }
}
