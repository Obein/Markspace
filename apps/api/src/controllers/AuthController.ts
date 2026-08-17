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

  /**
   * Helper to validate anti-replay nonce from X-Nonce header or body.
   * If invalid, writes SECURITY_NONCE_VIOLATION audit log and throws error.
   */
  private async verifyAndConsumeNonce(
    ctx: RequestContext,
    providedNonce?: string,
    username?: string
  ): Promise<string> {
    const nonce = providedNonce || ctx.request.headers.get('X-Nonce') || '';
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    if (!nonce || !this.nonceService.consumeNonce(nonce)) {
      await this.auditLogRepo.recordLog({
        userId: ctx.user?.userId || 'anonymous',
        username: username || ctx.user?.username || 'unknown',
        action: 'SECURITY_NONCE_VIOLATION',
        authMethod: 'Anti-Replay Nonce Chain',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: 'Security violation: Nonce missing, expired, or already consumed (Replay Attack Prevention). Session forcefully terminated.',
      });

      throw new Error(
        'SECURITY_NONCE_VIOLATION: Anti-replay nonce verification failed. Session terminated for security reasons.'
      );
    }

    const nextNonceInfo = this.nonceService.generateNonce();
    return nextNonceInfo.nonce;
  }

  async getNonce(_ctx: RequestContext): Promise<Response> {
    const nonceInfo = this.nonceService.generateNonce();
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
    const body = (await ctx.request.json()) as RegisterDTO & { nonce?: string };
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    try {
      const nextNonce = await this.verifyAndConsumeNonce(ctx, body.nonce, body.username);
      const result = await this.authService.register(body, ctx.env.JWT_SECRET);

      await this.auditLogRepo.recordLog({
        userId: result.user.id,
        username: result.user.username,
        action: 'AUTH_REGISTER',
        authMethod: 'DPoP + Nonce Handshake',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'User account created with zero-trust key isolation',
      });

      const response: ApiResponse = {
        success: true,
        data: {
          ...result,
          nextNonce,
        },
        timestamp: new Date().toISOString(),
      };

      const headers = new Headers({
        'Content-Type': 'application/json',
        'X-Next-Nonce': nextNonce,
        'Set-Cookie': `__Host-auth_token=${result.token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
      });

      return new Response(JSON.stringify(response), {
        status: 201,
        headers,
      });
    } catch (err: any) {
      if (!err.message?.includes('SECURITY_NONCE_VIOLATION')) {
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
      }
      throw err;
    }
  }

  async login(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as LoginDTO & { nonce?: string };
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    try {
      const nextNonce = await this.verifyAndConsumeNonce(ctx, body.nonce, body.username);
      const result = await this.authService.login(
        body,
        ctx.env.JWT_SECRET,
        ctx.env.MASTER_ENCRYPTION_KEY
      );

      await this.auditLogRepo.recordLog({
        userId: result.user.id,
        username: result.user.username,
        action: 'AUTH_LOGIN',
        authMethod: body.totpCode ? 'Password + TOTP MFA' : 'Password Auth',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'Authenticated successfully with non-extractable client key proof',
      });

      const response: ApiResponse = {
        success: true,
        data: {
          ...result,
          nextNonce,
        },
        timestamp: new Date().toISOString(),
      };

      const headers = new Headers({
        'Content-Type': 'application/json',
        'X-Next-Nonce': nextNonce,
        'Set-Cookie': `__Host-auth_token=${result.token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers,
      });
    } catch (err: any) {
      if (!err.message?.includes('SECURITY_NONCE_VIOLATION')) {
        await this.auditLogRepo.recordLog({
          userId: 'anonymous',
          username: body.username || 'unknown',
          action: 'AUTH_LOGIN',
          authMethod: 'Password Auth',
          ipAddress: ip,
          userAgent,
          status: 'FAILED',
          details: err instanceof Error ? err.message : String(err),
        });
      }
      throw err;
    }
  }

  async loginPasswordlessTotp(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as LoginTotpPasswordlessDTO & { nonce?: string };
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    try {
      const nextNonce = await this.verifyAndConsumeNonce(ctx, body.nonce, body.username);
      const result = await this.authService.loginPasswordlessTotp(
        body,
        ctx.env.JWT_SECRET,
        ctx.env.MASTER_ENCRYPTION_KEY
      );

      await this.auditLogRepo.recordLog({
        userId: result.user.id,
        username: result.user.username,
        action: 'AUTH_PASSWORDLESS_TOTP',
        authMethod: 'Passwordless TOTP MFA',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'Passwordless login verified successfully via 6-digit TOTP code',
      });

      const response: ApiResponse = {
        success: true,
        data: {
          ...result,
          nextNonce,
        },
        timestamp: new Date().toISOString(),
      };

      const headers = new Headers({
        'Content-Type': 'application/json',
        'X-Next-Nonce': nextNonce,
        'Set-Cookie': `__Host-auth_token=${result.token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers,
      });
    } catch (err: any) {
      if (!err.message?.includes('SECURITY_NONCE_VIOLATION')) {
        await this.auditLogRepo.recordLog({
          userId: 'anonymous',
          username: body.username || 'unknown',
          action: 'AUTH_PASSWORDLESS_TOTP',
          authMethod: 'Passwordless TOTP MFA',
          ipAddress: ip,
          userAgent,
          status: 'FAILED',
          details: err instanceof Error ? err.message : String(err),
        });
      }
      throw err;
    }
  }

  async setupTotp(ctx: RequestContext): Promise<Response> {
    const user = ctx.user;
    if (!user) {
      throw new Error('UNAUTHORIZED: Authentication required to setup TOTP');
    }

    const data = this.authService.setupTotp(user.userId, user.username);
    const nextNonceInfo = this.nonceService.generateNonce();

    await this.auditLogRepo.recordLog({
      userId: user.userId,
      username: user.username,
      action: 'TOTP_SETUP',
      authMethod: 'TOTP Secret Generation',
      ipAddress: this.getClientIp(ctx),
      userAgent: this.getUserAgent(ctx),
      status: 'SUCCESS',
      details: 'Generated new TOTP setup session with 25-second rotation window',
    });

    const response: ApiResponse = {
      success: true,
      data: {
        ...data,
        nextNonce: nextNonceInfo.nonce,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Next-Nonce': nextNonceInfo.nonce,
      },
    });
  }

  async enableTotp(ctx: RequestContext): Promise<Response> {
    const user = ctx.user;
    if (!user) {
      throw new Error('UNAUTHORIZED: Authentication required to enable TOTP');
    }

    const body = (await ctx.request.json()) as EnableTotpDTO & { nonce?: string };
    const nextNonce = await this.verifyAndConsumeNonce(ctx, body.nonce, user.username);

    await this.authService.enableTotp(user.userId, body, ctx.env.MASTER_ENCRYPTION_KEY);

    await this.auditLogRepo.recordLog({
      userId: user.userId,
      username: user.username,
      action: 'TOTP_ENABLE',
      authMethod: 'TOTP Verification & KEK Envelope Encryption',
      ipAddress: this.getClientIp(ctx),
      userAgent: this.getUserAgent(ctx),
      status: 'SUCCESS',
      details: 'TOTP MFA enabled and secret encrypted with MASTER_ENCRYPTION_KEY',
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'TOTP multi-factor authentication enabled successfully',
        nextNonce,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Next-Nonce': nextNonce,
      },
    });
  }

  async disableTotp(ctx: RequestContext): Promise<Response> {
    const user = ctx.user;
    if (!user) {
      throw new Error('UNAUTHORIZED: Authentication required to disable TOTP');
    }

    const body = (await ctx.request.json()) as DisableTotpDTO & { nonce?: string };
    const nextNonce = await this.verifyAndConsumeNonce(ctx, body.nonce, user.username);

    await this.authService.disableTotp(user.userId, body, ctx.env.MASTER_ENCRYPTION_KEY);

    await this.auditLogRepo.recordLog({
      userId: user.userId,
      username: user.username,
      action: 'TOTP_DISABLE',
      authMethod: 'TOTP Disable Verification',
      ipAddress: this.getClientIp(ctx),
      userAgent: this.getUserAgent(ctx),
      status: 'SUCCESS',
      details: 'TOTP multi-factor authentication disabled',
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'TOTP multi-factor authentication disabled',
        nextNonce,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Next-Nonce': nextNonce,
      },
    });
  }

  async logout(ctx: RequestContext): Promise<Response> {
    const user = ctx.user;
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    if (user) {
      await this.auditLogRepo.recordLog({
        userId: user.userId,
        username: user.username,
        action: 'AUTH_LOGOUT',
        authMethod: 'Session Termination',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'User logged out and session cookie cleared',
      });
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' },
      timestamp: new Date().toISOString(),
    };

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': `__Host-auth_token=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers,
    });
  }

  async getAuditLogs(ctx: RequestContext): Promise<Response> {
    const user = ctx.user;
    if (!user) {
      throw new Error('UNAUTHORIZED: Authentication required to view audit logs');
    }

    const logs = await this.auditLogRepo.getLogsByUser(user.userId);
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
