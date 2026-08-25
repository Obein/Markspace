import { UserPayload } from '../types/http';

export interface TokenPair {
  readonly accessToken: string;
  readonly accessTokenJti: string;
  readonly rawRefreshToken: string;
  readonly familyId: string;
  readonly generation: number;
  readonly expiresInSeconds: number;
  readonly refreshTokenTtlSeconds: number;
}

export interface RefreshTokenRecord {
  readonly tokenHash: string;
  readonly familyId: string;
  readonly generation: number;
  readonly userId: string;
  readonly dpopJkt?: string;
  readonly expiresAt: number;
  readonly isUsed: boolean;
  readonly createdAt: number;
}

export interface TokenFamilyState {
  readonly id: string;
  readonly userId: string;
  readonly activeGeneration: number;
  readonly isRevoked: boolean;
  readonly revokedReason?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly deviceName?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly city?: string;
  readonly country?: string;
  readonly ttlSeconds: number;
  readonly isRememberMe: boolean;
  readonly lastActiveAt?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface ActiveSessionInfo {
  readonly id: string;
  readonly userId: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly deviceName?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly city?: string;
  readonly country?: string;
  readonly ttlSeconds: number;
  readonly isRememberMe: boolean;
  readonly isCurrent: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastActiveAt: number;
  readonly expiresAt: number;
}

export interface IssueTokenOptions {
  readonly dpopJkt?: string;
  readonly rememberMe?: boolean;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly deviceName?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly city?: string;
  readonly country?: string;
}

export interface ITokenService {
  generateToken(payload: UserPayload, secret: string, expiresInSeconds?: number): Promise<string>;
  verifyToken(token: string, secret: string): Promise<UserPayload | null>;
  generateAccessToken(payload: UserPayload, secret: string, expiresInSeconds?: number): Promise<string>;
  verifyAccessToken(token: string, secret: string): Promise<UserPayload | null>;
  issueInitialTokenPair(
    db: D1Database,
    userId: string,
    payload: UserPayload,
    secret: string,
    options?: IssueTokenOptions
  ): Promise<TokenPair>;
  rotateRefreshToken(
    db: D1Database,
    rawOldRefreshToken: string,
    secret: string,
    presentedDpopJkt?: string,
    clientMeta?: {
      ipAddress?: string;
      userAgent?: string;
      latitude?: number;
      longitude?: number;
      city?: string;
      country?: string;
    }
  ): Promise<TokenPair & { userPayload: UserPayload }>;
  listUserSessions(db: D1Database, userId: string, currentFamilyId?: string): Promise<ActiveSessionInfo[]>;
  revokeFamily(db: D1Database, familyId: string, reason?: string): Promise<void>;
  revokeOtherUserFamilies(db: D1Database, userId: string, currentFamilyId: string): Promise<void>;
  revokeAllUserFamilies(db: D1Database, userId: string): Promise<void>;
}
