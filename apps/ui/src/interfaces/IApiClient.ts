import { FileCategory, NoteItem, NoteMetadataItem } from './INoteModels';

export type UserRole = 'admin' | 'user';

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string; // User UUID
    username: string; // Unix format
    role: UserRole;
  };
  token?: string; // Backward compatibility alias
}

export interface UserAdminSummary {
  id: string;
  username: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
  lastActiveAt: number;
  usedStorageBytes: number;
  storageQuotaBytes: number;
  isCustomQuota: boolean;
}

export interface SystemConfig {
  defaultStorageQuotaBytes: number;
  idleDestructionPeriodMs: number;
  maxAuditLogsPerUser: number;
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
    | 'AUTH_TOKEN_REFRESH'
    | 'AUTH_BREACH_DETECTED'
    | 'PASSWORD_CHANGE'
    | 'MFA_VERIFY'
    | 'VAULT_OPRF_EVAL'
    | 'TOTP_SETUP'
    | 'TOTP_ENABLE'
    | 'TOTP_DISABLE'
    | 'SECURITY_NONCE_VIOLATION'
    | 'DPOP_HANDSHAKE'
    | 'ADMIN_DELETE_USER'
    | 'ADMIN_UPDATE_ROLE'
    | 'ADMIN_UPDATE_QUOTA'
    | 'ADMIN_UPDATE_POLICY'
    | 'USER_IDLE_DESTROYED'
    | 'GEO_ANOMALY_SESSION_TERMINATED'
    | 'MTLS_SECURITY_VIOLATION';
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
  createdAt: number;
  updatedAt: number;
  activeManifestId?: string | null;
}

export interface ActiveSession {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  ttlSeconds: number;
  isRememberMe: boolean;
  isCurrent: boolean;
  createdAt: number;
  updatedAt: number;
  lastActiveAt: number;
  expiresAt: number;
}

export interface IApiClient {
  setToken(token: string): void;
  getAccessToken(): string | null;
  getCurrentClientIp(): string | null;
  setOnForceLogout(callback: (reason: string) => void): void;
  setOnIpChanged(callback: (oldIp: string, newIp: string) => void): void;

  // Zero-Trust Session & Token Lifecycle
  initSession(): Promise<AuthResponse | null>;
  refreshToken(): Promise<AuthResponse>;
  getSessions(): Promise<ActiveSession[]>;
  revokeSession(id: string): Promise<void>;
  revokeOtherSessions(): Promise<void>;
  logout(): Promise<void>;

  // Nonce & Prelogin Handshakes
  prelogin(username: string): Promise<{ exists: boolean; isTotpEnabled: boolean; serverTime: number }>;
  register(username: string, authToken: string, rememberMe?: boolean): Promise<AuthResponse>;
  login(username: string, authToken: string, totpCode?: string, rememberMe?: boolean): Promise<AuthResponse>;
  loginPasswordlessTotp(username: string, totpCode: string, rememberMe?: boolean): Promise<AuthResponse>;

  // TOTP 2FA Management
  setupTotp(): Promise<{ secret: string; otpauthUri: string; expiresAt: number }>;
  enableTotp(secret: string, code: string): Promise<{ message: string }>;
  disableTotp(code: string): Promise<{ message: string }>;

  // Audit Logs API
  getAuditLogs(): Promise<AuditLogResponse[]>;

  // Zero-Knowledge OPRF PIN / Recovery Key Endpoints
  setupVaultOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }>;
  evaluateVaultOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }>;
  evaluateVaultPinOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }>;
  evaluateVaultRecoveryOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }>;
  reportVaultPinFailure(vaultId: string): Promise<{ remainingAttempts: number; lockoutUntil: number; serverTime: number }>;
  reportVaultPinSuccess(vaultId: string): Promise<void>;

  // Vault File & Tree APIs
  getVaultTree(): Promise<VaultNodeResponse[]>;
  createVaultNode(node: {
    id?: string;
    path: string;
    parentPath?: string;
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
  commitSyncBundle(formData: FormData): Promise<{
    success: boolean;
    manifestId?: string;
    nodeId?: string;
    uploadedChunksCount?: number;
    missingChunkIds?: string[];
  }>;
  fetchManifest(manifestId: string): Promise<ArrayBuffer>;
  getManifestHistory(nodeId: string): Promise<any[]>;

  // Third-Party Storage Metadata API
  getVaultStorageConfig(vaultId: string): Promise<{
    vaultId: string;
    provider: string;
    encryptedConfig: string | null;
    iv?: string;
    tag?: string;
  } | null>;
  putVaultStorageConfig(vaultId: string, payload: { provider: string; encryptedConfig: string; iv: string; tag?: string }): Promise<void>;
  deleteVaultStorageConfig(vaultId: string): Promise<void>;

  // Version Control API
  getNodeHistory(id: string): Promise<NodeVersionResponse[]>;
  getVersionContent(id: string, timestamp: number): Promise<{ body: ArrayBuffer; encryptedDek: string; commitHash: string }>;
  revertNodeVersion(id: string, timestamp: number): Promise<VaultNodeResponse>;

  // System Capabilities
  getSystemCapabilities(): Promise<{ r2Available: boolean }>;

  // Admin Management Endpoints
  adminListUsers(): Promise<UserAdminSummary[]>;
  adminDeleteUser(id: string): Promise<{ message: string }>;
  adminUpdateUserRole(id: string, role: UserRole): Promise<{ message: string }>;
  adminUpdateUserQuota(id: string, quotaBytes: number | null): Promise<{ message: string; storageQuotaBytes: number | null }>;
  adminGetSystemSettings(): Promise<SystemConfig>;
  adminUpdateSystemSettings(settings: Partial<SystemConfig>): Promise<SystemConfig>;
  adminCleanupIdleUsers(): Promise<{ destroyedCount: number; destroyedUsernames: string[]; message: string }>;

  // Legacy Notes API
  getNotesList(): Promise<NoteMetadataItem[]>;
  getNoteById(id: string): Promise<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }>;
  createNote(encryptedTitle: string, encryptedPayload: string, encryptedDek: string): Promise<NoteItem>;
  updateNote(id: string, encryptedTitle?: string, encryptedPayload?: string, encryptedDek?: string): Promise<NoteItem>;
  deleteNote(id: string): Promise<void>;
}
