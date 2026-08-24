import { NodeVersionResponse, VaultNodeResponse } from '../../interfaces/IApiClient';
import { FileCategory } from '../../interfaces/INoteModels';
import { HttpTransport } from './HttpTransport';

export class VaultNodeApi {
  constructor(private readonly transport: HttpTransport) {}

  async getVaultTree(): Promise<VaultNodeResponse[]> {
    return this.transport.request<VaultNodeResponse[]>('/vault/tree', {
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
    return this.transport.request<VaultNodeResponse>('/vault/nodes', {
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
    const defaultHeaders = await this.transport.getHeaders('GET', `/vault/nodes/${id}/content`);
    const res = await fetch(`${this.transport.getBaseUrl()}/vault/nodes/${id}/content`, {
      method: 'GET',
      credentials: 'include',
      headers: defaultHeaders,
    });

    this.transport.updateNextNonceFromResponse(res);

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
    const defaultHeaders = await this.transport.getHeaders('PUT', `/vault/nodes/${id}/content`);
    if (mimeType) {
      defaultHeaders['Content-Type'] = mimeType;
    }
    if (encryptedDek) {
      defaultHeaders['X-Encrypted-Dek'] = encryptedDek;
    }

    const res = await fetch(`${this.transport.getBaseUrl()}/vault/nodes/${id}/content`, {
      method: 'PUT',
      credentials: 'include',
      headers: defaultHeaders,
      body: contentBlob as unknown as BodyInit,
    });

    this.transport.updateNextNonceFromResponse(res);

    if (!res.ok) {
      throw new Error(`Failed to update vault node: ${res.status}`);
    }

    const json = (await res.json()) as { success: boolean; data: VaultNodeResponse };
    return json.data;
  }

  async deleteVaultNode(id: string): Promise<void> {
    await this.transport.request<void>(`/vault/nodes/${id}`, {
      method: 'DELETE',
    });
  }

  async moveVaultNode(nodeId: string, newPath: string): Promise<VaultNodeResponse> {
    return this.transport.request<VaultNodeResponse>(`/vault/nodes/${nodeId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ nodeId, newPath }),
    });
  }

  async checkMissingChunks(chunkIds: string[]): Promise<string[]> {
    const res = await this.transport.request<{ missingChunkIds: string[] }>('/vault/chunks/check-missing', {
      method: 'POST',
      body: JSON.stringify({ chunkIds }),
    });
    return res.missingChunkIds || [];
  }

  async uploadChunk(chunkId: string, cipherData: Uint8Array): Promise<void> {
    const defaultHeaders = await this.transport.getHeaders('PUT', `/vault/chunks/${chunkId}`);
    defaultHeaders['Content-Type'] = 'application/octet-stream';

    const res = await fetch(`${this.transport.getBaseUrl()}/vault/chunks/${chunkId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: defaultHeaders,
      body: cipherData as unknown as BodyInit,
    });

    this.transport.updateNextNonceFromResponse(res);

    if (!res.ok) {
      throw new Error(`Failed to upload chunk ${chunkId}: ${res.status}`);
    }
  }

  async fetchChunk(chunkId: string): Promise<ArrayBuffer> {
    const defaultHeaders = await this.transport.getHeaders('GET', `/vault/chunks/${chunkId}`);
    const res = await fetch(`${this.transport.getBaseUrl()}/vault/chunks/${chunkId}`, {
      method: 'GET',
      credentials: 'include',
      headers: defaultHeaders,
    });

    this.transport.updateNextNonceFromResponse(res);

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
    const defaultHeaders = await this.transport.getHeaders('POST', '/vault/manifests/commit');
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

    const res = await fetch(`${this.transport.getBaseUrl()}/vault/manifests/commit`, {
      method: 'POST',
      credentials: 'include',
      headers: defaultHeaders,
      body: encryptedManifest as unknown as BodyInit,
    });

    this.transport.updateNextNonceFromResponse(res);

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
    const headers = await this.transport.getHeaders('POST', '/vault/sync/commit-bundle');
    delete headers['Content-Type'];

    const res = await fetch(`${this.transport.getBaseUrl()}/vault/sync/commit-bundle`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });

    this.transport.updateNextNonceFromResponse(res);

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
    const defaultHeaders = await this.transport.getHeaders('GET', `/vault/manifests/${manifestId}`);
    const res = await fetch(`${this.transport.getBaseUrl()}/vault/manifests/${manifestId}`, {
      method: 'GET',
      credentials: 'include',
      headers: defaultHeaders,
    });

    this.transport.updateNextNonceFromResponse(res);

    if (!res.ok) {
      throw new Error(`Failed to fetch manifest ${manifestId}: ${res.status}`);
    }

    return res.arrayBuffer();
  }

  async getManifestHistory(nodeId: string): Promise<any[]> {
    return this.transport.request<any[]>(`/vault/manifests/${nodeId}/history`, {
      method: 'GET',
    });
  }

  async getNodeHistory(id: string): Promise<NodeVersionResponse[]> {
    return this.transport.request<NodeVersionResponse[]>(`/vault/nodes/${id}/history`, {
      method: 'GET',
    });
  }

  async getVersionContent(
    id: string,
    timestamp: number
  ): Promise<{ body: ArrayBuffer; encryptedDek: string; commitHash: string }> {
    const defaultHeaders = await this.transport.getHeaders('GET', `/vault/nodes/${id}/history/${timestamp}/content`);
    const res = await fetch(`${this.transport.getBaseUrl()}/vault/nodes/${id}/history/${timestamp}/content`, {
      method: 'GET',
      credentials: 'include',
      headers: defaultHeaders,
    });

    this.transport.updateNextNonceFromResponse(res);

    if (!res.ok) {
      throw new Error(`Failed to download historical version content: ${res.status}`);
    }

    const encryptedDek = res.headers.get('X-Encrypted-Dek') || '';
    const commitHash = res.headers.get('X-Commit-Hash') || '';
    const body = await res.arrayBuffer();

    return { body, encryptedDek, commitHash };
  }

  async revertNodeVersion(id: string, timestamp: number): Promise<VaultNodeResponse> {
    return this.transport.request<VaultNodeResponse>(`/vault/nodes/${id}/history/${timestamp}/revert`, {
      method: 'POST',
    });
  }

  async getStorageConfig(vaultId: string): Promise<{
    vaultId: string;
    provider: string;
    encryptedConfig: string | null;
    iv?: string;
    tag?: string;
  } | null> {
    const headers = await this.transport.getHeaders('GET', `/vaults/${vaultId}/storage-config`);
    const res = await fetch(`${this.transport.getBaseUrl()}/vaults/${vaultId}/storage-config`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });
    this.transport.updateNextNonceFromResponse(res);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to get storage config: ${res.status}`);
    }
    return await res.json();
  }

  async putStorageConfig(
    vaultId: string,
    payload: { provider: string; encryptedConfig: string; iv: string; tag?: string }
  ): Promise<void> {
    const headers = await this.transport.getHeaders('PUT', `/vaults/${vaultId}/storage-config`);
    const res = await fetch(`${this.transport.getBaseUrl()}/vaults/${vaultId}/storage-config`, {
      method: 'PUT',
      credentials: 'include',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    this.transport.updateNextNonceFromResponse(res);
    if (!res.ok) {
      throw new Error(`Failed to save storage config: ${res.status}`);
    }
  }

  async deleteStorageConfig(vaultId: string): Promise<void> {
    const headers = await this.transport.getHeaders('DELETE', `/vaults/${vaultId}/storage-config`);
    const res = await fetch(`${this.transport.getBaseUrl()}/vaults/${vaultId}/storage-config`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });
    this.transport.updateNextNonceFromResponse(res);
    if (!res.ok) {
      throw new Error(`Failed to delete storage config: ${res.status}`);
    }
  }
}
