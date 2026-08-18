import { FileCategory, NoteItem, NoteMetadataItem } from './INoteModels';

export type UserRole = 'admin' | 'user';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: UserRole;
  };
}

export interface AuditLogResponse {
  id: string;
  userId: string;
  username: string;
  action:
    | 'AUTH_LOGIN'
    | 'AUTH_REGISTER'
    | 'AUTH_LOGOUT'
    | 'AUTH_PASSWORDLESS_TOTP'
    | 'PASSWORD_CHANGE'
    | 'MFA_VERIFY'
    | 'VAULT_OPRF_EVAL'
    | 'TOTP_SETUP'
    | 'TOTP_ENABLE'
    | 'TOTP_DISABLE'
    | 'SECURITY_NONCE_VIOLATION'
    | 'DPOP_HANDSHAKE';
  authMethod: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED';
  details: string;
  timestamp: number;
}

export interface NodeVersionResponse {
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

export interface VaultNodeResponse {
  id: string;
  userId: string;
  path: string;
  parentPath: string;
  name: string;
  isDirectory: boolean;
  size: number;
  mimeType: string;
  category: FileCategory;
  encryptedDek: string;
  objectKey: string | null;
  activeManifestId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface IApiClient {
  setToken(token: string): void;
  setOnForceLogout(callback: (reason: string) => void): void;
  prelogin(username: string): Promise<{ exists: boolean; isTotpEnabled: boolean; serverTime: number }>;
  register(username: string, authToken: string): Promise<AuthResponse>;
  login(username: string, authToken: string, totpCode?: string): Promise<AuthResponse>;
  loginPasswordlessTotp(username: string, totpCode: string): Promise<AuthResponse>;
  logout(): Promise<void>;
  setupTotp(): Promise<{ secret: string; otpauthUri: string; expiresAt: number }>;
  enableTotp(code: string, secret: string): Promise<{ message: string }>;
  disableTotp(code: string): Promise<{ message: string }>;
  getAuditLogs(): Promise<AuditLogResponse[]>;

  // Vault Multi-Factor OPRF Online Evaluation & Lockout API
  setupVaultOprf(vaultId: string, blindedPoint: string): Promise<{ evaluatedPoint: string }>;
  evaluateVaultOprf(
    vaultId: string,
    blindedPoint: string
  ): Promise<{
    evaluatedPoint: string;
    failCount: number;
    lockedUntil: number;
    remainingSeconds: number;
    serverTime: number;
  }>;
  reportVaultPinSuccess(vaultId: string): Promise<{ message: string }>;

  // Vault Tree & Object Storage API
  getVaultTree(): Promise<VaultNodeResponse[]>;
  createVaultNode(dto: {
    path: string;
    name: string;
    isDirectory: boolean;
    encryptedDek: string;
    size?: number;
    mimeType?: string;
    category?: FileCategory;
    contentBlob?: ArrayBuffer | Uint8Array | string;
    activeManifestId?: string | null;
  }): Promise<VaultNodeResponse>;
  getVaultNodeContent(id: string): Promise<{ body: ArrayBuffer; encryptedDek: string; fileName: string }>;
  updateVaultNodeContent(
    id: string,
    contentBlob: ArrayBuffer | Uint8Array | Blob,
    mimeType?: string,
    encryptedDek?: string
  ): Promise<VaultNodeResponse>;
  deleteVaultNode(id: string): Promise<void>;
  moveVaultNode(nodeId: string, newPath: string): Promise<VaultNodeResponse>;

  // Content-Addressed Chunks (CAS) & Merkle Manifests
  checkMissingChunks(chunkIds: string[]): Promise<string[]>;
  uploadChunk(chunkId: string, cipherData: Uint8Array): Promise<void>;
  fetchChunk(chunkId: string): Promise<ArrayBuffer>;
  commitManifest(
    manifestId: string,
    nodeId: string,
    encryptedManifest: Uint8Array,
    meta: {
      parentManifestId?: string;
      plainSize: number;
      cipherSize: number;
      commitMessage?: string;
    }
  ): Promise<void>;
  fetchManifest(manifestId: string): Promise<ArrayBuffer>;
  getManifestHistory(nodeId: string): Promise<any[]>;

  // Git Version Control API
  getNodeHistory(id: string): Promise<NodeVersionResponse[]>;
  getVersionContent(id: string, timestamp: number): Promise<{ body: ArrayBuffer; encryptedDek: string; commitHash: string }>;
  revertNodeVersion(id: string, timestamp: number): Promise<VaultNodeResponse>;

  // Legacy Notes API
  getNotesList(): Promise<NoteMetadataItem[]>;
  getNoteById(id: string): Promise<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }>;
  createNote(encryptedTitle: string, encryptedPayload: string, encryptedDek: string): Promise<NoteItem>;
  updateNote(id: string, encryptedTitle?: string, encryptedPayload?: string, encryptedDek?: string): Promise<NoteItem>;
  deleteNote(id: string): Promise<void>;
}
