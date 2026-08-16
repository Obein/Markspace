import { D1AuditLogRepository } from '../infrastructure/D1AuditLogRepository';
import { AuthService } from '../services/AuthService';
import { NonceService } from '../services/NonceService';
import { LoginDTO, RegisterDTO } from '../types/domain';
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

  async getNonce(_ctx: RequestContext): Promise<Response> {
    const nonceInfo = this.nonceService.generateNonce();
    const response: ApiResponse = {
      success: true,
      data: nonceInfo,
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
      // Anti-replay nonce check if nonce provided
      if (body.nonce && !this.nonceService.consumeNonce(body.nonce)) {
        throw new Error('UNAUTHORIZED: Nonce expired or already consumed');
      }

      const result = await this.authService.register(body, ctx.env.JWT_SECRET);
      const nextNonce = this.nonceService.generateNonce();

      // Audit Log Record
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
          nextNonce: nextNonce.nonce,
        },
        timestamp: new Date().toISOString(),
      };

      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': `__Host-auth_token=${result.token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
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
    const body = (await ctx.request.json()) as LoginDTO & { nonce?: string };
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    try {
      // Anti-replay nonce check if nonce provided
      if (body.nonce && !this.nonceService.consumeNonce(body.nonce)) {
        throw new Error('UNAUTHORIZED: Nonce expired or already consumed');
      }

      const result = await this.authService.login(body, ctx.env.JWT_SECRET);
      const nextNonce = this.nonceService.generateNonce();

      // Audit Log Record
      await this.auditLogRepo.recordLog({
        userId: result.user.id,
        username: result.user.username,
        action: 'AUTH_LOGIN',
        authMethod: 'DPoP + Nonce + HttpOnly Cookie',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'Authenticated successfully with non-extractable client key proof',
      });

      const response: ApiResponse = {
        success: true,
        data: {
          ...result,
          nextNonce: nextNonce.nonce,
        },
        timestamp: new Date().toISOString(),
      };

      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': `__Host-auth_token=${result.token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
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
        authMethod: 'DPoP + Nonce + HttpOnly Cookie',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
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
