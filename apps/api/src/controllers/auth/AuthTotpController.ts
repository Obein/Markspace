import { D1AuditLogRepository } from '../../infrastructure/D1AuditLogRepository';
import { AuthService } from '../../services/AuthService';
import { DisableTotpDTO, EnableTotpDTO } from '../../types/domain';
import { ApiResponse, RequestContext } from '../../types/http';

/**
 * AuthTotpController
 * Handles TOTP initialization, verification, and deactivation.
 */
export class AuthTotpController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogRepo: D1AuditLogRepository
  ) {}

  public async setupTotp(ctx: RequestContext): Promise<Response> {
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

  public async enableTotp(ctx: RequestContext): Promise<Response> {
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

  public async disableTotp(ctx: RequestContext): Promise<Response> {
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
