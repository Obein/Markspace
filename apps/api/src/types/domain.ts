export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  authTokenHash: string;
  salt: string;
  role: UserRole;
  encryptedTotpSecret?: string;
  isTotpEnabled?: boolean;
  createdAt: number;
  updatedAt: number;
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
}

export interface LoginDTO {
  username: string;
  authToken: string;
  totpCode?: string;
  nonce?: string;
}

export interface LoginTotpPasswordlessDTO {
  username: string;
  totpCode: string;
  nonce?: string;
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
