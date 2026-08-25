export type UserRole = 'admin' | 'user';

export interface User {
  id: string; // User UUID
  username: string; // Unix format
  authTokenHash: string;
  salt: string;
  role: UserRole;
  encryptedTotpSecret?: string;
  isTotpEnabled?: boolean;
  createdAt: number;
  updatedAt: number;
  lastActiveAt: number;
  storageQuotaBytes?: number | null;
}

export interface SystemConfig {
  defaultStorageQuotaBytes: number;
  idleDestructionPeriodMs: number;
  maxAuditLogsPerUser: number;
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

export interface AuditLogEntity {
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
    | 'AUTH_REVOKE_SESSION'
    | 'AUTH_REVOKE_OTHER_SESSIONS'
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

export interface CreateAuditLogDTO {
  userId: string;
  username: string;
  action: AuditLogEntity['action'];
  authMethod: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED';
  details?: string;
}

export interface Note {
  id: string;
  userId: string;
  encryptedTitle: string;
  encryptedPayload: string;
  encryptedDek: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteMetadata {
  id: string;
  encryptedTitle: string;
  encryptedDek: string;
  createdAt: number;
  updatedAt: number;
}

export interface Media {
  id: string;
  userId: string;
  noteId: string | null;
  fileName: string;
  mimeType: string;
  encryptedDek: string;
  r2Key: string;
  size: number;
  createdAt: number;
}

export interface PreloginResponseDTO {
  exists: boolean;
  isTotpEnabled: boolean;
  serverTime: number;
}

export interface RegisterDTO {
  username: string;
  authToken: string;
  nonce?: string;
  rememberMe?: boolean;
}

export interface LoginDTO {
  username: string;
  authToken: string;
  totpCode?: string;
  nonce?: string;
  rememberMe?: boolean;
}

export interface LoginTotpPasswordlessDTO {
  username: string;
  totpCode: string;
  nonce?: string;
  rememberMe?: boolean;
}

export interface TotpSetupResponseDTO {
  secret: string;
  otpauthUri: string;
  expiresAt: number;
}

export interface EnableTotpDTO {
  code: string;
  secret: string;
}

export interface DisableTotpDTO {
  code: string;
}

export interface CreateNoteDTO {
  encryptedTitle: string;
  encryptedPayload: string;
  encryptedDek: string;
}

export interface UpdateNoteDTO {
  encryptedTitle?: string;
  encryptedPayload?: string;
  encryptedDek?: string;
}

export interface UploadMediaDTO {
  fileName: string;
  mimeType: string;
  encryptedDek: string;
  size: number;
  noteId?: string;
}

export interface UpdateUserRoleDTO {
  role: UserRole;
}

export interface UpdateUserQuotaDTO {
  storageQuotaBytes: number | null; // in bytes, null means reset to default
}

export interface UpdateSystemConfigDTO {
  defaultStorageQuotaBytes?: number;
  idleDestructionPeriodMs?: number;
}
