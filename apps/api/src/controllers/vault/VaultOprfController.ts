import { D1AuditLogRepository } from '../../infrastructure/D1AuditLogRepository';
import { VaultSecurityService } from '../../services/VaultSecurityService';
import { ApiResponse, RequestContext } from '../../types/http';

/**
 * VaultOprfController
 * Handles OPRF rate-limiting gates, blind evaluation, and lockout tracking.
 */
export class VaultOprfController {
  constructor(
    private readonly vaultSecurityService: VaultSecurityService,
    private readonly auditLogRepo: D1AuditLogRepository
  ) {}

  public async setupOprf(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json().catch(() => ({}))) as {
      vaultId?: string;
      blindedPoint?: string;
      blindedElement?: string;
    };
    const vaultId = ctx.params.vaultId || ctx.params.id || body.vaultId;
    const blindedPoint = body.blindedPoint || body.blindedElement;
    if (!vaultId || !blindedPoint) {
      throw new Error('BAD_REQUEST: Missing required fields (vaultId, blindedPoint/blindedElement)');
    }

    const evaluatedPoint = await this.vaultSecurityService.setupVaultOprf(
      userId,
      vaultId,
      blindedPoint,
      ctx.env.MASTER_ENCRYPTION_KEY
    );

    const response: ApiResponse = {
      success: true,
      data: {
        evaluatedPoint,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async evaluateOprf(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json().catch(() => ({}))) as {
      vaultId?: string;
      blindedPoint?: string;
      blindedElement?: string;
    };
    const vaultId = ctx.params.vaultId || ctx.params.id || body.vaultId;
    const blindedPoint = body.blindedPoint || body.blindedElement;
    if (!vaultId || !blindedPoint) {
      throw new Error('BAD_REQUEST: Missing required fields (vaultId, blindedPoint/blindedElement)');
    }

    const result = await this.vaultSecurityService.evaluateOprf(
      userId,
      vaultId,
      blindedPoint,
      ctx.env.MASTER_ENCRYPTION_KEY
    );

    if (result.remainingSeconds > 0) {
      await this.auditLogRepo.recordLog({
        userId,
        username: ctx.user?.username || 'unknown',
        action: 'VAULT_OPRF_EVAL',
        authMethod: 'Vault OPRF Rate-Limiting Gate',
        ipAddress: this.getClientIp(ctx),
        userAgent: this.getUserAgent(ctx),
        status: 'FAILED',
        details: `Vault OPRF evaluation hit lockout tier (fail count: ${result.failCount}). Lockout: ${result.remainingSeconds}s`,
      });
    }

    const response: ApiResponse = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async reportPinSuccess(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json().catch(() => ({}))) as { vaultId?: string };
    const vaultId = ctx.params.vaultId || ctx.params.id || body.vaultId;
    if (!vaultId) {
      throw new Error('BAD_REQUEST: Missing required field (vaultId)');
    }

    await this.vaultSecurityService.reportPinSuccess(userId, vaultId);

    const response: ApiResponse = {
      success: true,
      data: { reset: true },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
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
