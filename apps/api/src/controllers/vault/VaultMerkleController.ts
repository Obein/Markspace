import { VaultService } from '../../services/VaultService';
import { RequestContext } from '../../types/http';

/**
 * VaultMerkleController
 * Handles Content-Addressed Storage (CAS) chunks, Merkle DAG manifests, and atomic bundle commits.
 */
export class VaultMerkleController {
  constructor(private readonly vaultService: VaultService) {}

  public async checkMissingChunks(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json().catch(() => ({}))) as { chunkIds?: string[] };
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
