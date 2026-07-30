import { ServiceContainer } from '../container/ServiceContainer';
import { AdminMiddleware } from '../middleware/AdminMiddleware';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { ErrorHandler } from '../middleware/ErrorHandler';
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

    // 1. Auth Endpoints (Public)
    this.addRoute('POST', '/api/v1/auth/register', false, false, (container, ctx) =>
      container.authController.register(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/login', false, false, (container, ctx) =>
      container.authController.login(ctx)
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
    this.addRoute('GET', '/api/v1/media/:id', true, false, (container, ctx) =>
      container.mediaController.getMedia(ctx)
    );

    // 4. Admin Endpoints (Protected + Admin Only)
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
    const regexPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
      paramNames.push(key);
      return '([^/]+)';
    });

    const pattern = new RegExp(`^${regexPath}$`);
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      paramNames,
      requiresAuth,
      requiresAdmin,
      handler,
    });
  }

  async handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // Global CORS Preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Encrypted-DEK',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const container = new ServiceContainer(env);

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, idx) => {
          params[name] = decodeURIComponent(match[idx + 1]);
        });

        let ctx: RequestContext = {
          request,
          env,
          params,
        };

        try {
          if (route.requiresAuth) {
            const authMiddleware = new AuthMiddleware(container.tokenService);
            ctx = await authMiddleware.authenticate(ctx);
          }

          if (route.requiresAdmin) {
            AdminMiddleware.authorize(ctx);
          }

          const response = await route.handler(container, ctx);

          const headers = new Headers(response.headers);
          headers.set('Access-Control-Allow-Origin', '*');
          headers.set('Access-Control-Expose-Headers', 'X-Encrypted-DEK, X-File-Name');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        } catch (error) {
          return ErrorHandler.handle(error);
        }
      }
    }

    // Static Asset Fallback
    if (env.ASSETS && !pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    return ErrorHandler.handle(new Error('NOT_FOUND: Endpoint not found'));
  }
}
