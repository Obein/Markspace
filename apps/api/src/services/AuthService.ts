import { IPasswordHasher } from '../interfaces/IPasswordHasher';
import { ActiveSessionInfo, IssueTokenOptions, ITokenService } from '../interfaces/ITokenService';
import { IUserRepository } from '../interfaces/IUserRepository';
import { TotpService } from './TotpService';
import {
  DisableTotpDTO,
  EnableTotpDTO,
  LoginDTO,
  LoginTotpPasswordlessDTO,
  PreloginResponseDTO,
  RegisterDTO,
  TotpSetupResponseDTO,
  User,
  UserRole,
} from '../types/domain';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshTokenTtl?: number;
  user: {
    id: string;
    username: string;
    role: UserRole;
  };
}

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly totpService: TotpService
  ) {}

  /**
   * Enforces Unix username policy:
   * 5 to 32 characters, lowercase letters, numbers, underscores, and hyphens, starting with a letter or underscore.
   */
  public validateUsername(username: string): string {
    const trimmed = (username || '').trim().toLowerCase();
    const unixRegex = /^[a-z_][a-z0-9_-]{4,31}$/;
    if (!unixRegex.test(trimmed)) {
      throw new Error(
        'INVALID_USERNAME: Username must follow Unix format (5-32 chars, lowercase letters, numbers, _, -, starting with letter or _)'
      );
    }
    return trimmed;
  }

  async prelogin(username: string): Promise<PreloginResponseDTO> {
    const validUsername = this.validateUsername(username);
    const user = await this.userRepository.findByUsername(validUsername);

    return {
      exists: !!user,
      isTotpEnabled: !!user?.isTotpEnabled,
      serverTime: Date.now(),
    };
  }

  async register(
    db: D1Database,
    dto: RegisterDTO,
    jwtSecret: string,
    options?: IssueTokenOptions
  ): Promise<AuthResult> {
    const username = this.validateUsername(dto.username);

    if (!dto.authToken || dto.authToken.trim().length === 0) {
      throw new Error('AUTH_TOKEN_REQUIRED: Authentication token cannot be empty');
    }

    const exists = await this.userRepository.existsByUsername(username);
    if (exists) {
      throw new Error('USER_EXISTS: Username is already registered');
    }

    const totalUsers = await this.userRepository.countTotalUsers();
    const role: UserRole = totalUsers === 0 ? 'admin' : 'user';

    const userId = crypto.randomUUID();
    const salt = this.passwordHasher.generateSalt();
    const authTokenHash = await this.passwordHasher.hash(dto.authToken, salt);
    const now = Date.now();

    const user: User = {
      id: userId,
      username,
      authTokenHash,
      salt,
      role,
      isTotpEnabled: false,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      storageQuotaBytes: null,
    };

    await this.userRepository.create(user);

    const tokenPair = await this.tokenService.issueInitialTokenPair(
      db,
      user.id,
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret,
      {
        ...options,
        rememberMe: dto.rememberMe,
      }
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.rawRefreshToken,
      expiresIn: tokenPair.expiresInSeconds,
      refreshTokenTtl: tokenPair.refreshTokenTtlSeconds,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async login(
    db: D1Database,
    dto: LoginDTO,
    jwtSecret: string,
    kek?: string,
    options?: IssueTokenOptions
  ): Promise<AuthResult> {
    if (!dto.username || !dto.authToken) {
      throw new Error('INVALID_CREDENTIALS: Username and Auth Token are required');
    }

    const username = (dto.username || '').trim().toLowerCase();
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS: Invalid username or password');
    }

    const isValid = await this.passwordHasher.verify(dto.authToken, user.authTokenHash, user.salt);
    if (!isValid) {
      throw new Error('INVALID_CREDENTIALS: Invalid username or password');
    }

    // Check if TOTP is enabled
    if (user.isTotpEnabled && user.encryptedTotpSecret) {
      if (!dto.totpCode || dto.totpCode.trim().length === 0) {
        throw new Error('TOTP_REQUIRED: 6-digit TOTP authentication code is required');
      }

      const secret = await this.totpService.decryptSecret(user.encryptedTotpSecret, kek);
      const isTotpValid = await this.totpService.verifyCode(secret, dto.totpCode);
      if (!isTotpValid) {
        throw new Error('INVALID_TOTP: Invalid or expired TOTP code');
      }
    }

    // Update last active timestamp
    await this.userRepository.updateLastActive(user.id);

    const tokenPair = await this.tokenService.issueInitialTokenPair(
      db,
      user.id,
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret,
      {
        ...options,
        rememberMe: dto.rememberMe,
      }
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.rawRefreshToken,
      expiresIn: tokenPair.expiresInSeconds,
      refreshTokenTtl: tokenPair.refreshTokenTtlSeconds,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async loginPasswordlessTotp(
    db: D1Database,
    dto: LoginTotpPasswordlessDTO,
    jwtSecret: string,
    kek?: string,
    options?: IssueTokenOptions
  ): Promise<AuthResult> {
    if (!dto.username || !dto.totpCode) {
      throw new Error('INVALID_CREDENTIALS: Username and TOTP code are required');
    }

    const username = (dto.username || '').trim().toLowerCase();
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS: Invalid username or TOTP code');
    }

    if (!user.isTotpEnabled || !user.encryptedTotpSecret) {
      throw new Error('TOTP_NOT_ENABLED: TOTP multi-factor authentication is not enabled for this account');
    }

    const secret = await this.totpService.decryptSecret(user.encryptedTotpSecret, kek);
    const isValid = await this.totpService.verifyCode(secret, dto.totpCode);
    if (!isValid) {
      throw new Error('INVALID_TOTP: Invalid or expired TOTP verification code');
    }

    // Update last active timestamp
    await this.userRepository.updateLastActive(user.id);

    const tokenPair = await this.tokenService.issueInitialTokenPair(
      db,
      user.id,
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret,
      {
        ...options,
        rememberMe: dto.rememberMe,
      }
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.rawRefreshToken,
      expiresIn: tokenPair.expiresInSeconds,
      refreshTokenTtl: tokenPair.refreshTokenTtlSeconds,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async refreshTokens(
    db: D1Database,
    rawRefreshToken: string,
    jwtSecret: string,
    dpopJkt?: string,
    clientMeta?: {
      ipAddress?: string;
      userAgent?: string;
      latitude?: number;
      longitude?: number;
      city?: string;
      country?: string;
    }
  ): Promise<AuthResult> {
    const rotated = await this.tokenService.rotateRefreshToken(db, rawRefreshToken, jwtSecret, dpopJkt, clientMeta);

    // Update last active timestamp
    await this.userRepository.updateLastActive(rotated.userPayload.userId);

    return {
      accessToken: rotated.accessToken,
      refreshToken: rotated.rawRefreshToken,
      expiresIn: rotated.expiresInSeconds,
      refreshTokenTtl: rotated.refreshTokenTtlSeconds,
      user: {
        id: rotated.userPayload.userId,
        username: rotated.userPayload.username,
        role: rotated.userPayload.role,
      },
    };
  }

  async getActiveSessions(
    db: D1Database,
    userId: string,
    rawRefreshToken?: string
  ): Promise<ActiveSessionInfo[]> {
    let currentFamilyId: string | undefined;
    if (rawRefreshToken) {
      try {
        const encoder = new TextEncoder();
        const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(rawRefreshToken));
        const tokenHash = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        const record = await db
          .prepare(`SELECT family_id FROM refresh_tokens WHERE token_hash = ?`)
          .bind(tokenHash)
          .first<{ family_id: string }>();

        if (record) {
          currentFamilyId = record.family_id;
        }
      } catch {
        // ignore
      }
    }

    return this.tokenService.listUserSessions(db, userId, currentFamilyId);
  }

  async revokeSession(db: D1Database, userId: string, familyId: string): Promise<void> {
    const family = await db
      .prepare(`SELECT user_id FROM token_families WHERE id = ?`)
      .bind(familyId)
      .first<{ user_id: string }>();

    if (!family || family.user_id !== userId) {
      throw new Error('SESSION_NOT_FOUND: Session not found or unauthorized');
    }

    await this.tokenService.revokeFamily(db, familyId, 'REVOKED_BY_USER');
  }

  async revokeOtherSessions(
    db: D1Database,
    userId: string,
    rawRefreshToken?: string
  ): Promise<void> {
    if (!rawRefreshToken) {
      throw new Error('CURRENT_SESSION_REQUIRED: Current session token is required to preserve active device');
    }

    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(rawRefreshToken));
    const tokenHash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const record = await db
      .prepare(`SELECT family_id FROM refresh_tokens WHERE token_hash = ?`)
      .bind(tokenHash)
      .first<{ family_id: string }>();

    if (!record) {
      throw new Error('SESSION_NOT_FOUND: Current session refresh token not recognized');
    }

    await this.tokenService.revokeOtherUserFamilies(db, userId, record.family_id);
  }

  async logout(db: D1Database, rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    try {
      const encoder = new TextEncoder();
      const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(rawRefreshToken));
      const tokenHash = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const record = await db
        .prepare(`SELECT family_id FROM refresh_tokens WHERE token_hash = ?`)
        .bind(tokenHash)
        .first<{ family_id: string }>();

      if (record) {
        await this.tokenService.revokeFamily(db, record.family_id, 'USER_LOGOUT');
      }
    } catch {
      // Best-effort logout cleanup
    }
  }

  setupTotp(_userId: string, username: string): TotpSetupResponseDTO {
    const secret = this.totpService.generateSecret();
    const otpauthUri = this.totpService.generateOtpauthUri(username, secret);
    return {
      secret,
      otpauthUri,
      expiresAt: Date.now() + 25 * 1000, // 25-second rotation lifetime
    };
  }

  async enableTotp(userId: string, dto: EnableTotpDTO, kek?: string): Promise<boolean> {
    const isValid = await this.totpService.verifyCode(dto.secret, dto.code);
    if (!isValid) {
      throw new Error('INVALID_TOTP: Verification code does not match the secret key');
    }

    const encryptedSecret = await this.totpService.encryptSecret(dto.secret, kek);
    return this.userRepository.updateTotpSecret(userId, encryptedSecret, true);
  }

  async disableTotp(userId: string, dto: DisableTotpDTO, kek?: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.encryptedTotpSecret) {
      return true;
    }

    const secret = await this.totpService.decryptSecret(user.encryptedTotpSecret, kek);
    const isValid = await this.totpService.verifyCode(secret, dto.code);
    if (!isValid) {
      throw new Error('INVALID_TOTP: Invalid verification code. Cannot disable TOTP.');
    }

    return this.userRepository.updateTotpSecret(userId, null, false);
  }
}
