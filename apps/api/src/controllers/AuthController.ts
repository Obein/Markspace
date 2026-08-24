import { D1AuditLogRepository } from '../infrastructure/D1AuditLogRepository';
import { AuthService } from '../services/AuthService';
import { NonceService } from '../services/NonceService';
import { RequestContext } from '../types/http';
import { AuthSessionController } from './auth/AuthSessionController';
import { AuthCredentialController } from './auth/AuthCredentialController';
import { AuthTotpController } from './auth/AuthTotpController';

/**
 * AuthController
 * Unified HTTP Controller Facade for Authentication endpoints in Cloudflare Workers.
 *
 * Decomposes authentication domains across specialized sub-controllers:
 * - AuthSessionController: Nonce handshakes, refresh tokens, cookie headers, audit logs.
 * - AuthCredentialController: Prelogin, registration, password/passwordless logins.
 * - AuthTotpController: TOTP setup, verification, and deactivation.
 */
export class AuthController {
  private readonly sessionController: AuthSessionController;
  private readonly credentialController: AuthCredentialController;
  private readonly totpController: AuthTotpController;

  constructor(
    private readonly authService: AuthService,
    private readonly nonceService: NonceService,
    private readonly auditLogRepo: D1AuditLogRepository
  ) {
    this.sessionController = new AuthSessionController(this.authService, this.nonceService, this.auditLogRepo);
    this.credentialController = new AuthCredentialController(this.authService, this.auditLogRepo);
    this.totpController = new AuthTotpController(this.authService, this.auditLogRepo);
  }

  // ── Session & Nonce Endpoints ───────────────────────────────────────────────

  public async getNonce(ctx: RequestContext): Promise<Response> {
    return this.sessionController.getNonce(ctx);
  }

  public async refresh(ctx: RequestContext): Promise<Response> {
    return this.sessionController.refresh(ctx);
  }

  public async logout(ctx: RequestContext): Promise<Response> {
    return this.sessionController.logout(ctx);
  }

  public async getSessions(ctx: RequestContext): Promise<Response> {
    return this.sessionController.getSessions(ctx);
  }

  public async revokeSession(ctx: RequestContext): Promise<Response> {
    return this.sessionController.revokeSession(ctx);
  }

  public async revokeOtherSessions(ctx: RequestContext): Promise<Response> {
    return this.sessionController.revokeOtherSessions(ctx);
  }

  public async getAuditLogs(ctx: RequestContext): Promise<Response> {
    return this.sessionController.getAuditLogs(ctx);
  }

  // ── Credential & Login Endpoints ────────────────────────────────────────────

  public async prelogin(ctx: RequestContext): Promise<Response> {
    return this.credentialController.prelogin(ctx);
  }

  public async register(ctx: RequestContext): Promise<Response> {
    return this.credentialController.register(ctx);
  }

  public async login(ctx: RequestContext): Promise<Response> {
    return this.credentialController.login(ctx);
  }

  public async loginPasswordlessTotp(ctx: RequestContext): Promise<Response> {
    return this.credentialController.loginPasswordlessTotp(ctx);
  }

  // ── TOTP Endpoints ──────────────────────────────────────────────────────────

  public async setupTotp(ctx: RequestContext): Promise<Response> {
    return this.totpController.setupTotp(ctx);
  }

  public async enableTotp(ctx: RequestContext): Promise<Response> {
    return this.totpController.enableTotp(ctx);
  }

  public async disableTotp(ctx: RequestContext): Promise<Response> {
    return this.totpController.disableTotp(ctx);
  }
}
