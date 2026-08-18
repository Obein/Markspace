import { D1AuditLogRepository } from '../infrastructure/D1AuditLogRepository';
import { AuthService } from '../services/AuthService';
import { NonceService } from '../services/NonceService';
import {
  DisableTotpDTO,
  EnableTotpDTO,
  LoginDTO,
  LoginTotpPasswordlessDTO,
  RegisterDTO,
} from '../types/domain';
import { ApiResponse, RequestContext } from '../types/http';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly nonceService: NonceService,
    private readonly auditLogRepo: D1AuditLogRepository
  ) {}

  private getClientIp(ctx: RequestContext): string {
    return (
      ctx.request.headers.get('CF-Connecting-IP') ||
      ctx.request.headers.get('X-Forwarded-For') ||
      '127.0.0.1'
    );
  }

  private getUserAgent(ctx: RequestContext): string {
    return ctx.request.headers.get('User-Agent') || 'Unknown Client';
  }

  private extractRefreshToken(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name === '__Host-auth_refresh_token' || name === 'auth_refresh_token') {
        return valueParts.join('=').trim();
      }
    }
    return null;
  }

  async getNonce(ctx: RequestContext): Promise<Response> {
    const nonceInfo = this.nonceService.generateNonce(ctx.user?.userId);
    const response: ApiResponse = {
      success: true,
      data: nonceInfo,
      timestamp: new Date().toISOString(),
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Next-Nonce': nonceInfo.nonce,
      },
    });
  }

  async prelogin(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as { username?: string };
    if (!body.username) {
      throw new Error('USERNAME_REQUIRED: Username is required');
    }

    const result = await this.authService.prelogin(body.username);
    const response: ApiResponse = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async register(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as RegisterDTO;
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    try {
      const result = await this.authService.register(ctx.env.DB, body, ctx.env.JWT_SECRET);

      await this.auditLogRepo.recordLog({
        userId: result.user.id,
        username: result.user.username,
        action: 'AUTH_REGISTER',
        authMethod: 'DPoP + Nonce Handshake',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'User account created with zero-trust dual-token model',
      });

      const response: ApiResponse = {
        success: true,
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          user: result.user,
        },
        timestamp: new Date().toISOString(),
      };

      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': `__Host-auth_refresh_token=${result.refreshToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
      });

      return new Response(JSON.stringify(response), {
        status: 201,
        headers,
      });
    } catch (err: any) {
      await this.auditLogRepo.recordLog({
        userId: 'anonymous',
        username: body.username || 'unknown',
        action: 'AUTH_REGISTER',
        authMethod: 'DPoP + Nonce Handshake',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async login(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as LoginDTO;
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    try {
      const result = await this.authService.login(
        ctx.env.DB,
        body,
        ctx.env.JWT_SECRET,
        ctx.env.MASTER_ENCRYPTION_KEY
      );

      await this.auditLogRepo.recordLog({
        userId: result.user.id,
        username: result.user.username,
        action: 'AUTH_LOGIN',
        authMethod: body.totpCode ? 'Password + TOTP 2FA' : 'Password Hash Handshake',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'User successfully authenticated with dual-token model',
      });

      const response: ApiResponse = {
        success: true,
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          user: result.user,
        },
        timestamp: new Date().toISOString(),
      };

      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': `__Host-auth_refresh_token=${result.refreshToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers,
      });
    } catch (err: any) {
      await this.auditLogRepo.recordLog({
        userId: 'anonymous',
        username: body.username || 'unknown',
        action: 'AUTH_LOGIN',
        authMethod: 'Password Hash Handshake',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async loginPasswordlessTotp(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as LoginTotpPasswordlessDTO;
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    try {
      const result = await this.authService.loginPasswordlessTotp(
        ctx.env.DB,
        body,
        ctx.env.JWT_SECRET,
        ctx.env.MASTER_ENCRYPTION_KEY
      );

      await this.auditLogRepo.recordLog({
        userId: result.user.id,
        username: result.user.username,
        action: 'AUTH_PASSWORDLESS_TOTP',
        authMethod: 'RFC 6238 TOTP (Passwordless)',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'User successfully authenticated via passwordless TOTP',
      });

      const response: ApiResponse = {
        success: true,
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          user: result.user,
        },
        timestamp: new Date().toISOString(),
      };

      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': `__Host-auth_refresh_token=${result.refreshToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers,
      });
    } catch (err: any) {
      await this.auditLogRepo.recordLog({
        userId: 'anonymous',
        username: body.username || 'unknown',
        action: 'AUTH_PASSWORDLESS_TOTP',
        authMethod: 'RFC 6238 TOTP (Passwordless)',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async refresh(ctx: RequestContext): Promise<Response> {
    const cookieHeader = ctx.request.headers.get('Cookie');
    const rawRefreshToken = this.extractRefreshToken(cookieHeader);
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    if (!rawRefreshToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'No refresh token provided in secure HttpOnly cookie',
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      const result = await this.authService.refreshTokens(
        ctx.env.DB,
        rawRefreshToken,
        ctx.env.JWT_SECRET
      );

      const response: ApiResponse = {
        success: true,
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          user: result.user,
        },
        timestamp: new Date().toISOString(),
      };

      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': `__Host-auth_refresh_token=${result.refreshToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers,
      });
    } catch (err: any) {
      const isBreach = String(err?.message || '').includes('BREACH_DETECTED');
      await this.auditLogRepo.recordLog({
        userId: 'anonymous',
        username: 'refresh_session',
        action: isBreach ? 'AUTH_BREACH_DETECTED' : 'AUTH_TOKEN_REFRESH',
        authMethod: 'Refresh Token Rotation (RTR)',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : String(err),
      });

      const clearCookieHeader = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': '__Host-auth_refresh_token=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0',
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: isBreach ? 'BREACH_DETECTED' : 'UNAUTHORIZED',
            message: err instanceof Error ? err.message : 'Invalid or expired refresh token',
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 401,
          headers: clearCookieHeader,
        }
      );
    }
  }

  async logout(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user?.userId || 'anonymous';
    const username = ctx.user?.username || 'unknown';
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);
    const cookieHeader = ctx.request.headers.get('Cookie');
    const rawRefreshToken = this.extractRefreshToken(cookieHeader);

    if (rawRefreshToken) {
      await this.authService.logout(ctx.env.DB, rawRefreshToken);
    }

    await this.auditLogRepo.recordLog({
      userId,
      username,
      action: 'AUTH_LOGOUT',
      authMethod: 'Session Termination',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: 'User logged out and refresh token family revoked',
    });

    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' },
      timestamp: new Date().toISOString(),
    };

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': '__Host-auth_refresh_token=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0',
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers,
    });
  }

  async setupTotp(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const username = ctx.user!.username;

    const setupData = this.authService.setupTotp(userId, username);

    const response: ApiResponse = {
      success: true,
      data: setupData,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async enableTotp(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const username = ctx.user!.username;
    const body = (await ctx.request.json()) as EnableTotpDTO;
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    if (!body.code || !body.secret) {
      throw new Error('BAD_REQUEST: Missing required verification code or secret');
    }

    try {
      await this.authService.enableTotp(userId, body, ctx.env.MASTER_ENCRYPTION_KEY);

      await this.auditLogRepo.recordLog({
        userId,
        username,
        action: 'TOTP_ENABLE',
        authMethod: 'RFC 6238 TOTP',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'Two-Factor Authentication (TOTP) successfully bound and enabled with envelope encryption',
      });

      const response: ApiResponse = {
        success: true,
        data: { message: 'TOTP 2FA successfully enabled.' },
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      await this.auditLogRepo.recordLog({
        userId,
        username,
        action: 'TOTP_ENABLE',
        authMethod: 'RFC 6238 TOTP',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async disableTotp(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const username = ctx.user!.username;
    const body = (await ctx.request.json()) as DisableTotpDTO;
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    if (!body.code) {
      throw new Error('BAD_REQUEST: Missing required TOTP verification code');
    }

    try {
      await this.authService.disableTotp(userId, body, ctx.env.MASTER_ENCRYPTION_KEY);

      await this.auditLogRepo.recordLog({
        userId,
        username,
        action: 'TOTP_DISABLE',
        authMethod: 'RFC 6238 TOTP',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'Two-Factor Authentication (TOTP) successfully disabled and secret removed',
      });

      const response: ApiResponse = {
        success: true,
        data: { message: 'TOTP 2FA successfully disabled.' },
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      await this.auditLogRepo.recordLog({
        userId,
        username,
        action: 'TOTP_DISABLE',
        authMethod: 'RFC 6238 TOTP',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async getAuditLogs(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const logs = await this.auditLogRepo.getLogsByUser(userId, 50);

    const response: ApiResponse = {
      success: true,
      data: logs,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
