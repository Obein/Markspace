import { D1AuditLogRepository } from '../infrastructure/D1AuditLogRepository';
import { VaultSecurityService } from '../services/VaultSecurityService';
import { VaultService } from '../services/VaultService';
import { ApiResponse, RequestContext } from '../types/http';

export class VaultController {
  constructor(
    private readonly vaultService: VaultService,
    private readonly vaultSecurityService: VaultSecurityService,
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

  public async setupOprf(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as { vaultId?: string; blindedPoint?: string };
    if (!body.vaultId || !body.blindedPoint) {
      throw new Error('BAD_REQUEST: Missing required fields (vaultId, blindedPoint)');
    }

    const evaluatedPoint = await this.vaultSecurityService.setupVaultOprf(
      userId,
      body.vaultId,
      body.blindedPoint,
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
    const body = (await ctx.request.json()) as { vaultId?: string; blindedPoint?: string };
    if (!body.vaultId || !body.blindedPoint) {
      throw new Error('BAD_REQUEST: Missing required fields (vaultId, blindedPoint)');
    }

    const result = await this.vaultSecurityService.evaluateOprf(
      userId,
      body.vaultId,
      body.blindedPoint,
      ctx.env.MASTER_ENCRYPTION_KEY
    );

    if (result.remainingSeconds > 0) {
      await this.auditLogRepo.recordLog({
        userId,
        username: ctx.user?.username || 'unknown',
        action: 'MFA_VERIFY',
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
    const body = (await ctx.request.json()) as { vaultId?: string };
    if (!body.vaultId) {
      throw new Error('BAD_REQUEST: Missing required vaultId');
    }

    await this.vaultSecurityService.reportPinSuccess(userId, body.vaultId);

    await this.auditLogRepo.recordLog({
      userId,
      username: ctx.user?.username || 'unknown',
      action: 'MFA_VERIFY',
      authMethod: 'Vault OPRF Evaluation',
      ipAddress: this.getClientIp(ctx),
      userAgent: this.getUserAgent(ctx),
      status: 'SUCCESS',
      details: 'PIN successfully verified via OPRF. Lockout counter reset.',
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'PIN successfully verified. Lockout status reset.',
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

  public async getTree(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const tree = await this.vaultService.getTree(userId);

    return new Response(
      JSON.stringify({
        success: true,
        data: tree,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async createNode(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as any;

    if (!body.path || !body.name || body.isDirectory === undefined) {
      throw new Error('BAD_REQUEST: Missing required fields (path, name, isDirectory)');
    }

    if (!body.isDirectory && !body.encryptedDek) {
      throw new Error('BAD_REQUEST: Missing required field encryptedDek for file nodes');
    }

    const isDirectory = Boolean(body.isDirectory);

    const node = await this.vaultService.createNode(userId, {
      path: body.path,
      name: body.name,
      isDirectory,
      size: body.size || 0,
      mimeType: body.mimeType || (isDirectory ? 'inode/directory' : 'text/markdown'),
      category: body.category || 'markdown',
      encryptedDek: body.encryptedDek || '',
      contentBlob: body.contentBlob || '',
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: node,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async getContent(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;

    const { node, body } = await this.vaultService.getFileContent(userId, nodeId);

    return new Response(body as any, {
      status: 200,
      headers: {
        'Content-Type': node.mimeType || 'application/octet-stream',
        'X-Encrypted-DEK': node.encryptedDek,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(node.name)}"`,
      },
    });
  }

  public async updateContent(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    const contentType = ctx.request.headers.get('Content-Type') || 'application/octet-stream';
    const encryptedDek = ctx.request.headers.get('X-Encrypted-DEK') || undefined;

    const arrayBuffer = await ctx.request.arrayBuffer();
    const updatedNode = await this.vaultService.updateFileContent(
      userId,
      nodeId,
      arrayBuffer,
      contentType,
      encryptedDek
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedNode,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async deleteNode(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;

    await this.vaultService.deleteNode(userId, nodeId);

    return new Response(
      JSON.stringify({
        success: true,
        data: { message: 'Node deleted successfully' },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async moveNode(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as any;

    if (!body.nodeId || !body.newPath) {
      throw new Error('BAD_REQUEST: Missing required fields (nodeId, newPath)');
    }

    const updatedNode = await this.vaultService.moveNode(userId, body.nodeId, body.newPath);

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedNode,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async getNodeHistory(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;

    const history = await this.vaultService.getNodeHistory(userId, nodeId);

    return new Response(
      JSON.stringify({
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async getVersionContent(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    const timestampStr = ctx.params.timestamp;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      throw new Error('BAD_REQUEST: Invalid timestamp parameter');
    }

    const { version, body } = await this.vaultService.getVersionContent(userId, nodeId, timestamp);

    return new Response(body as any, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'X-Encrypted-DEK': version.encryptedDek,
        'X-Commit-Hash': version.commitHash,
      },
    });
  }

  public async revertNodeVersion(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    const body = (await ctx.request.json()) as any;

    if (!body.timestamp || typeof body.timestamp !== 'number') {
      throw new Error('BAD_REQUEST: Missing valid numeric timestamp in request body');
    }

    const updatedNode = await this.vaultService.revertNodeToVersion(userId, nodeId, body.timestamp);

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedNode,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
