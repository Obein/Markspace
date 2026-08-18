export interface VaultNodeEntity {
  id: string;
  userId: string;
  path: string;
  parentPath: string;
  name: string;
  isDirectory: boolean;
  size: number;
  mimeType: string;
  category: 'markdown' | 'image' | 'audio' | 'video' | 'binary';
  encryptedDek: string;
  objectKey: string | null;
  activeManifestId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface VaultNodeVersionEntity {
  id: string;
  nodeId: string;
  userId: string;
  timestamp: number;
  commitHash: string;
  size: number;
  encryptedDek: string;
  objectKey: string;
  commitMessage: string;
  createdAt: number;
}

export interface VaultManifestEntity {
  id: string;
  nodeId: string;
  userId: string;
  parentManifestId: string | null;
  plainSize: number;
  cipherSize: number;
  commitMessage: string | null;
  createdAt: number;
}

export interface CreateVaultNodeDTO {
  id: string;
  userId: string;
  path: string;
  parentPath: string;
  name: string;
  isDirectory: boolean;
  size?: number;
  mimeType?: string;
  category?: 'markdown' | 'image' | 'audio' | 'video' | 'binary';
  encryptedDek: string;
  objectKey?: string | null;
  activeManifestId?: string | null;
}

export interface CreateVaultNodeVersionDTO {
  id: string;
  nodeId: string;
  userId: string;
  timestamp: number;
  commitHash: string;
  size: number;
  encryptedDek: string;
  objectKey: string;
  commitMessage?: string;
}

export interface CreateVaultManifestDTO {
  id: string;
  nodeId: string;
  userId: string;
  parentManifestId?: string | null;
  plainSize: number;
  cipherSize: number;
  commitMessage?: string | null;
}

export interface UpdateVaultNodeDTO {
  name?: string;
  path?: string;
  parentPath?: string;
  size?: number;
  encryptedDek?: string;
  activeManifestId?: string | null;
}

export interface IVaultNodeRepository {
  createNode(dto: CreateVaultNodeDTO): Promise<VaultNodeEntity>;
  getNodeById(userId: string, nodeId: string): Promise<VaultNodeEntity | null>;
  getNodeByPath(userId: string, path: string): Promise<VaultNodeEntity | null>;
  listNodesByUser(userId: string): Promise<VaultNodeEntity[]>;
  listChildren(userId: string, parentPath: string): Promise<VaultNodeEntity[]>;
  updateNode(userId: string, nodeId: string, dto: UpdateVaultNodeDTO): Promise<VaultNodeEntity | null>;
  deleteNode(userId: string, nodeId: string): Promise<boolean>;
  deleteDirectoryTree(userId: string, targetPath: string): Promise<VaultNodeEntity[]>;

  // Legacy Version Control Methods
  createVersion(dto: CreateVaultNodeVersionDTO): Promise<VaultNodeVersionEntity>;
  listVersionsByNode(userId: string, nodeId: string): Promise<VaultNodeVersionEntity[]>;
  getVersionByTimestamp(userId: string, nodeId: string, timestamp: number): Promise<VaultNodeVersionEntity | null>;

  // Merkle DAG CAS & Manifest Methods
  checkMissingChunks(userId: string, chunkIds: string[]): Promise<string[]>;
  recordChunk(userId: string, chunkId: string, size: number): Promise<void>;
  saveManifest(dto: CreateVaultManifestDTO): Promise<VaultManifestEntity>;
  listManifestsByNode(userId: string, nodeId: string): Promise<VaultManifestEntity[]>;
  getManifestById(userId: string, manifestId: string): Promise<VaultManifestEntity | null>;
  updateNodeActiveManifest(userId: string, nodeId: string, manifestId: string, plainSize: number): Promise<void>;
}
