import { DPoPSigner } from '../crypto/DPoPSigner';
import {
  AuditLogResponse,
  AuthResponse,
  IApiClient,
  NodeVersionResponse,
  VaultNodeResponse,
} from '../interfaces/IApiClient';
import { FileCategory, NoteItem, NoteMetadataItem } from '../interfaces/INoteModels';

export class ApiClient implements IApiClient {
  private inMemoryAccessToken: string | null = null;
  private tokenExpiresAt = 0;
  private refreshPromise: Promise<string | null> | null = null;
  private baseUrl = '/api/v1';
  private currentNonce: string | null = null;
  private currentNonceTimestamp = 0;
  private onForceLogoutCallback: ((reason: string) => void) | null = null;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
    // Zero disk persistence: strictly in-memory variable (destroyed on page reload/close)
  }

  setToken(token: string, expiresInSeconds = 60): void {
    this.inMemoryAccessToken = token || null;
    if (token) {
      // Set refresh threshold to 80% of TTL or at least 10s ahead of expiry
      this.tokenExpiresAt = Date.now() + Math.max(expiresInSeconds * 800, 10000);
    } else {
      this.tokenExpiresAt = 0;
      this.refreshPromise = null;
    }
  }

  getAccessToken(): string | null {
    return this.inMemoryAccessToken;
  }

  setOnForceLogout(callback: (reason: string) => void): void {
    this.onForceLogoutCallback = callback;
  }

  /**
   * Retrieves a valid Access Token, triggering proactive silent refresh if near expiry.
   */
  private async getValidAccessToken(): Promise<string | null> {
    if (this.inMemoryAccessToken && Date.now() < this.tokenExpiresAt) {
      return this.inMemoryAccessToken;
    }
    return this.silentRefresh();
  }

  /**
   * Proactive / Reactive Silent Refresh via HttpOnly Cookie (RTR)
   */
  private async silentRefresh(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success || !json?.data?.accessToken) {
          this.setToken('');
          return null;
        }

        const data = json.data as AuthResponse;
        this.setToken(data.accessToken, data.expiresIn || 60);
        return data.accessToken;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * App Startup session initializer: checks for active HttpOnly session cookie.
   */
  async initSession(): Promise<AuthResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.data?.accessToken) {
        this.setToken('');
        return null;
      }

      const data = json.data as AuthResponse;
      this.setToken(data.accessToken, data.expiresIn || 60);
      return data;
    } catch {
      this.setToken('');
      return null;
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
    this.setToken(res.accessToken || res.token || '', res.expiresIn || 60);
    return res;
  }

  /**
   * AOP Aspect: Perform initial Nonce handshake if not already cached or expired.
   */
  private async getNonce(): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/nonce`, { method: 'GET', credentials: 'include' });
      const nextNonceHeader = res.headers.get('X-Next-Nonce');
      const json = await res.json().catch(() => null);
      const nonce = nextNonceHeader || json?.data?.nonce || '';
      if (nonce) {
        this.currentNonce = nonce;
        this.currentNonceTimestamp = Date.now();
      }
      return nonce;
    } catch {
      return '';
    }
  }

  /**
   * AOP Request Interceptor: Injects X-Nonce, Authorization, Content-Type, DPoP headers.
   */
  private async getHeaders(method: string, path: string): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const isPublicAuthPath =
      path.startsWith('/auth/prelogin') ||
      path.startsWith('/auth/login') ||
      path.startsWith('/auth/register') ||
      path.startsWith('/auth/refresh') ||
      path.startsWith('/auth/nonce');

    if (!isPublicAuthPath) {
      const validToken = await this.getValidAccessToken();
      if (validToken) {
        headers['Authorization'] = `Bearer ${validToken}`;
      }
    } else if (this.inMemoryAccessToken) {
      headers['Authorization'] = `Bearer ${this.inMemoryAccessToken}`;
    }

    // AOP: Ensure we have an active, non-expired anti-replay nonce before sending request
    const isExpired = Date.now() - this.currentNonceTimestamp > 50000;
    if ((!this.currentNonce || isExpired) && path !== '/auth/nonce') {
      await this.getNonce();
    }
    if (this.currentNonce) {
      headers['X-Nonce'] = this.currentNonce;
      this.currentNonce = null;
    }

    try {
      const dpopProof = await DPoPSigner.createProof(method, path);
      headers['DPoP'] = dpopProof;
    } catch (err) {
      console.warn('Failed to sign DPoP proof header', err);
    }

    return headers;
  }

  /**
   * Core AOP HTTP Request Pipeline with Automatic Header Nonce Handshake & Dispatch.
   */
  private async request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const defaultHeaders = await this.getHeaders(method, path);

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });

    // AOP Response Interceptor: Capture Next Nonce strictly from HTTP Response Headers
    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
      this.currentNonceTimestamp = Date.now();
    }

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      const errorCode = json?.error?.code;
      const errorMsg = json?.error?.message || `API Error: ${res.status}`;

      // 401 Unauthorized Retry with Silent Refresh
      if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
        console.warn('Access token expired during request. Triggering silent refresh...');
        const refreshedToken = await this.silentRefresh();
        if (refreshedToken) {
          return this.request<T>(path, options, true);
        }
      }

      // AOP Nonce Violation Self-Healing: Try 1-time re-handshake before terminating session
      if (
        (errorCode === 'SECURITY_NONCE_VIOLATION' || errorMsg.includes('SECURITY_NONCE_VIOLATION')) &&
        !isRetry &&
        path !== '/auth/nonce'
      ) {
        console.warn('Anti-replay nonce desynced or expired. Performing automatic handshake recovery...');
        this.currentNonce = null;
        this.currentNonceTimestamp = 0;
        await this.getNonce();
        return this.request<T>(path, options, true);
      }

      // If persistent violation occurs
      if (errorCode === 'SECURITY_NONCE_VIOLATION' || errorMsg.includes('SECURITY_NONCE_VIOLATION')) {
        console.error('CRITICAL SECURITY VIOLATION: Nonce verification failed after retry. Terminating user session.');
        this.setToken('');
        this.currentNonce = null;
        this.currentNonceTimestamp = 0;
        if (this.onForceLogoutCallback) {
          this.onForceLogoutCallback(
            'Security Alert: Anti-replay nonce chain was violated or expired. Your session was terminated for data protection.'
          );
        }
      }

      const error: any = new Error(errorMsg);
      error.status = res.status;
      error.code = errorCode;
      throw error;
    }

    return json.data as T;
  }

  async prelogin(username: string): Promise<{ exists: boolean; isTotpEnabled: boolean; serverTime: number }> {
    return this.request<{ exists: boolean; isTotpEnabled: boolean; serverTime: number }>('/auth/prelogin', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  async register(username: string, authToken: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, authToken }),
    });
    this.setToken(data.accessToken || data.token || '', data.expiresIn || 60);
    return data;
  }

  async login(username: string, authToken: string, totpCode?: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, authToken, totpCode }),
    });
    this.setToken(data.accessToken || data.token || '', data.expiresIn || 60);
    return data;
  }

  async loginPasswordlessTotp(username: string, totpCode: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login/passwordless-totp', {
      method: 'POST',
      body: JSON.stringify({ username, totpCode }),
    });
    this.setToken(data.accessToken || data.token || '', data.expiresIn || 60);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.warn('Failed to record logout on backend', err);
    } finally {
      this.setToken('');
      this.currentNonce = null;
    }
  }

  async setupTotp(): Promise<{ secret: string; otpauthUri: string; expiresAt: number }> {
    return this.request<{ secret: string; otpauthUri: string; expiresAt: number }>('/auth/totp/setup', {
      method: 'POST',
    });
  }

  async enableTotp(secret: string, code: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/totp/enable', {
      method: 'POST',
      body: JSON.stringify({ secret, code }),
    });
  }

  async disableTotp(code: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/totp/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getAuditLogs(): Promise<AuditLogResponse[]> {
    return this.request<AuditLogResponse[]>('/auth/audit-logs', {
      method: 'GET',
    });
  }

  async setupVaultOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.request<{ evaluatedPoint: string }>(`/vaults/${vaultId}/oprf/setup`, {
      method: 'POST',
      body: JSON.stringify({ blindedElement }),
    });
  }

  async evaluateVaultOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.evaluateVaultPinOprf(vaultId, blindedElement);
  }

  async evaluateVaultPinOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.request<{ evaluatedPoint: string }>(`/vaults/${vaultId}/oprf/evaluate-pin`, {
      method: 'POST',
      body: JSON.stringify({ blindedElement }),
    });
  }

  async evaluateVaultRecoveryOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.request<{ evaluatedPoint: string }>(`/vaults/${vaultId}/oprf/evaluate-recovery`, {
      method: 'POST',
      body: JSON.stringify({ blindedElement }),
    });
  }

  async reportVaultPinFailure(
    vaultId: string
  ): Promise<{ remainingAttempts: number; lockoutUntil: number; serverTime: number }> {
    return this.request<{ remainingAttempts: number; lockoutUntil: number; serverTime: number }>(
      `/vaults/${vaultId}/pin/fail`,
      {
        method: 'POST',
      }
    );
  }

  async reportVaultPinSuccess(vaultId: string): Promise<void> {
    await this.request<void>(`/vaults/${vaultId}/pin/success`, {
      method: 'POST',
    });
  }

  async getVaultTree(): Promise<VaultNodeResponse[]> {
    return this.request<VaultNodeResponse[]>('/vault/tree', {
      method: 'GET',
    });
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
    const parentPath =
      node.parentPath ?? (node.path.includes('/') ? node.path.substring(0, node.path.lastIndexOf('/')) : '');
    return this.request<VaultNodeResponse>('/vault/nodes', {
      method: 'POST',
      body: JSON.stringify({
        id: node.id || crypto.randomUUID(),
        path: node.path,
        parentPath,
        name: node.name,
        isDirectory: node.isDirectory,
        encryptedDek: node.encryptedDek,
        size: node.size || 0,
        mimeType: node.mimeType || 'text/plain',
        category: node.category || 'markdown',
        activeManifestId: node.activeManifestId || null,
      }),
    });
  }

  async getVaultNodeContent(id: string): Promise<{ body: ArrayBuffer; encryptedDek: string; fileName: string }> {
    const defaultHeaders = await this.getHeaders('GET', `/vault/nodes/${id}/content`);
    const res = await fetch(`${this.baseUrl}/vault/nodes/${id}/content`, {
      method: 'GET',
      credentials: 'include',
      headers: defaultHeaders,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    if (!res.ok) {
      throw new Error(`Failed to download node content: ${res.status}`);
    }

    const encryptedDek = res.headers.get('X-Encrypted-Dek') || '';
    const contentDisposition = res.headers.get('Content-Disposition') || '';
    let fileName = 'downloaded_file';
    const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
    if (match && match[1]) {
      fileName = decodeURIComponent(match[1].replace(/["']/g, ''));
    }

    const body = await res.arrayBuffer();
    return { body, encryptedDek, fileName };
  }

  async updateVaultNodeContent(
    id: string,
    contentBlob: ArrayBuffer | Uint8Array | Blob,
    mimeType?: string,
    encryptedDek?: string
  ): Promise<VaultNodeResponse> {
    const defaultHeaders = await this.getHeaders('PUT', `/vault/nodes/${id}/content`);
    if (mimeType) {
      defaultHeaders['Content-Type'] = mimeType;
    }
    if (encryptedDek) {
      defaultHeaders['X-Encrypted-Dek'] = encryptedDek;
    }

    const res = await fetch(`${this.baseUrl}/vault/nodes/${id}/content`, {
      method: 'PUT',
      credentials: 'include',
      headers: defaultHeaders,
      body: contentBlob as unknown as BodyInit,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    if (!res.ok) {
      throw new Error(`Failed to update vault node: ${res.status}`);
    }

    const json = (await res.json()) as { success: boolean; data: VaultNodeResponse };
    return json.data;
  }

  async deleteVaultNode(id: string): Promise<void> {
    await this.request<void>(`/vault/nodes/${id}`, {
      method: 'DELETE',
    });
  }

  async moveVaultNode(nodeId: string, newPath: string): Promise<VaultNodeResponse> {
    return this.request<VaultNodeResponse>(`/vault/nodes/${nodeId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ newPath }),
    });
  }

  async checkMissingChunks(chunkIds: string[]): Promise<string[]> {
    const res = await this.request<{ missingChunkIds: string[] }>('/vault/chunks/check-missing', {
      method: 'POST',
      body: JSON.stringify({ chunkIds }),
    });
    return res.missingChunkIds || [];
  }

  async uploadChunk(chunkId: string, cipherData: Uint8Array): Promise<void> {
    const defaultHeaders = await this.getHeaders('PUT', `/vault/chunks/${chunkId}`);
    defaultHeaders['Content-Type'] = 'application/octet-stream';

    const res = await fetch(`${this.baseUrl}/vault/chunks/${chunkId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: defaultHeaders,
      body: cipherData as unknown as BodyInit,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    if (!res.ok) {
      throw new Error(`Failed to upload chunk ${chunkId}: ${res.status}`);
    }
  }

  async fetchChunk(chunkId: string): Promise<ArrayBuffer> {
    const defaultHeaders = await this.getHeaders('GET', `/vault/chunks/${chunkId}`);
    const res = await fetch(`${this.baseUrl}/vault/chunks/${chunkId}`, {
      method: 'GET',
      credentials: 'include',
      headers: defaultHeaders,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch chunk ${chunkId}: ${res.status}`);
    }

    return res.arrayBuffer();
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
    const defaultHeaders = await this.getHeaders('POST', '/vault/manifests/commit');
    defaultHeaders['Content-Type'] = 'application/octet-stream';
    defaultHeaders['X-Manifest-Id'] = manifestId;
    defaultHeaders['X-Node-Id'] = nodeId;
    if (meta.parentManifestId) {
      defaultHeaders['X-Parent-Manifest-Id'] = meta.parentManifestId;
    }
    defaultHeaders['X-Plain-Size'] = String(meta.plainSize);
    defaultHeaders['X-Cipher-Size'] = String(meta.cipherSize);
    if (meta.commitMessage) {
      defaultHeaders['X-Commit-Message'] = encodeURIComponent(meta.commitMessage);
    }

    const res = await fetch(`${this.baseUrl}/vault/manifests/commit`, {
      method: 'POST',
      credentials: 'include',
      headers: defaultHeaders,
      body: encryptedManifest as unknown as BodyInit,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    if (!res.ok) {
      throw new Error(`Failed to commit manifest ${manifestId}: ${res.status}`);
    }
  }

  async commitSyncBundle(formData: FormData): Promise<{
    success: boolean;
    manifestId?: string;
    nodeId?: string;
    uploadedChunksCount?: number;
    missingChunkIds?: string[];
  }> {
    const headers = await this.getHeaders('POST', '/vault/sync/commit-bundle');
    delete headers['Content-Type'];

    const res = await fetch(`${this.baseUrl}/vault/sync/commit-bundle`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    if (res.status === 409) {
      const data = (await res.json()) as {
        error?: { code?: string; missingChunkIds?: string[] };
      };
      return {
        success: false,
        missingChunkIds: data?.error?.missingChunkIds || [],
      };
    }

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error?.message || `Commit bundle failed: ${res.status}`);
    }

    const json = (await res.json()) as {
      success: boolean;
      data: { manifestId: string; nodeId: string; uploadedChunksCount: number };
    };
    return {
      success: true,
      manifestId: json.data?.manifestId,
      nodeId: json.data?.nodeId,
      uploadedChunksCount: json.data?.uploadedChunksCount,
    };
  }

  async fetchManifest(manifestId: string): Promise<ArrayBuffer> {
    const defaultHeaders = await this.getHeaders('GET', `/vault/manifests/${manifestId}`);
    const res = await fetch(`${this.baseUrl}/vault/manifests/${manifestId}`, {
      method: 'GET',
      credentials: 'include',
      headers: defaultHeaders,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch manifest ${manifestId}: ${res.status}`);
    }

    return res.arrayBuffer();
  }

  async getManifestHistory(nodeId: string): Promise<any[]> {
    return this.request<any[]>(`/vault/manifests/${nodeId}/history`, {
      method: 'GET',
    });
  }

  async getNodeHistory(id: string): Promise<NodeVersionResponse[]> {
    return this.request<NodeVersionResponse[]>(`/vault/nodes/${id}/history`, {
      method: 'GET',
    });
  }

  async getVersionContent(
    id: string,
    timestamp: number
  ): Promise<{ body: ArrayBuffer; encryptedDek: string; commitHash: string }> {
    const defaultHeaders = await this.getHeaders('GET', `/vault/nodes/${id}/history/${timestamp}/content`);
    const res = await fetch(`${this.baseUrl}/vault/nodes/${id}/history/${timestamp}/content`, {
      method: 'GET',
      credentials: 'include',
      headers: defaultHeaders,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    if (!res.ok) {
      throw new Error(`Failed to download historical version content: ${res.status}`);
    }

    const encryptedDek = res.headers.get('X-Encrypted-Dek') || '';
    const commitHash = res.headers.get('X-Commit-Hash') || '';
    const body = await res.arrayBuffer();

    return { body, encryptedDek, commitHash };
  }

  async revertNodeVersion(id: string, timestamp: number): Promise<VaultNodeResponse> {
    return this.request<VaultNodeResponse>(`/vault/nodes/${id}/history/${timestamp}/revert`, {
      method: 'POST',
    });
  }

  async getNotesList(): Promise<NoteMetadataItem[]> {
    return this.request<NoteMetadataItem[]>('/notes', {
      method: 'GET',
    });
  }

  async getNoteById(
    id: string
  ): Promise<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }> {
    return this.request<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }>(
      `/notes/${id}`,
      { method: 'GET' }
    );
  }

  async createNote(encryptedTitle: string, encryptedPayload: string, encryptedDek: string): Promise<NoteItem> {
    return this.request<NoteItem>('/notes', {
      method: 'POST',
      body: JSON.stringify({ encryptedTitle, encryptedPayload, encryptedDek }),
    });
  }

  async updateNote(id: string, encryptedTitle?: string, encryptedPayload?: string, encryptedDek?: string): Promise<NoteItem> {
    return this.request<NoteItem>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ encryptedTitle, encryptedPayload, encryptedDek }),
    });
  }

  async deleteNote(id: string): Promise<void> {
    await this.request<void>(`/notes/${id}`, {
      method: 'DELETE',
    });
  }
}
