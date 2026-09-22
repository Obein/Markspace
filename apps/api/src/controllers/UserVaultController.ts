import { D1AuditLogRepository } from '../infrastructure/D1AuditLogRepository';
import { D1UserVaultRepository } from '../infrastructure/D1UserVaultRepository';
import { ApiResponse, RequestContext } from '../types/http';

export class UserVaultController {
  constructor(
    private readonly userVaultRepo: D1UserVaultRepository,
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

  public async listVaults(ctx: RequestContext): Promise<Response> {
    if (!ctx.user) {
      throw new Error('UNAUTHORIZED: Authentication required');
    }

    const vaults = await this.userVaultRepo.getVaultsByUserId(ctx.user.userId);
    const response: ApiResponse = {
      success: true,
      data: vaults,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public async createVault(ctx: RequestContext): Promise<Response> {
    if (!ctx.user) {
      throw new Error('UNAUTHORIZED: Authentication required');
    }

    const body = (await ctx.request.json()) as {
      name?: string;
      salt?: string;
      wrappedVmk?: string;
      encryptedStorageConfig?: string | null;
      isDefault?: boolean;
    };

    if (!body.name || !body.salt || !body.wrappedVmk) {
      throw new Error('INVALID_INPUT: name, salt, and wrappedVmk are required');
    }

    const vaultId = crypto.randomUUID();
    const created = await this.userVaultRepo.createVault({
      id: vaultId,
      userId: ctx.user.userId,
      name: body.name.trim(),
      salt: body.salt,
      wrappedVmk: body.wrappedVmk,
      encryptedStorageConfig: body.encryptedStorageConfig || null,
      isDefault: Boolean(body.isDefault),
    });

    await this.auditLogRepo.recordLog({
      userId: ctx.user.userId,
      username: ctx.user.username,
      action: 'VAULT_CREATE',
      authMethod: 'UMK Envelope',
      ipAddress: this.getClientIp(ctx),
      userAgent: this.getUserAgent(ctx),
      status: 'SUCCESS',
      details: `Created vault "${body.name.trim()}" (${vaultId})`,
    });

    const response: ApiResponse = {
      success: true,
      data: created,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public async updateVault(ctx: RequestContext): Promise<Response> {
    if (!ctx.user) {
      throw new Error('UNAUTHORIZED: Authentication required');
    }

    const vaultId = ctx.params?.id;
    if (!vaultId) {
      throw new Error('INVALID_INPUT: Vault ID is required');
    }

    const body = (await ctx.request.json()) as {
      name?: string;
      wrappedVmk?: string;
      encryptedStorageConfig?: string | null;
    };

    await this.userVaultRepo.updateVault(ctx.user.userId, vaultId, body);

    await this.auditLogRepo.recordLog({
      userId: ctx.user.userId,
      username: ctx.user.username,
      action: 'VAULT_UPDATE',
      authMethod: 'UMK Envelope',
      ipAddress: this.getClientIp(ctx),
      userAgent: this.getUserAgent(ctx),
      status: 'SUCCESS',
      details: `Updated vault ${vaultId}`,
    });

    const response: ApiResponse = {
      success: true,
      data: { updated: true },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public async deleteVault(ctx: RequestContext): Promise<Response> {
    if (!ctx.user) {
      throw new Error('UNAUTHORIZED: Authentication required');
    }

    const vaultId = ctx.params?.id;
    if (!vaultId) {
      throw new Error('INVALID_INPUT: Vault ID is required');
    }

    await this.userVaultRepo.deleteVault(ctx.user.userId, vaultId);

    await this.auditLogRepo.recordLog({
      userId: ctx.user.userId,
      username: ctx.user.username,
      action: 'VAULT_DELETE',
      authMethod: 'UMK Envelope',
      ipAddress: this.getClientIp(ctx),
      userAgent: this.getUserAgent(ctx),
      status: 'SUCCESS',
      details: `Deleted vault ${vaultId}`,
    });

    const response: ApiResponse = {
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
