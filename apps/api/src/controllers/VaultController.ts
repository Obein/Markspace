import { D1AuditLogRepository } from '../infrastructure/D1AuditLogRepository';
import { NonceService } from '../services/NonceService';
import { VaultSecurityService } from '../services/VaultSecurityService';
import { VaultService } from '../services/VaultService';
import { ApiResponse, RequestContext } from '../types/http';

export class VaultController {
  constructor(
    private readonly vaultService: VaultService,
    private readonly vaultSecurityService: VaultSecurityService,
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
   */
  private async verifyAndConsumeNonce(ctx: RequestContext, providedNonce?: string): Promise<string> {
    const nonce = providedNonce || ctx.request.headers.get('X-Nonce') || '';
    if (!nonce || !this.nonceService.consumeNonce(nonce)) {
      await this.auditLogRepo.recordLog({
        userId: ctx.user?.userId || 'anonymous',
        username: ctx.user?.username || 'unknown',
        action: 'SECURITY_NONCE_VIOLATION',
        authMethod: 'Anti-Replay Nonce Chain',
        ipAddress: this.getClientIp(ctx),
        userAgent: this.getUserAgent(ctx),
        status: 'FAILED',
        details: 'Security violation: Nonce missing or invalid in vault operation. Session terminated.',
      });

      throw new Error(
        'SECURITY_NONCE_VIOLATION: Anti-replay nonce verification failed. Session terminated for security reasons.'
      );
    }

    const nextNonceInfo = this.nonceService.generateNonce();
    return nextNonceInfo.nonce;
  }

  public async getTicketKey(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as { vaultId?: string; nonce?: string };
    if (!body.vaultId) {
      throw new Error('BAD_REQUEST: Missing required vaultId');
    }

    const nextNonce = await this.verifyAndConsumeNonce(ctx, body.nonce);
    const serverTicketKey = await this.vaultSecurityService.getOrCreateTicketKey(
      userId,
      body.vaultId,
      ctx.env.MASTER_ENCRYPTION_KEY
    );

    const response: ApiResponse = {
      success: true,
      data: {
        serverTicketKey,
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

  public async requestUnlockTicket(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as { vaultId?: string; nonce?: string };
    if (!body.vaultId) {
      throw new Error('BAD_REQUEST: Missing required vaultId');
    }

    const nextNonce = await this.verifyAndConsumeNonce(ctx, body.nonce);
    const result = await this.vaultSecurityService.requestUnlockTicket(
      userId,
      body.vaultId,
      ctx.env.MASTER_ENCRYPTION_KEY
    );

    const response: ApiResponse = {
      success: true,
      data: {
        ...result,
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

  public async reportPinFailure(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as { vaultId?: string; nonce?: string };
    if (!body.vaultId) {
      throw new Error('BAD_REQUEST: Missing required vaultId');
    }

    const nextNonce = await this.verifyAndConsumeNonce(ctx, body.nonce);
    const result = await this.vaultSecurityService.reportPinFailure(userId, body.vaultId);

    await this.auditLogRepo.recordLog({
      userId,
      username: ctx.user?.username || 'unknown',
      action: 'MFA_VERIFY',
      authMethod: 'Vault PIN Envelope Verification',
      ipAddress: this.getClientIp(ctx),
      userAgent: this.getUserAgent(ctx),
      status: 'FAILED',
      details: `Incorrect vault PIN entered (fail count: ${result.failCount}). Lockout: ${result.remainingSeconds}s`,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        ...result,
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

  public async reportPinSuccess(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as { vaultId?: string; nonce?: string };
    if (!body.vaultId) {
      throw new Error('BAD_REQUEST: Missing required vaultId');
    }

    const nextNonce = await this.verifyAndConsumeNonce(ctx, body.nonce);
    await this.vaultSecurityService.reportPinSuccess(userId, body.vaultId);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'PIN successfully verified. Lockout status reset.',
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

    const arrayBuffer = await ctx.request.arrayBuffer();
    const updatedNode = await this.vaultService.updateFileContent(userId, nodeId, arrayBuffer, contentType);

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
