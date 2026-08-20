import { VaultService } from '../../services/VaultService';
import { ApiResponse, RequestContext } from '../../types/http';

/**
 * VaultVersionController
 * Handles snapshot-based version creation, history listing, and version content recovery.
 */
export class VaultVersionController {
  constructor(private readonly vaultService: VaultService) {}

  public async getNodeHistory(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    if (!nodeId) {
      throw new Error('BAD_REQUEST: Missing node ID in URL path');
    }

    const versions = await this.vaultService.listVersions(userId, nodeId);

    const response: ApiResponse = {
      success: true,
      data: versions,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async getVersionContent(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    const timestampStr = ctx.params.timestamp;

    if (!nodeId || !timestampStr) {
      throw new Error('BAD_REQUEST: Missing node ID or timestamp in URL path');
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      throw new Error('BAD_REQUEST: Invalid timestamp parameter');
    }

    const { version, body } = await this.vaultService.getVersionContent(userId, nodeId, timestamp);

    if (body) {
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'X-Node-Id': version.nodeId,
          'X-Version-Id': version.id,
          'X-Commit-Hash': version.commitHash,
          'X-Encrypted-Dek': version.encryptedDek,
        },
      });
    }

    const response: ApiResponse = {
      success: true,
      data: version,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async revertNodeVersion(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    let timestamp = ctx.params.timestamp ? parseInt(ctx.params.timestamp, 10) : undefined;
    if (!timestamp || isNaN(timestamp)) {
      const body = (await ctx.request.json().catch(() => ({}))) as any;
      if (body?.timestamp && typeof body.timestamp === 'number') {
        timestamp = body.timestamp;
      }
    }

    if (!timestamp || isNaN(timestamp)) {
      throw new Error('BAD_REQUEST: Missing valid numeric timestamp in request params or body');
    }

    const updatedNode = await this.vaultService.revertNodeToVersion(userId, nodeId, timestamp);

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
