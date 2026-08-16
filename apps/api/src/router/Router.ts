import { ServiceContainer } from '../container/ServiceContainer';
import { AdminMiddleware } from '../middleware/AdminMiddleware';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { SecurityHeadersMiddleware } from '../middleware/SecurityHeadersMiddleware';
import { DPoPVerifier } from '../services/DPoPVerifier';
import { Env } from '../types/env';
import { RequestContext } from '../types/http';

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  requiresAuth: boolean;
  requiresAdmin?: boolean;
  handler: (container: ServiceContainer, ctx: RequestContext) => Promise<Response>;
}

export class Router {
  private readonly routes: Route[] = [];

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // 0. System & Health Check Endpoints
    this.addRoute('GET', '/api/v1/health', false, false, async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: { status: 'healthy', name: 'Markspace API' },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    // 1. Auth & Nonce Endpoints (Public)
    this.addRoute('GET', '/api/v1/auth/nonce', false, false, (container, ctx) =>
      container.authController.getNonce(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/register', false, false, (container, ctx) =>
      container.authController.register(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/login', false, false, (container, ctx) =>
      container.authController.login(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/logout', true, false, (container, ctx) =>
      container.authController.logout(ctx)
    );
    this.addRoute('GET', '/api/v1/auth/audit-logs', true, false, (container, ctx) =>
      container.authController.getAuditLogs(ctx)
    );

    // 2. Note Endpoints (Protected)
    this.addRoute('GET', '/api/v1/notes', true, false, (container, ctx) =>
      container.noteController.listNotes(ctx)
    );
    this.addRoute('POST', '/api/v1/notes', true, false, (container, ctx) =>
      container.noteController.createNote(ctx)
    );
    this.addRoute('GET', '/api/v1/notes/:id', true, false, (container, ctx) =>
      container.noteController.getNote(ctx)
    );
    this.addRoute('PUT', '/api/v1/notes/:id', true, false, (container, ctx) =>
      container.noteController.updateNote(ctx)
    );
    this.addRoute('DELETE', '/api/v1/notes/:id', true, false, (container, ctx) =>
      container.noteController.deleteNote(ctx)
    );

    // 3. Media Endpoints (Protected)
    this.addRoute('POST', '/api/v1/media/upload-url', true, false, (container, ctx) =>
      container.mediaController.prepareUpload(ctx)
    );
    this.addRoute('PUT', '/api/v1/media/:id/content', true, false, (container, ctx) =>
      container.mediaController.uploadContent(ctx)
    );
    this.addRoute('GET', '/api/v1/media/:id/content', true, false, (container, ctx) =>
      container.mediaController.getMedia(ctx)
    );

    // 4. Object Storage & Vault Node Tree Endpoints (Protected)
    this.addRoute('GET', '/api/v1/vault/tree', true, false, (container, ctx) =>
      container.vaultController.getTree(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/nodes', true, false, (container, ctx) =>
      container.vaultController.createNode(ctx)
    );
    this.addRoute('GET', '/api/v1/vault/nodes/:id/content', true, false, (container, ctx) =>
      container.vaultController.getContent(ctx)
    );
    this.addRoute('PUT', '/api/v1/vault/nodes/:id/content', true, false, (container, ctx) =>
      container.vaultController.updateContent(ctx)
    );
    this.addRoute('DELETE', '/api/v1/vault/nodes/:id', true, false, (container, ctx) =>
      container.vaultController.deleteNode(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/nodes/move', true, false, (container, ctx) =>
      container.vaultController.moveNode(ctx)
    );

    // 4.1 Git Version Control & History Endpoints (Protected)
    this.addRoute('GET', '/api/v1/vault/nodes/:id/history', true, false, (container, ctx) =>
      container.vaultController.getNodeHistory(ctx)
    );
    this.addRoute('GET', '/api/v1/vault/nodes/:id/versions/:timestamp', true, false, (container, ctx) =>
      container.vaultController.getVersionContent(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/nodes/:id/revert', true, false, (container, ctx) =>
      container.vaultController.revertNodeVersion(ctx)
    );

    // 5. Admin Management Endpoints (Admin Only)
    this.addRoute('GET', '/api/v1/admin/users', true, true, (container, ctx) =>
      container.adminController.listUsers(ctx)
    );
    this.addRoute('PUT', '/api/v1/admin/users/:id/role', true, true, (container, ctx) =>
      container.adminController.updateUserRole(ctx)
    );
  }

  private addRoute(
    method: string,
    path: string,
    requiresAuth: boolean,
    requiresAdmin: boolean,
    handler: (container: ServiceContainer, ctx: RequestContext) => Promise<Response>
  ): void {
    const paramNames: string[] = [];
    const patternString = path.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    this.routes.push({
      method,
      pattern: new RegExp(`^${patternString}$`),
      paramNames,
      requiresAuth,
      requiresAdmin,
      handler,
    });
  }

  public async handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return this.handleCorsOptions();
    }

    try {
      for (const route of this.routes) {
        if (route.method !== method) continue;

        const match = path.match(route.pattern);
        if (!match) continue;

        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        const ctx: RequestContext = {
          request,
          env,
          params,
        };

        const container = new ServiceContainer(env);

        // Security headers & zero-trust checks
        const dpopProof = request.headers.get('DPoP');
        if (dpopProof) {
          try {
            await DPoPVerifier.verifyProof(dpopProof, method, path);
          } catch (dpopErr) {
            console.warn('DPoP proof verification warning:', dpopErr);
          }
        }

        if (route.requiresAuth) {
          const authMiddleware = new AuthMiddleware(container.tokenService);
          const authedCtx = await authMiddleware.authenticate(ctx);
          Object.assign(ctx, authedCtx);

          if (route.requiresAdmin) {
            AdminMiddleware.authorize(ctx);
          }
        }

        const response = await route.handler(container, ctx);
        return SecurityHeadersMiddleware.applyHeaders(response);
      }

      return SecurityHeadersMiddleware.applyHeaders(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: `Route not found: ${method} ${path}` },
            timestamp: new Date().toISOString(),
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );
    } catch (error) {
      const response = ErrorHandler.handle(error);
      return SecurityHeadersMiddleware.applyHeaders(response);
    }
  }

  private handleCorsOptions(): Response {
    return SecurityHeadersMiddleware.applyHeaders(
      new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, DPoP, X-Nonce',
          'Access-Control-Allow-Credentials': 'true',
        },
      })
    );
  }
}
