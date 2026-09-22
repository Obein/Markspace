import { HttpTransport } from './HttpTransport';
import { UserVaultItem } from '../../interfaces/IApiClient';

export class UserVaultApi {
  constructor(private readonly transport: HttpTransport) {}

  async listVaults(): Promise<UserVaultItem[]> {
    return this.transport.request<UserVaultItem[]>('/vaults', {
      method: 'GET',
    });
  }

  async createVault(data: {
    name: string;
    salt: string;
    wrappedVmk: string;
    encryptedStorageConfig?: string | null;
    isDefault?: boolean;
  }): Promise<UserVaultItem> {
    return this.transport.request<UserVaultItem>('/vaults', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVault(
    id: string,
    data: {
      name?: string;
      salt?: string;
      wrappedVmk?: string;
      encryptedStorageConfig?: string | null;
      isDefault?: boolean;
    }
  ): Promise<UserVaultItem> {
    return this.transport.request<UserVaultItem>(`/vaults/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVault(id: string): Promise<void> {
    await this.transport.request<{ deleted: boolean }>(`/vaults/${id}`, {
      method: 'DELETE',
    });
  }
}
