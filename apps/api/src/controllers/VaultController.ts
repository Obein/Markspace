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
    const body = (await ctx.request.json()) as { vaultId?: string };
    if (!body.vaultId) {
      throw new Error('BAD_REQUEST: Missing required vaultId');
    }

    await this.vaultSecurityService.reportPinSuccess(userId, body.vaultId);

    await this.auditLogRepo.recordLog({
      userId,
      username: ctx.user?.username || 'unknown',
      action: 'VAULT_OPRF_EVAL',
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

  // --- Merkle DAG CAS & Chunk Management ---

  public async checkMissingChunks(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as { chunkIds?: string[] };
    const chunkIds = body.chunkIds || [];

    const missingChunkIds = await this.vaultService.checkMissingChunks(userId, chunkIds);

    return new Response(
      JSON.stringify({
        success: true,
        data: { missingChunkIds },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async putChunk(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const chunkId = ctx.params.id;
    if (!chunkId) {
      throw new Error('BAD_REQUEST: Missing chunkId in route params');
    }

    const chunkData = await ctx.request.arrayBuffer();
    await this.vaultService.putChunk(userId, chunkId, chunkData);

    return new Response(
      JSON.stringify({
        success: true,
        data: { chunkId, size: chunkData.byteLength },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async getChunk(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const chunkId = ctx.params.id;
    if (!chunkId) {
      throw new Error('BAD_REQUEST: Missing chunkId in route params');
    }

    const chunkData = await this.vaultService.getChunk(userId, chunkId);

    return new Response(chunkData, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  public async commitManifest(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const manifestId = ctx.request.headers.get('X-Manifest-Id');
    const nodeId = ctx.request.headers.get('X-Node-Id');
    const parentManifestId = ctx.request.headers.get('X-Parent-Manifest-Id') || undefined;
    const plainSizeStr = ctx.request.headers.get('X-Plain-Size') || '0';
    const cipherSizeStr = ctx.request.headers.get('X-Cipher-Size') || '0';
    const commitMessageHeader = ctx.request.headers.get('X-Commit-Message');
    const commitMessage = commitMessageHeader ? decodeURIComponent(commitMessageHeader) : undefined;

    if (!manifestId || !nodeId) {
      throw new Error('BAD_REQUEST: Missing X-Manifest-Id or X-Node-Id headers');
    }

    const encryptedManifest = await ctx.request.arrayBuffer();

    await this.vaultService.commitManifest(userId, nodeId, manifestId, encryptedManifest, {
      parentManifestId,
      plainSize: parseInt(plainSizeStr, 10) || 0,
      cipherSize: parseInt(cipherSizeStr, 10) || encryptedManifest.byteLength,
      commitMessage,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: { manifestId, nodeId },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async commitSyncBundle(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const contentType = ctx.request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('BAD_REQUEST: Expected multipart/form-data content-type');
    }

    const formData = await ctx.request.formData();
    const metaStr = formData.get('meta');
    if (!metaStr || typeof metaStr !== 'string') {
      throw new Error('BAD_REQUEST: Missing meta JSON field in form-data');
    }

    const meta = JSON.parse(metaStr);
    const { nodeId, manifestId, parentManifestId, plainSize, cipherSize, commitMessage, chunkIds } = meta;

    if (!nodeId || !manifestId || !Array.isArray(chunkIds)) {
      throw new Error('BAD_REQUEST: Invalid bundle metadata: missing nodeId, manifestId, or chunkIds');
    }

    const manifestEntry = formData.get('manifest');
    if (!manifestEntry || typeof manifestEntry === 'string' || !('arrayBuffer' in manifestEntry)) {
      throw new Error('BAD_REQUEST: Missing encrypted manifest file in form-data');
    }

    const encryptedManifest = await (manifestEntry as Blob).arrayBuffer();

    // Extract all delta chunks from formData (keys matching `chunk_<chunkId>`)
    const incomingChunks: { id: string; data: ArrayBuffer }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('chunk_') && typeof value !== 'string' && 'arrayBuffer' in value) {
        const chunkId = key.substring('chunk_'.length);
        const chunkBuffer = await (value as Blob).arrayBuffer();
        incomingChunks.push({
          id: chunkId,
          data: chunkBuffer,
        });
      }
    }

    const result = await this.vaultService.commitSyncBundle(
      userId,
      nodeId,
      manifestId,
      encryptedManifest,
      {
        parentManifestId,
        plainSize: Number(plainSize) || 0,
        cipherSize: Number(cipherSize) || encryptedManifest.byteLength,
        commitMessage,
        chunkIds,
      },
      incomingChunks
    );

    if (!result.success && result.missingChunkIds && result.missingChunkIds.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'CHUNKS_MISSING',
            message: 'Integrity barrier: Missing referenced chunks in storage',
            missingChunkIds: result.missingChunkIds,
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          manifestId,
          nodeId,
          uploadedChunksCount: incomingChunks.length,
          manifest: result.manifest,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async getManifest(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const manifestId = ctx.params.id;
    if (!manifestId) {
      throw new Error('BAD_REQUEST: Missing manifestId in route params');
    }

    const manifestData = await this.vaultService.getManifest(userId, manifestId);

    return new Response(manifestData, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
  }

  public async getManifestHistory(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    if (!nodeId) {
      throw new Error('BAD_REQUEST: Missing nodeId in route params');
    }

    const history = await this.vaultService.getNodeManifestHistory(userId, nodeId);

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
}
