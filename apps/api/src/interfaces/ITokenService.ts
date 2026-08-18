import { UserPayload } from '../types/http';

export interface TokenPair {
  readonly accessToken: string;
  readonly accessTokenJti: string;
  readonly rawRefreshToken: string;
  readonly familyId: string;
  readonly generation: number;
  readonly expiresInSeconds: number;
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
  readonly createdAt: number;
  readonly updatedAt: number;
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
    dpopJkt?: string
  ): Promise<TokenPair>;
  rotateRefreshToken(
    db: D1Database,
    rawOldRefreshToken: string,
    secret: string,
    presentedDpopJkt?: string
  ): Promise<TokenPair & { userPayload: UserPayload }>;
  revokeFamily(db: D1Database, familyId: string, reason?: string): Promise<void>;
  revokeAllUserFamilies(db: D1Database, userId: string): Promise<void>;
}
