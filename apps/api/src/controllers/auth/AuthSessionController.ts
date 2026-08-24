import { D1AuditLogRepository } from '../../infrastructure/D1AuditLogRepository';
import { AuthService } from '../../services/AuthService';
import { NonceService } from '../../services/NonceService';
import { ApiResponse, RequestContext } from '../../types/http';

/**
 * AuthSessionController
 * Handles anti-replay nonce handshakes, refresh token rotation, active sessions tracking, and cookie lifecycle.
 */
export class AuthSessionController {
  constructor(
    private readonly authService: AuthService,
    private readonly nonceService: NonceService,
    private readonly auditLogRepo: D1AuditLogRepository
  ) {}

  public async getNonce(ctx: RequestContext): Promise<Response> {
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

  public async refresh(ctx: RequestContext): Promise<Response> {
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
        ctx.env.JWT_SECRET,
        undefined,
        { ipAddress: ip, userAgent }
      );

      const response: ApiResponse = {
        success: true,
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          refreshTokenTtl: result.refreshTokenTtl,
          user: result.user,
        },
        timestamp: new Date().toISOString(),
      };

      const cookieMaxAge = result.refreshTokenTtl || 86400;
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': `__Host-auth_refresh_token=${result.refreshToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${cookieMaxAge}`,
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

  public async getSessions(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const cookieHeader = ctx.request.headers.get('Cookie');
    const rawRefreshToken = this.extractRefreshToken(cookieHeader) || undefined;

    const sessions = await this.authService.getActiveSessions(ctx.env.DB, userId, rawRefreshToken);

    const response: ApiResponse = {
      success: true,
      data: sessions,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public async revokeSession(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const username = ctx.user!.username;
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    const familyId = ctx.params?.id;
    if (!familyId) {
      throw new Error('SESSION_ID_REQUIRED: Session ID parameter is required');
    }

    await this.authService.revokeSession(ctx.env.DB, userId, familyId);

    await this.auditLogRepo.recordLog({
      userId,
      username,
      action: 'AUTH_REVOKE_SESSION',
      authMethod: 'Session Termination',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: `Revoked active session ${familyId}`,
    });

    const response: ApiResponse = {
      success: true,
      data: { message: 'Session revoked successfully' },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public async revokeOtherSessions(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const username = ctx.user!.username;
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);

    const cookieHeader = ctx.request.headers.get('Cookie');
    const rawRefreshToken = this.extractRefreshToken(cookieHeader);

    if (!rawRefreshToken) {
      throw new Error('CURRENT_SESSION_REQUIRED: Current session token is required to preserve active device');
    }

    await this.authService.revokeOtherSessions(ctx.env.DB, userId, rawRefreshToken);

    await this.auditLogRepo.recordLog({
      userId,
      username,
      action: 'AUTH_REVOKE_OTHER_SESSIONS',
      authMethod: 'Session Termination',
      ipAddress: ip,
      userAgent,
      status: 'SUCCESS',
      details: 'Revoked all other active sessions',
    });

    const response: ApiResponse = {
      success: true,
      data: { message: 'All other sessions have been terminated successfully' },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public async logout(ctx: RequestContext): Promise<Response> {
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

  public async getAuditLogs(ctx: RequestContext): Promise<Response> {
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
