import { D1AuditLogRepository } from '../infrastructure/D1AuditLogRepository';
import { VaultSecurityService } from '../services/VaultSecurityService';
import { VaultService } from '../services/VaultService';
import { RequestContext } from '../types/http';
import { VaultOprfController } from './vault/VaultOprfController';
import { VaultNodeController } from './vault/VaultNodeController';
import { VaultVersionController } from './vault/VaultVersionController';
import { VaultMerkleController } from './vault/VaultMerkleController';

/**
 * VaultController
 * Unified HTTP Controller Facade for Vault endpoints in Cloudflare Workers.
 *
 * Decomposes domain endpoints across specialized sub-controllers:
 * - VaultOprfController: OPRF rate-limiting & unlock gates.
 * - VaultNodeController: Hierarchical node CRUD and content streams.
 * - VaultVersionController: Snapshot version history.
 * - VaultMerkleController: Content-Addressed Storage chunks & Merkle DAG manifests.
 */
export class VaultController {
  private readonly oprfController: VaultOprfController;
  private readonly nodeController: VaultNodeController;
  private readonly versionController: VaultVersionController;
  private readonly merkleController: VaultMerkleController;

  constructor(
    private readonly vaultService: VaultService,
    private readonly vaultSecurityService: VaultSecurityService,
    private readonly auditLogRepo: D1AuditLogRepository
  ) {
    this.oprfController = new VaultOprfController(this.vaultSecurityService, this.auditLogRepo);
    this.nodeController = new VaultNodeController(this.vaultService);
    this.versionController = new VaultVersionController(this.vaultService);
    this.merkleController = new VaultMerkleController(this.vaultService);
  }

  // ── OPRF & Security Endpoints ───────────────────────────────────────────────

  public async setupOprf(ctx: RequestContext): Promise<Response> {
    return this.oprfController.setupOprf(ctx);
  }

  public async evaluateOprf(ctx: RequestContext): Promise<Response> {
    return this.oprfController.evaluateOprf(ctx);
  }

  public async reportPinSuccess(ctx: RequestContext): Promise<Response> {
    return this.oprfController.reportPinSuccess(ctx);
  }

  // ── Node & Tree Endpoints ───────────────────────────────────────────────────

  public async getTree(ctx: RequestContext): Promise<Response> {
    return this.nodeController.getTree(ctx);
  }

  public async createNode(ctx: RequestContext): Promise<Response> {
    return this.nodeController.createNode(ctx);
  }

  public async getContent(ctx: RequestContext): Promise<Response> {
    return this.nodeController.getContent(ctx);
  }

  public async updateContent(ctx: RequestContext): Promise<Response> {
    return this.nodeController.updateContent(ctx);
  }

  public async deleteNode(ctx: RequestContext): Promise<Response> {
    return this.nodeController.deleteNode(ctx);
  }

  public async moveNode(ctx: RequestContext): Promise<Response> {
    return this.nodeController.moveNode(ctx);
  }

  // ── Snapshot Versioning Endpoints ───────────────────────────────────────────

  public async getNodeHistory(ctx: RequestContext): Promise<Response> {
    return this.versionController.getNodeHistory(ctx);
  }

  public async getVersionContent(ctx: RequestContext): Promise<Response> {
    return this.versionController.getVersionContent(ctx);
  }

  public async revertNodeVersion(ctx: RequestContext): Promise<Response> {
    return this.versionController.revertNodeVersion(ctx);
  }

  // ── Merkle DAG CAS & Manifest Endpoints ─────────────────────────────────────

  public async checkMissingChunks(ctx: RequestContext): Promise<Response> {
    return this.merkleController.checkMissingChunks(ctx);
  }

  public async putChunk(ctx: RequestContext): Promise<Response> {
    return this.merkleController.putChunk(ctx);
  }

  public async getChunk(ctx: RequestContext): Promise<Response> {
    return this.merkleController.getChunk(ctx);
  }

  public async commitManifest(ctx: RequestContext): Promise<Response> {
    return this.merkleController.commitManifest(ctx);
  }

  public async commitSyncBundle(ctx: RequestContext): Promise<Response> {
    return this.merkleController.commitSyncBundle(ctx);
  }

  public async getManifest(ctx: RequestContext): Promise<Response> {
    return this.merkleController.getManifest(ctx);
  }

  public async getManifestHistory(ctx: RequestContext): Promise<Response> {
    return this.merkleController.getManifestHistory(ctx);
  }
}
