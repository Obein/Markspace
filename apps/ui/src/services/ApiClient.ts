import {
  AuditLogResponse,
  AuthResponse,
  IApiClient,
  NodeVersionResponse,
  SystemConfig,
  UserAdminSummary,
  UserRole,
  VaultNodeResponse,
} from '../interfaces/IApiClient';
import { FileCategory, NoteItem, NoteMetadataItem } from '../interfaces/INoteModels';
import { AdminApi, AuthApi, HttpTransport, NotesApi, VaultNodeApi, VaultOprfApi } from './api';

/**
 * ApiClient Facade
 * 
 * Orchestrates domain-specific API clients (Auth, Vault OPRF, Vault Nodes/CAS, Notes, Admin)
 * while maintaining backward compatibility with the unified IApiClient interface.
 */
export class ApiClient implements IApiClient {
  public readonly transport: HttpTransport;
  public readonly auth: AuthApi;
  public readonly vaultOprf: VaultOprfApi;
  public readonly vaultNodes: VaultNodeApi;
  public readonly notes: NotesApi;
  public readonly admin: AdminApi;

  constructor(baseUrl: string = '/api/v1') {
    this.transport = new HttpTransport(baseUrl);
    this.auth = new AuthApi(this.transport);
    this.vaultOprf = new VaultOprfApi(this.transport);
    this.vaultNodes = new VaultNodeApi(this.transport);
    this.notes = new NotesApi(this.transport);
    this.admin = new AdminApi(this.transport);
  }

  // --- Core Transport & Session Lifecycle ---

  setToken(token: string, expiresInSeconds = 60): void {
    this.transport.setToken(token, expiresInSeconds);
  }

  getAccessToken(): string | null {
    return this.transport.getAccessToken();
  }

  setOnForceLogout(callback: (reason: string) => void): void {
    this.transport.setOnForceLogout(callback);
  }

  // --- Auth & TOTP API ---

  async initSession(): Promise<AuthResponse | null> {
    return this.auth.initSession();
  }

  async refreshToken(): Promise<AuthResponse> {
    return this.auth.refreshToken();
  }

  async prelogin(username: string): Promise<{ exists: boolean; isTotpEnabled: boolean; serverTime: number }> {
    return this.auth.prelogin(username);
  }

  async register(username: string, authToken: string): Promise<AuthResponse> {
    return this.auth.register(username, authToken);
  }

  async login(username: string, authToken: string, totpCode?: string): Promise<AuthResponse> {
    return this.auth.login(username, authToken, totpCode);
  }

  async loginPasswordlessTotp(username: string, totpCode: string): Promise<AuthResponse> {
    return this.auth.loginPasswordlessTotp(username, totpCode);
  }

  async logout(): Promise<void> {
    return this.auth.logout();
  }

  async setupTotp(): Promise<{ secret: string; otpauthUri: string; expiresAt: number }> {
    return this.auth.setupTotp();
  }

  async enableTotp(secret: string, code: string): Promise<{ message: string }> {
    return this.auth.enableTotp(secret, code);
  }

  async disableTotp(code: string): Promise<{ message: string }> {
    return this.auth.disableTotp(code);
  }

  async getAuditLogs(): Promise<AuditLogResponse[]> {
    return this.auth.getAuditLogs();
  }

  // --- Zero-Knowledge OPRF API ---

  async setupVaultOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.vaultOprf.setupVaultOprf(vaultId, blindedElement);
  }

  async evaluateVaultOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.vaultOprf.evaluateVaultOprf(vaultId, blindedElement);
  }

  async evaluateVaultPinOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.vaultOprf.evaluateVaultPinOprf(vaultId, blindedElement);
  }

  async evaluateVaultRecoveryOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.vaultOprf.evaluateVaultRecoveryOprf(vaultId, blindedElement);
  }

  async reportVaultPinFailure(
    vaultId: string
  ): Promise<{ remainingAttempts: number; lockoutUntil: number; serverTime: number }> {
    return this.vaultOprf.reportVaultPinFailure(vaultId);
  }

  async reportVaultPinSuccess(vaultId: string): Promise<void> {
    return this.vaultOprf.reportVaultPinSuccess(vaultId);
  }

  // --- Vault Nodes, Merkle CAS & Version Control API ---

  async getVaultTree(): Promise<VaultNodeResponse[]> {
    return this.vaultNodes.getVaultTree();
  }

  async createVaultNode(node: {
    id?: string;
    path: string;
    parentPath?: string;
    name: string;
    isDirectory: boolean;
    encryptedDek: string;
    size?: number;
    mimeType?: string;
    category?: FileCategory;
    contentBlob?: ArrayBuffer | Uint8Array | string;
    activeManifestId?: string | null;
  }): Promise<VaultNodeResponse> {
    return this.vaultNodes.createVaultNode(node);
  }

  async getVaultNodeContent(id: string): Promise<{ body: ArrayBuffer; encryptedDek: string; fileName: string }> {
    return this.vaultNodes.getVaultNodeContent(id);
  }

  async updateVaultNodeContent(
    id: string,
    contentBlob: ArrayBuffer | Uint8Array | Blob,
    mimeType?: string,
    encryptedDek?: string
  ): Promise<VaultNodeResponse> {
    return this.vaultNodes.updateVaultNodeContent(id, contentBlob, mimeType, encryptedDek);
  }

  async deleteVaultNode(id: string): Promise<void> {
    return this.vaultNodes.deleteVaultNode(id);
  }

  async moveVaultNode(nodeId: string, newPath: string): Promise<VaultNodeResponse> {
    return this.vaultNodes.moveVaultNode(nodeId, newPath);
  }

  async checkMissingChunks(chunkIds: string[]): Promise<string[]> {
    return this.vaultNodes.checkMissingChunks(chunkIds);
  }

  async uploadChunk(chunkId: string, cipherData: Uint8Array): Promise<void> {
    return this.vaultNodes.uploadChunk(chunkId, cipherData);
  }

  async fetchChunk(chunkId: string): Promise<ArrayBuffer> {
    return this.vaultNodes.fetchChunk(chunkId);
  }

  async commitManifest(
    manifestId: string,
    nodeId: string,
    encryptedManifest: Uint8Array,
    meta: {
      parentManifestId?: string;
      plainSize: number;
      cipherSize: number;
      commitMessage?: string;
    }
  ): Promise<void> {
    return this.vaultNodes.commitManifest(manifestId, nodeId, encryptedManifest, meta);
  }

  async commitSyncBundle(formData: FormData): Promise<{
    success: boolean;
    manifestId?: string;
    nodeId?: string;
    uploadedChunksCount?: number;
    missingChunkIds?: string[];
  }> {
    return this.vaultNodes.commitSyncBundle(formData);
  }

  async fetchManifest(manifestId: string): Promise<ArrayBuffer> {
    return this.vaultNodes.fetchManifest(manifestId);
  }

  async getManifestHistory(nodeId: string): Promise<any[]> {
    return this.vaultNodes.getManifestHistory(nodeId);
  }

  async getNodeHistory(id: string): Promise<NodeVersionResponse[]> {
    return this.vaultNodes.getNodeHistory(id);
  }

  async getVersionContent(
    id: string,
    timestamp: number
  ): Promise<{ body: ArrayBuffer; encryptedDek: string; commitHash: string }> {
    return this.vaultNodes.getVersionContent(id, timestamp);
  }

  async revertNodeVersion(id: string, timestamp: number): Promise<VaultNodeResponse> {
    return this.vaultNodes.revertNodeVersion(id, timestamp);
  }

  // --- Notes API ---

  async getNotesList(): Promise<NoteMetadataItem[]> {
    return this.notes.getNotesList();
  }

  async getNoteById(
    id: string
  ): Promise<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }> {
    return this.notes.getNoteById(id);
  }

  async createNote(encryptedTitle: string, encryptedPayload: string, encryptedDek: string): Promise<NoteItem> {
    return this.notes.createNote(encryptedTitle, encryptedPayload, encryptedDek);
  }

  async updateNote(id: string, encryptedTitle?: string, encryptedPayload?: string, encryptedDek?: string): Promise<NoteItem> {
    return this.notes.updateNote(id, encryptedTitle, encryptedPayload, encryptedDek);
  }

  async deleteNote(id: string): Promise<void> {
    return this.notes.deleteNote(id);
  }

  // --- Admin API ---

  async adminListUsers(): Promise<UserAdminSummary[]> {
    return this.admin.adminListUsers();
  }

  async adminDeleteUser(id: string): Promise<{ message: string }> {
    return this.admin.adminDeleteUser(id);
  }

  async adminUpdateUserRole(id: string, role: UserRole): Promise<{ message: string }> {
    return this.admin.adminUpdateUserRole(id, role);
  }

  async adminUpdateUserQuota(id: string, quotaBytes: number | null): Promise<{ message: string; storageQuotaBytes: number | null }> {
    return this.admin.adminUpdateUserQuota(id, quotaBytes);
  }

  async adminGetSystemSettings(): Promise<SystemConfig> {
    return this.admin.adminGetSystemSettings();
  }

  async adminUpdateSystemSettings(settings: Partial<SystemConfig>): Promise<SystemConfig> {
    return this.admin.adminUpdateSystemSettings(settings);
  }

  async adminCleanupIdleUsers(): Promise<{ destroyedCount: number; destroyedUsernames: string[]; message: string }> {
    return this.admin.adminCleanupIdleUsers();
  }
}
