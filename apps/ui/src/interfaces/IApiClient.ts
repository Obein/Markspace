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
  action: 'AUTH_LOGIN' | 'AUTH_REGISTER' | 'AUTH_LOGOUT' | 'PASSWORD_CHANGE' | 'MFA_VERIFY' | 'DPOP_HANDSHAKE';
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
  createdAt: number;
  updatedAt: number;
}

export interface IApiClient {
  setToken(token: string): void;
  register(username: string, authToken: string): Promise<AuthResponse>;
  login(username: string, authToken: string): Promise<AuthResponse>;
  logout(): Promise<void>;
  getAuditLogs(): Promise<AuditLogResponse[]>;

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
  }): Promise<VaultNodeResponse>;
  getVaultNodeContent(id: string): Promise<{ body: ArrayBuffer; encryptedDek: string; fileName: string }>;
  updateVaultNodeContent(id: string, contentBlob: ArrayBuffer | Uint8Array | string, mimeType?: string): Promise<VaultNodeResponse>;
  deleteVaultNode(id: string): Promise<void>;
  moveVaultNode(nodeId: string, newPath: string): Promise<VaultNodeResponse>;

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
