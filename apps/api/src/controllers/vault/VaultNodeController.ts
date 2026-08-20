import { VaultService } from '../../services/VaultService';
import { ApiResponse, RequestContext } from '../../types/http';

/**
 * VaultNodeController
 * Handles hierarchical node CRUD, vault tree listing, content streaming, and moving.
 */
export class VaultNodeController {
  constructor(private readonly vaultService: VaultService) {}

  public async getTree(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const tree = await this.vaultService.getTree(userId);

    const response: ApiResponse = {
      success: true,
      data: tree,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async createNode(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const body = (await ctx.request.json()) as {
      path: string;
      name: string;
      isDirectory: boolean;
      size?: number;
      mimeType?: string;
      category?: 'markdown' | 'image' | 'audio' | 'video' | 'binary';
      encryptedDek: string;
    };

    if (!body.path || !body.name || body.isDirectory === undefined || !body.encryptedDek) {
      throw new Error('BAD_REQUEST: Missing required fields (path, name, isDirectory, encryptedDek)');
    }

    const node = await this.vaultService.createNode(userId, {
      path: body.path,
      name: body.name,
      isDirectory: body.isDirectory,
      size: body.size,
      mimeType: body.mimeType,
      category: body.category,
      encryptedDek: body.encryptedDek,
    });

    const response: ApiResponse = {
      success: true,
      data: node,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async getContent(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    if (!nodeId) {
      throw new Error('BAD_REQUEST: Missing node ID in URL path');
    }

    const node = await this.vaultService.getNode(userId, nodeId);
    const content = await this.vaultService.getContent(userId, nodeId);

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': node.mimeType || 'application/octet-stream',
        'X-Node-Id': node.id,
        'X-Encrypted-Dek': node.encryptedDek,
      },
    });
  }

  public async updateContent(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    if (!nodeId) {
      throw new Error('BAD_REQUEST: Missing node ID in URL path');
    }

    const mimeType = ctx.request.headers.get('Content-Type') || 'application/octet-stream';
    const encryptedDek = ctx.request.headers.get('X-Encrypted-Dek') || undefined;
    const bodyBuffer = await ctx.request.arrayBuffer();

    const updatedNode = await this.vaultService.updateNodeContent(
      userId,
      nodeId,
      bodyBuffer,
      mimeType,
      encryptedDek
    );

    const response: ApiResponse = {
      success: true,
      data: updatedNode,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async deleteNode(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    if (!nodeId) {
      throw new Error('BAD_REQUEST: Missing node ID in URL path');
    }

    await this.vaultService.deleteNode(userId, nodeId);

    const response: ApiResponse = {
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public async moveNode(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;
    const body = (await ctx.request.json()) as { targetPath?: string; newPath?: string; id?: string };
    const effectiveNodeId = nodeId || body.id;
    const newPath = body.targetPath || body.newPath;

    if (!effectiveNodeId || !newPath) {
      throw new Error('BAD_REQUEST: Missing nodeId or targetPath/newPath');
    }

    const updatedNode = await this.vaultService.moveNode(userId, effectiveNodeId, newPath);

    const response: ApiResponse = {
      success: true,
      data: updatedNode,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
