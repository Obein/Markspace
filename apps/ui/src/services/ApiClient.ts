import { DPoPSigner } from '../crypto/DPoPSigner';
import { AuthResponse, IApiClient, VaultNodeResponse } from '../interfaces/IApiClient';
import { FileCategory, NoteItem, NoteMetadataItem } from '../interfaces/INoteModels';

export class ApiClient implements IApiClient {
  private token: string | null = null;
  private baseUrl = '/api/v1';

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

  private async getNonce(): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/nonce`, { method: 'GET', credentials: 'include' });
      const json = await res.json();
      return json.data?.nonce || '';
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

    try {
      // Attach RFC 9449 DPoP proof signed by non-extractable client key
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
      credentials: 'include', // Enforce HttpOnly cookie session transmission
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || `API Error: ${res.status}`);
    }

    return json.data as T;
  }

  async register(username: string, authToken: string): Promise<AuthResponse> {
    const nonce = await this.getNonce();
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, authToken, nonce }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(username: string, authToken: string): Promise<AuthResponse> {
    const nonce = await this.getNonce();
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, authToken, nonce }),
    });
    this.setToken(data.token);
    return data;
  }

  // Vault Tree & Object Storage API
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
    const path = `/vault/nodes/${id}/content`;
    const defaultHeaders = await this.getHeaders('GET', path);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      credentials: 'include',
      headers: defaultHeaders,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch node content: ${res.status}`);
    }

    const encryptedDek = res.headers.get('X-Encrypted-DEK') || '';
    const fileNameHeader = res.headers.get('X-File-Name') || '';
    const fileName = fileNameHeader ? decodeURIComponent(fileNameHeader) : '';
    const body = await res.arrayBuffer();

    return {
      body,
      encryptedDek,
      fileName,
    };
  }

  async updateVaultNodeContent(
    id: string,
    contentBlob: ArrayBuffer | Uint8Array | string,
    mimeType: string = 'application/octet-stream'
  ): Promise<VaultNodeResponse> {
    const path = `/vault/nodes/${id}/content`;
    const defaultHeaders = await this.getHeaders('PUT', path);

    const headers: Record<string, string> = {
      ...(defaultHeaders as Record<string, string>),
      'Content-Type': mimeType,
    };

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: contentBlob as any,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || `Failed to update node content: ${res.status}`);
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

  // Legacy Notes API
  async getNotesList(): Promise<NoteMetadataItem[]> {
    return this.request<NoteMetadataItem[]>('/notes', { method: 'GET' });
  }

  async getNoteById(id: string): Promise<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }> {
    return this.request<{ id: string; encryptedTitle: string; encryptedPayload: string; encryptedDek: string; createdAt: number; updatedAt: number }>(`/notes/${id}`, { method: 'GET' });
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
