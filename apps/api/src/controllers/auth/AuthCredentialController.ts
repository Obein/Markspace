import { D1AuditLogRepository } from '../../infrastructure/D1AuditLogRepository';
import { AuthService } from '../../services/AuthService';
import {
  LoginDTO,
  LoginTotpPasswordlessDTO,
  RegisterDTO,
} from '../../types/domain';
import { ApiResponse, RequestContext } from '../../types/http';

/**
 * AuthCredentialController
 * Handles prelogin discovery, user registration, and password / passwordless logins.
 */
export class AuthCredentialController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogRepo: D1AuditLogRepository
  ) {}

  public async prelogin(ctx: RequestContext): Promise<Response> {
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

  public async register(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as RegisterDTO;
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    try {
      const result = await this.authService.register(
        ctx.env.DB,
        body,
        ctx.env.JWT_SECRET
      );

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
        'Set-Cookie': `__Host-auth_refresh_token=${result.refreshToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=2592000`,
      });

      return new Response(JSON.stringify(response), {
        status: 201,
        headers,
      });
    } catch (err: unknown) {
      await this.auditLogRepo.recordLog({
        userId: 'anonymous',
        username: body.username || 'unknown',
        action: 'AUTH_REGISTER',
        authMethod: 'DPoP + Nonce Handshake',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : 'Registration failed',
      });
      throw err;
    }
  }

  public async login(ctx: RequestContext): Promise<Response> {
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
        authMethod: body.totpCode ? 'Password + TOTP' : 'Password Only',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'User successfully authenticated and tokens issued',
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
        'Set-Cookie': `__Host-auth_refresh_token=${result.refreshToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=2592000`,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers,
      });
    } catch (err: unknown) {
      await this.auditLogRepo.recordLog({
        userId: 'anonymous',
        username: body.username || 'unknown',
        action: 'AUTH_LOGIN',
        authMethod: body.totpCode ? 'Password + TOTP' : 'Password Only',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : 'Login failed',
      });
      throw err;
    }
  }

  public async loginPasswordlessTotp(ctx: RequestContext): Promise<Response> {
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
        authMethod: 'Passwordless TOTP (RFC 6238)',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'User authenticated via passwordless TOTP and tokens issued',
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
        'Set-Cookie': `__Host-auth_refresh_token=${result.refreshToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=2592000`,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers,
      });
    } catch (err: unknown) {
      await this.auditLogRepo.recordLog({
        userId: 'anonymous',
        username: body.username || 'unknown',
        action: 'AUTH_PASSWORDLESS_TOTP',
        authMethod: 'Passwordless TOTP (RFC 6238)',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : 'Passwordless TOTP login failed',
      });
      throw err;
    }
  }

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
}
