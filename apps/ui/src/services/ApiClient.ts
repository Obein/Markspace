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
  private token: string | null = null;
  private baseUrl = '/api/v1';
  private currentNonce: string | null = null;
  private onForceLogoutCallback: ((reason: string) => void) | null = null;

  constructor() {
    this.token = localStorage.getItem('markspace_jwt_token');
  }

  setToken(token: string): void {
    this.token = token;
    if (token) {
      localStorage.setItem('markspace_jwt_token', token);
    } else {
      localStorage.removeItem('markspace_jwt_token');
    }
  }

  setOnForceLogout(callback: (reason: string) => void): void {
    this.onForceLogoutCallback = callback;
  }

  /**
   * AOP Aspect: Perform initial Nonce handshake if not already cached.
   */
  private async getNonce(): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/nonce`, { method: 'GET', credentials: 'include' });
      const nextNonceHeader = res.headers.get('X-Next-Nonce');
      const json = await res.json().catch(() => null);
      const nonce = nextNonceHeader || json?.data?.nonce || '';
      if (nonce) {
        this.currentNonce = nonce;
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
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // AOP: Ensure we have an active anti-replay nonce before sending request
    if (!this.currentNonce && path !== '/auth/nonce') {
      await this.getNonce();
    }
    if (this.currentNonce) {
      headers['X-Nonce'] = this.currentNonce;
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
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    }

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      const errorCode = json?.error?.code;
      const errorMsg = json?.error?.message || `API Error: ${res.status}`;

      // AOP Nonce Violation Safety Net
      if (errorCode === 'SECURITY_NONCE_VIOLATION' || errorMsg.includes('SECURITY_NONCE_VIOLATION')) {
        console.error('CRITICAL SECURITY VIOLATION: Nonce verification failed. Forcefully terminating user session.');
        this.setToken('');
        this.currentNonce = null;
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
    this.setToken(data.token);
    return data;
  }

  async login(username: string, authToken: string, totpCode?: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, authToken, totpCode }),
    });
    this.setToken(data.token);
    return data;
  }

  async loginPasswordlessTotp(username: string, totpCode: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login/passwordless-totp', {
      method: 'POST',
      body: JSON.stringify({ username, totpCode }),
    });
    this.setToken(data.token);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.request<{ message: string }>('/auth/logout', { method: 'POST' });
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

  async enableTotp(code: string, secret: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/totp/enable', {
      method: 'POST',
      body: JSON.stringify({ code, secret }),
    });
  }

  async disableTotp(code: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/totp/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getAuditLogs(): Promise<AuditLogResponse[]> {
    return this.request<AuditLogResponse[]>('/auth/audit-logs', { method: 'GET' });
  }

  async getVaultTicketKey(vaultId: string): Promise<{ serverTicketKey: string }> {
    return this.request<{ serverTicketKey: string }>('/vault/ticket-key', {
      method: 'POST',
      body: JSON.stringify({ vaultId }),
    });
  }

  async requestVaultUnlockTicket(
    vaultId: string
  ): Promise<{ serverTicketKey: string; failCount: number; serverTime: number }> {
    return this.request<{ serverTicketKey: string; failCount: number; serverTime: number }>(
      '/vault/unlock-ticket',
      {
        method: 'POST',
        body: JSON.stringify({ vaultId }),
      }
    );
  }

  async reportVaultPinFailure(
    vaultId: string
  ): Promise<{ failCount: number; lockedUntil: number; remainingSeconds: number }> {
    return this.request<{ failCount: number; lockedUntil: number; remainingSeconds: number }>(
      '/vault/report-fail',
      {
        method: 'POST',
        body: JSON.stringify({ vaultId }),
      }
    );
  }

  async reportVaultPinSuccess(vaultId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/vault/report-success', {
      method: 'POST',
      body: JSON.stringify({ vaultId }),
    });
  }

  async getVaultTree(): Promise<VaultNodeResponse[]> {
    return this.request<VaultNodeResponse[]>('/vault/tree', { method: 'GET' });
  }

  async createVaultNode(dto: {
    path: string;
    name: string;
    isDirectory: boolean;
    encryptedDek: string;
    size?: number;
    mimeType?: string;
    category?: FileCategory;
    contentBlob?: ArrayBuffer | Uint8Array | string;
  }): Promise<VaultNodeResponse> {
    return this.request<VaultNodeResponse>('/vault/nodes', {
      method: 'POST',
      body: JSON.stringify(dto),
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
      throw new Error(`Failed to fetch node content: ${res.status}`);
    }

    const encryptedDek = res.headers.get('X-Encrypted-DEK') || '';
    const contentDisposition = res.headers.get('Content-Disposition') || '';
    let fileName = 'file';
    const match = contentDisposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      fileName = decodeURIComponent(match[1]);
    }

    const arrayBuffer = await res.arrayBuffer();
    return { body: arrayBuffer, encryptedDek, fileName };
  }

  async updateVaultNodeContent(
    id: string,
    contentBlob: ArrayBuffer | Uint8Array | string,
    mimeType = 'application/octet-stream',
    encryptedDek?: string
  ): Promise<VaultNodeResponse> {
    const defaultHeaders = await this.getHeaders('PUT', `/vault/nodes/${id}/content`);
    const headers: Record<string, string> = {
      ...defaultHeaders,
      'Content-Type': mimeType,
    };
    if (encryptedDek) {
      headers['X-Encrypted-DEK'] = encryptedDek;
    }

    const res = await fetch(`${this.baseUrl}/vault/nodes/${id}/content`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: contentBlob as any,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.error?.message || `Failed to update node: ${res.status}`);
    }
    return json.data as VaultNodeResponse;
  }

  async deleteVaultNode(id: string): Promise<void> {
    await this.request<{ message: string }>(`/vault/nodes/${id}`, {
      method: 'DELETE',
    });
  }

  async moveVaultNode(nodeId: string, newPath: string): Promise<VaultNodeResponse> {
    return this.request<VaultNodeResponse>('/vault/nodes/move', {
      method: 'POST',
      body: JSON.stringify({ nodeId, newPath }),
    });
  }

  async getNodeHistory(id: string): Promise<NodeVersionResponse[]> {
    return this.request<NodeVersionResponse[]>(`/vault/nodes/${id}/versions`, {
      method: 'GET',
    });
  }

  async getVersionContent(
    id: string,
    timestamp: number
  ): Promise<{ body: ArrayBuffer; encryptedDek: string; commitHash: string }> {
    const defaultHeaders = await this.getHeaders('GET', `/vault/nodes/${id}/versions/${timestamp}/content`);
    const res = await fetch(`${this.baseUrl}/vault/nodes/${id}/versions/${timestamp}/content`, {
      method: 'GET',
      credentials: 'include',
      headers: defaultHeaders,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch version content: ${res.status}`);
    }

    const encryptedDek = res.headers.get('X-Encrypted-DEK') || '';
    const commitHash = res.headers.get('X-Commit-Hash') || '';
    const arrayBuffer = await res.arrayBuffer();

    return { body: arrayBuffer, encryptedDek, commitHash };
  }

  async revertNodeVersion(id: string, timestamp: number): Promise<VaultNodeResponse> {
    return this.request<VaultNodeResponse>('/vault/nodes/revert', {
      method: 'POST',
      body: JSON.stringify({ nodeId: id, timestamp }),
    });
  }

  async getNotesList(): Promise<NoteMetadataItem[]> {
    return this.request<NoteMetadataItem[]>('/notes', { method: 'GET' });
  }

  async getNoteById(
    id: string
  ): Promise<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }> {
    return this.request<{
      id: string;
      encryptedTitle: string;
      encryptedPayload: string;
      encryptedDek: string;
      createdAt: number;
      updatedAt: number;
    }>(`/notes/${id}`, { method: 'GET' });
  }

  async createNote(encryptedTitle: string, encryptedPayload: string, encryptedDek: string): Promise<NoteItem> {
    return this.request<NoteItem>('/notes', {
      method: 'POST',
      body: JSON.stringify({ encryptedTitle, encryptedPayload, encryptedDek }),
    });
  }

  async updateNote(
    id: string,
    encryptedTitle?: string,
    encryptedPayload?: string,
    encryptedDek?: string
  ): Promise<NoteItem> {
    return this.request<NoteItem>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ encryptedTitle, encryptedPayload, encryptedDek }),
    });
  }

  async deleteNote(id: string): Promise<void> {
    await this.request<{ message: string }>(`/notes/${id}`, { method: 'DELETE' });
  }
}
