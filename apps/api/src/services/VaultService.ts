import { IObjectStorageService } from '../interfaces/IObjectStorageService';
import {
  CreateVaultNodeDTO,
  IVaultNodeRepository,
  VaultNodeEntity,
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
      objectKey = `vault/${userId}/${nodeId}`;
      const blob = req.contentBlob !== undefined ? req.contentBlob : '';

      if (typeof blob === 'string') {
        size = new TextEncoder().encode(blob).byteLength;
      } else if (blob instanceof ArrayBuffer) {
        size = blob.byteLength;
      } else if (blob instanceof Uint8Array) {
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
      throw new Error('NOT_FOUND: Vault node not found');
    }
    return node;
  }

  public async getFileContent(
    userId: string,
    nodeId: string
  ): Promise<{ node: VaultNodeEntity; body: ArrayBuffer | ReadableStream; contentType: string }> {
    const node = await this.getNode(userId, nodeId);
    if (node.isDirectory || !node.objectKey) {
      throw new Error('BAD_REQUEST: Cannot read content of a directory node');
    }

    const obj = await this.objectStorage.getObject(node.objectKey);
    if (!obj) {
      throw new Error('NOT_FOUND: File content payload missing in Object Storage');
    }

    return {
      node,
      body: obj.body,
      contentType: obj.contentType,
    };
  }

  public async updateFileContent(
    userId: string,
    nodeId: string,
    contentBlob: ArrayBuffer | Uint8Array | string,
    mimeType?: string
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

    const updated = await this.nodeRepo.updateNode(userId, nodeId, { size });
    if (!updated) {
      throw new Error('INTERNAL_ERROR: Failed to update node metadata size');
    }

    return updated;
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

    // If currentNode is a directory, update all child nodes whose paths start with old directory path
    if (currentNode.isDirectory) {
      const oldDirPath = currentNode.path;
      const allUserNodes = await this.nodeRepo.listNodesByUser(userId);
      for (const child of allUserNodes) {
        if (child.id !== nodeId && child.path.startsWith(`${oldDirPath}/`)) {
          const childSubPath = child.path.substring(oldDirPath.length);
          const childNewPath = `${normalizedNewPath}${childSubPath}`;
          const childNewParentPath = this.getParentPath(childNewPath);
          const childNewName = this.getFileName(childNewPath);

          await this.nodeRepo.updateNode(userId, child.id, {
            path: childNewPath,
            parentPath: childNewParentPath,
            name: childNewName,
          });
        }
      }
    }

    return updated;
  }

  private normalizePath(path: string): string {
    const cleaned = path.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (cleaned.startsWith('/')) return cleaned;
    return '/' + cleaned;
  }

  private getParentPath(path: string): string {
    const normalized = this.normalizePath(path);
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash <= 0) return '/';
    return normalized.substring(0, lastSlash);
  }

  private getFileName(path: string): string {
    const normalized = this.normalizePath(path);
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash < 0) return normalized;
    return normalized.substring(lastSlash + 1);
  }
}
