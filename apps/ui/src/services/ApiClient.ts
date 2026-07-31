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
    localStorage.setItem('markspace_jwt_token', token);
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
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
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, authToken }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(username: string, authToken: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, authToken }),
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
    const res = await fetch(`${this.baseUrl}/vault/nodes/${id}/content`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
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
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}/vault/nodes/${id}/content`, {
      method: 'PUT',
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
