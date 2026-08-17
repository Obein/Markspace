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

  private async getNonce(): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/nonce`, { method: 'GET', credentials: 'include' });
      const nextNonceHeader = res.headers.get('X-Next-Nonce');
      const json = await res.json();
      const nonce = nextNonceHeader || json.data?.nonce || '';
      this.currentNonce = nonce;
      return nonce;
    } catch {
      return '';
    }
  }

  private async getHeaders(method: string, path: string): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Ensure we have an active anti-replay nonce in the chain
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

    // Update continuous Next Nonce from server response headers
    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      const errorCode = json?.error?.code;
      const errorMsg = json?.error?.message || `API Error: ${res.status}`;

      // If anti-replay nonce violation occurs, immediately trigger security force logout!
      if (errorCode === 'SECURITY_NONCE_VIOLATION' || errorMsg.includes('SECURITY_NONCE_VIOLATION')) {
        console.error('CRITICAL SECURITY VIOLATION: Nonce verification failed. Forcefully terminating user session.');
        this.setToken('');
        this.currentNonce = null;
        if (this.onForceLogoutCallback) {
          this.onForceLogoutCallback(errorMsg);
        }
      }

      throw new Error(errorMsg);
    }

    if (json.data?.nextNonce) {
      this.currentNonce = json.data.nextNonce;
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
      body: JSON.stringify({ username, authToken, nonce: this.currentNonce }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(username: string, authToken: string, totpCode?: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, authToken, totpCode, nonce: this.currentNonce }),
    });
    this.setToken(data.token);
    return data;
  }

  async loginPasswordlessTotp(username: string, totpCode: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login-totp-passwordless', {
      method: 'POST',
      body: JSON.stringify({ username, totpCode, nonce: this.currentNonce }),
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
      body: JSON.stringify({ code, secret, nonce: this.currentNonce }),
    });
  }

  async disableTotp(code: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/totp/disable', {
      method: 'POST',
      body: JSON.stringify({ code, nonce: this.currentNonce }),
    });
  }

  async getAuditLogs(): Promise<AuditLogResponse[]> {
    return this.request<AuditLogResponse[]>('/auth/audit-logs', { method: 'GET' });
  }

  async getVaultTicketKey(vaultId: string): Promise<{ serverTicketKey: string }> {
    return this.request<{ serverTicketKey: string }>('/vault/ticket-key', {
      method: 'POST',
      body: JSON.stringify({ vaultId, nonce: this.currentNonce }),
    });
  }

  async requestVaultUnlockTicket(
    vaultId: string
  ): Promise<{ serverTicketKey: string; failCount: number; serverTime: number }> {
    return this.request<{ serverTicketKey: string; failCount: number; serverTime: number }>(
      '/vault/unlock-ticket',
      {
        method: 'POST',
        body: JSON.stringify({ vaultId, nonce: this.currentNonce }),
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
        body: JSON.stringify({ vaultId, nonce: this.currentNonce }),
      }
    );
  }

  async reportVaultPinSuccess(vaultId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/vault/report-success', {
      method: 'POST',
      body: JSON.stringify({ vaultId, nonce: this.currentNonce }),
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
    let payload = '';
    if (dto.contentBlob) {
      if (typeof dto.contentBlob === 'string') {
        payload = dto.contentBlob;
      } else {
        const bytes = new Uint8Array(dto.contentBlob);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        payload = btoa(binary);
      }
    }

    return this.request<VaultNodeResponse>('/vault/nodes', {
      method: 'POST',
      body: JSON.stringify({
        path: dto.path,
        name: dto.name,
        isDirectory: dto.isDirectory,
        encryptedDek: dto.encryptedDek,
        mimeType: dto.mimeType,
        category: dto.category,
        payload,
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
      throw new Error(`Failed to fetch node content: ${res.status}`);
    }

    const encryptedDek = res.headers.get('X-Encrypted-DEK') || '';
    const disposition = res.headers.get('Content-Disposition') || '';
    let fileName = '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) fileName = match[1];

    const body = await res.arrayBuffer();
    return { body, encryptedDek, fileName };
  }

  async updateVaultNodeContent(
    id: string,
    contentBlob: ArrayBuffer | Uint8Array | string,
    mimeType: string = 'text/markdown'
  ): Promise<VaultNodeResponse> {
    const defaultHeaders = await this.getHeaders('PUT', `/vault/nodes/${id}/content`);
    let bodyData: BodyInit;
    if (typeof contentBlob === 'string') {
      bodyData = new TextEncoder().encode(contentBlob);
    } else {
      bodyData = contentBlob as unknown as BodyInit;
    }

    const res = await fetch(`${this.baseUrl}/vault/nodes/${id}/content`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        ...defaultHeaders,
        'Content-Type': mimeType,
      },
      body: bodyData,
    });

    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
    }

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || `Update node failed: ${res.status}`);
    }

    return json.data as VaultNodeResponse;
  }

  async deleteVaultNode(id: string): Promise<void> {
    await this.request<{ message: string }>(`/vault/nodes/${id}`, { method: 'DELETE' });
  }

  async moveVaultNode(nodeId: string, newPath: string): Promise<VaultNodeResponse> {
    return this.request<VaultNodeResponse>('/vault/nodes/move', {
      method: 'POST',
      body: JSON.stringify({ nodeId, newPath }),
    });
  }

  async getNodeHistory(id: string): Promise<NodeVersionResponse[]> {
    return this.request<NodeVersionResponse[]>(`/vault/nodes/${id}/versions`, { method: 'GET' });
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
    const body = await res.arrayBuffer();

    return { body, encryptedDek, commitHash };
  }

  async revertNodeVersion(id: string, timestamp: number): Promise<VaultNodeResponse> {
    return this.request<VaultNodeResponse>(`/vault/nodes/${id}/versions/revert`, {
      method: 'POST',
      body: JSON.stringify({ timestamp }),
    });
  }

  async getNotesList(): Promise<NoteMetadataItem[]> {
    return this.request<NoteMetadataItem[]>('/notes', { method: 'GET' });
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
    await this.request<{ message: string }>(`/notes/${id}`, { method: 'DELETE' });
  }
}
