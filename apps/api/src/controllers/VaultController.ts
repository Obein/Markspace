import { VaultService } from '../services/VaultService';
import { RequestContext } from '../types/http';

export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

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

  public async getNode(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;

    const node = await this.vaultService.getNode(userId, nodeId);

    return new Response(
      JSON.stringify({
        success: true,
        data: node,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  public async getContent(ctx: RequestContext): Promise<Response> {
    const userId = ctx.user!.userId;
    const nodeId = ctx.params.id;

    const { node, body, contentType } = await this.vaultService.getFileContent(userId, nodeId);

    return new Response(body as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-Encrypted-DEK': node.encryptedDek,
        'X-File-Name': encodeURIComponent(node.name),
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
