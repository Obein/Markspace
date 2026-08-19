import { SystemConfig, UserAdminSummary, UserRole } from '../../interfaces/IApiClient';
import { HttpTransport } from './HttpTransport';

export class AdminApi {
  constructor(private readonly transport: HttpTransport) {}

  async adminListUsers(): Promise<UserAdminSummary[]> {
    return this.transport.request<UserAdminSummary[]>('/admin/users', {
      method: 'GET',
    });
  }

  async adminDeleteUser(id: string): Promise<{ message: string }> {
    return this.transport.request<{ message: string }>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async adminUpdateUserRole(id: string, role: UserRole): Promise<{ message: string }> {
    return this.transport.request<{ message: string }>(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async adminUpdateUserQuota(id: string, quotaBytes: number | null): Promise<{ message: string; storageQuotaBytes: number | null }> {
    return this.transport.request<{ message: string; storageQuotaBytes: number | null }>(`/admin/users/${id}/quota`, {
      method: 'PUT',
      body: JSON.stringify({ storageQuotaBytes: quotaBytes }),
    });
  }

  async adminGetSystemSettings(): Promise<SystemConfig> {
    return this.transport.request<SystemConfig>('/admin/settings', {
      method: 'GET',
    });
  }

  async adminUpdateSystemSettings(settings: Partial<SystemConfig>): Promise<SystemConfig> {
    return this.transport.request<SystemConfig>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async adminCleanupIdleUsers(): Promise<{ destroyedCount: number; destroyedUsernames: string[]; message: string }> {
    return this.transport.request<{ destroyedCount: number; destroyedUsernames: string[]; message: string }>(
      '/admin/maintenance/cleanup-idle-users',
      {
        method: 'POST',
      }
    );
  }
}
