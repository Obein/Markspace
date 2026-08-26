import { ServiceContainer } from '../container/ServiceContainer';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { AdminMiddleware } from '../middleware/AdminMiddleware';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { SecurityHeadersMiddleware } from '../middleware/SecurityHeadersMiddleware';
import { Env } from '../types/env';
import { RequestContext } from '../types/http';
import { DPoPVerifier } from '../services/DPoPVerifier';

export class Router {
  private routes: Array<{
    method: string;
    pattern: RegExp;
    paramNames: string[];
    requiresAuth: boolean;
    requiresAdmin: boolean;
    handler: (container: ServiceContainer, ctx: RequestContext) => Promise<Response>;
  }> = [];

  constructor() {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // 0. System Capabilities (Public)
    this.addRoute('GET', '/api/v1/system/capabilities', false, false, async (_container, ctx) => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            r2Available: Boolean(ctx.env.BUCKET),
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    // 1. Auth & Session Endpoints
    this.addRoute('GET', '/api/v1/auth/nonce', false, false, (container, ctx) =>
      container.authController.getNonce(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/prelogin', false, false, (container, ctx) =>
      container.authController.prelogin(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/register', false, false, (container, ctx) =>
      container.authController.register(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/login', false, false, (container, ctx) =>
      container.authController.login(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/login/passwordless-totp', false, false, (container, ctx) =>
      container.authController.loginPasswordlessTotp(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/refresh', false, false, (container, ctx) =>
      container.authController.refresh(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/logout', false, false, (container, ctx) =>
      container.authController.logout(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/totp/setup', true, false, (container, ctx) =>
      container.authController.setupTotp(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/totp/enable', true, false, (container, ctx) =>
      container.authController.enableTotp(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/totp/disable', true, false, (container, ctx) =>
      container.authController.disableTotp(ctx)
    );
    this.addRoute('GET', '/api/v1/auth/audit-logs', true, false, (container, ctx) =>
      container.authController.getAuditLogs(ctx)
    );
    this.addRoute('GET', '/api/v1/auth/sessions', true, false, (container, ctx) =>
      container.authController.getSessions(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/sessions/revoke-others', true, false, (container, ctx) =>
      container.authController.revokeOtherSessions(ctx)
    );
    this.addRoute('POST', '/api/v1/auth/sessions/:id/revoke', true, false, (container, ctx) =>
      container.authController.revokeSession(ctx)
    );
    this.addRoute('DELETE', '/api/v1/auth/sessions/:id', true, false, (container, ctx) =>
      container.authController.revokeSession(ctx)
    );

    // 2. Legacy Notes Endpoints (Protected)
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
    this.addRoute('PATCH', '/api/v1/vault/nodes/:id/move', true, false, (container, ctx) =>
      container.vaultController.moveNode(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/nodes/:id/move', true, false, (container, ctx) =>
      container.vaultController.moveNode(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/nodes/move', true, false, (container, ctx) =>
      container.vaultController.moveNode(ctx)
    );

    // 4.1 Vault Multi-Factor OPRF Security & Zero-Trust Gate (Protected)
    this.addRoute('POST', '/api/v1/vault/oprf/setup', true, false, (container, ctx) =>
      container.vaultController.setupOprf(ctx)
    );
    this.addRoute('POST', '/api/v1/vaults/:vaultId/oprf/setup', true, false, (container, ctx) =>
      container.vaultController.setupOprf(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/oprf/evaluate', true, false, (container, ctx) =>
      container.vaultController.evaluateOprf(ctx)
    );
    this.addRoute('POST', '/api/v1/vaults/:vaultId/oprf/evaluate-pin', true, false, (container, ctx) =>
      container.vaultController.evaluateOprf(ctx)
    );
    this.addRoute('POST', '/api/v1/vaults/:vaultId/oprf/evaluate-recovery', true, false, (container, ctx) =>
      container.vaultController.evaluateOprf(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/report-success', true, false, (container, ctx) =>
      container.vaultController.reportPinSuccess(ctx)
    );
    this.addRoute('POST', '/api/v1/vaults/:vaultId/pin/success', true, false, (container, ctx) =>
      container.vaultController.reportPinSuccess(ctx)
    );
    this.addRoute('POST', '/api/v1/vaults/:vaultId/pin/fail', true, false, (container, ctx) =>
      container.vaultController.evaluateOprf(ctx)
    );

    // 4.2 Third-Party Storage Endpoints (Protected)
    this.addRoute('GET', '/api/v1/vaults/:vaultId/storage-config', true, false, (container, ctx) =>
      container.vaultController.getStorageConfig(ctx)
    );
    this.addRoute('PUT', '/api/v1/vaults/:vaultId/storage-config', true, false, (container, ctx) =>
      container.vaultController.saveStorageConfig(ctx)
    );
    this.addRoute('DELETE', '/api/v1/vaults/:vaultId/storage-config', true, false, (container, ctx) =>
      container.vaultController.deleteStorageConfig(ctx)
    );

    // 5. Version History & Merkle Manifest Endpoints (Protected)
    this.addRoute('GET', '/api/v1/vault/nodes/:id/versions', true, false, (container, ctx) =>
      container.vaultController.getNodeHistory(ctx)
    );
    this.addRoute('GET', '/api/v1/vault/nodes/:id/history', true, false, (container, ctx) =>
      container.vaultController.getNodeHistory(ctx)
    );
    this.addRoute('GET', '/api/v1/vault/nodes/:id/versions/:timestamp/content', true, false, (container, ctx) =>
      container.vaultController.getVersionContent(ctx)
    );
    this.addRoute('GET', '/api/v1/vault/nodes/:id/history/:timestamp/content', true, false, (container, ctx) =>
      container.vaultController.getVersionContent(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/nodes/:id/versions/revert', true, false, (container, ctx) =>
      container.vaultController.revertNodeVersion(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/nodes/:id/history/:timestamp/revert', true, false, (container, ctx) =>
      container.vaultController.revertNodeVersion(ctx)
    );

    // 5.1 Content-Addressed Chunks (CAS) & Merkle Manifest Routes (Protected)
    this.addRoute('POST', '/api/v1/vault/chunks/check-missing', true, false, (container, ctx) =>
      container.vaultController.checkMissingChunks(ctx)
    );
    this.addRoute('PUT', '/api/v1/vault/chunks/:id', true, false, (container, ctx) =>
      container.vaultController.putChunk(ctx)
    );
    this.addRoute('GET', '/api/v1/vault/chunks/:id', true, false, (container, ctx) =>
      container.vaultController.getChunk(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/manifests/commit', true, false, (container, ctx) =>
      container.vaultController.commitManifest(ctx)
    );
    this.addRoute('POST', '/api/v1/vault/sync/commit-bundle', true, false, (container, ctx) =>
      container.vaultController.commitSyncBundle(ctx)
    );
    this.addRoute('GET', '/api/v1/vault/manifests/:id', true, false, (container, ctx) =>
      container.vaultController.getManifest(ctx)
    );
    this.addRoute('GET', '/api/v1/vault/manifests/:id/history', true, false, (container, ctx) =>
      container.vaultController.getManifestHistory(ctx)
    );
    this.addRoute('GET', '/api/v1/vault/nodes/:id/manifests', true, false, (container, ctx) =>
      container.vaultController.getManifestHistory(ctx)
    );

    // 6. RBAC Admin Endpoints (Admin Only)
    this.addRoute('GET', '/api/v1/admin/users', true, true, (container, ctx) =>
      container.adminController.listUsers(ctx)
    );
    this.addRoute('DELETE', '/api/v1/admin/users/:id', true, true, (container, ctx) =>
      container.adminController.deleteUser(ctx)
    );
    this.addRoute('PUT', '/api/v1/admin/users/:id/role', true, true, (container, ctx) =>
      container.adminController.updateUserRole(ctx)
    );
    this.addRoute('PUT', '/api/v1/admin/users/:id/quota', true, true, (container, ctx) =>
      container.adminController.updateUserQuota(ctx)
    );
    this.addRoute('GET', '/api/v1/admin/settings', true, true, (container, ctx) =>
      container.adminController.getSystemSettings(ctx)
    );
    this.addRoute('PUT', '/api/v1/admin/settings', true, true, (container, ctx) =>
      container.adminController.updateSystemSettings(ctx)
    );
    this.addRoute('POST', '/api/v1/admin/maintenance/cleanup-idle-users', true, true, (container, ctx) =>
      container.adminController.cleanupIdleUsers(ctx)
    );
  }

  private addRoute(
    method: string,
    pathPattern: string,
    requiresAuth: boolean,
    requiresAdmin: boolean = false,
    handler: (container: ServiceContainer, ctx: RequestContext) => Promise<Response>
  ): void {
    const paramNames: string[] = [];
    const patternString = pathPattern.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
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
    const origin = request.headers.get('Origin');
    const clientIp =
      request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For') ||
      '127.0.0.1';

    if (method === 'OPTIONS') {
      const corsRes = this.handleCorsOptions(origin);
      corsRes.headers.set('X-Client-IP', clientIp);
      return corsRes;
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

        // Authenticate if required or if Authorization header is present (to populate user context for nonce binding)
        const authHeader = request.headers.get('Authorization');
        if (route.requiresAuth || (authHeader && authHeader.startsWith('Bearer '))) {
          try {
            const authMiddleware = new AuthMiddleware(container.tokenService);
            const authedCtx = await authMiddleware.authenticate(ctx);
            Object.assign(ctx, authedCtx);
          } catch (authErr) {
            if (route.requiresAuth) {
              throw authErr;
            }
          }

          if (route.requiresAdmin) {
            AdminMiddleware.authorize(ctx);
          }
        }

        // AOP Aspect 1: Anti-Replay Nonce Verification (Fail-Closed)
        const isNonceExempt =
          path === '/api/v1/auth/nonce' ||
          path === '/api/v1/system/capabilities';

        if (!isNonceExempt && path.startsWith('/api/v1/')) {
          const requestNonce = request.headers.get('X-Nonce');
          if (!requestNonce) {
            // Fail-closed for all protected or state-modifying routes
            if (route.requiresAuth || method !== 'GET') {
              throw new Error('SECURITY_NONCE_VIOLATION: Anti-replay X-Nonce header is strictly required');
            }
          } else {
            const validation = container.nonceService.consumeNonce(requestNonce, ctx.user?.userId);
            if (!validation.valid) {
              const isReuse = validation.reason === 'REUSE_LOCKOUT';
              await container.auditLogRepository.recordLog({
                userId: ctx.user?.userId || 'anonymous',
                username: ctx.user?.username || 'unknown',
                action: 'SECURITY_NONCE_VIOLATION',
                authMethod: 'AOP Nonce Interceptor',
                ipAddress: clientIp,
                userAgent: request.headers.get('User-Agent') || 'Unknown Client',
                status: 'FAILED',
                details: isReuse
                  ? `Security circuit breaker triggered: Nonce '${requestNonce}' reuse attempt detected. Immediate session lockout.`
                  : `Security violation: Nonce '${requestNonce}' failed verification (${validation.reason}). Session terminated.`,
              });

              throw new Error(
                isReuse
                  ? 'SECURITY_NONCE_VIOLATION: Nonce reuse detected. Security circuit breaker triggered. Session terminated.'
                  : `SECURITY_NONCE_VIOLATION: Anti-replay nonce verification failed. Session terminated.`
              );
            }
          }
        }

        // Security headers & zero-trust DPoP checks (Fail-Closed)
        const dpopProof = request.headers.get('DPoP');
        if (dpopProof) {
          try {
            await DPoPVerifier.verifyProof(dpopProof, method, path);
          } catch (dpopErr: any) {
            throw new Error(`UNAUTHORIZED: DPoP proof verification failed (${dpopErr?.message || 'Invalid proof'})`);
          }
        }

        const response = await route.handler(container, ctx);

        // AOP Aspect 2: Dynamic Next-Nonce Header Injection (After Advice)
        const nextNonce = container.nonceService.generateNonce(ctx.user?.userId).nonce;
        response.headers.set('X-Next-Nonce', nextNonce);
        response.headers.set('X-Client-IP', clientIp);

        return SecurityHeadersMiddleware.applyHeaders(response, origin);
      }

      const notFoundRes = new Response(
        JSON.stringify({
          success: false,
          error: { code: 'NOT_FOUND', message: `Route not found: ${method} ${path}` },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      notFoundRes.headers.set('X-Client-IP', clientIp);
      return SecurityHeadersMiddleware.applyHeaders(notFoundRes, origin);
    } catch (error) {
      const response = ErrorHandler.handle(error);
      const container = new ServiceContainer(env);
      const nextNonce = container.nonceService.generateNonce().nonce;
      response.headers.set('X-Next-Nonce', nextNonce);
      response.headers.set('X-Client-IP', clientIp);
      return SecurityHeadersMiddleware.applyHeaders(response, origin);
    }
  }

  private handleCorsOptions(origin?: string | null): Response {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, DPoP, X-Nonce',
      'Access-Control-Expose-Headers':
        'X-Next-Nonce, DPoP, Set-Cookie, X-Encrypted-DEK, X-Commit-Hash, Content-Disposition, X-Client-IP',
    };
    if (origin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers['Vary'] = 'Origin';
    }

    return SecurityHeadersMiddleware.applyHeaders(
      new Response(null, {
        status: 204,
        headers,
      }),
      origin
    );
  }
}
