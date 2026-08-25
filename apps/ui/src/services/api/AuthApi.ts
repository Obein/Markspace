import { ActiveSession, AuditLogResponse, AuthResponse } from '../../interfaces/IApiClient';
import { HttpTransport } from './HttpTransport';

export class AuthApi {
  constructor(private readonly transport: HttpTransport) {}

  /**
   * App Startup session initializer: checks for active HttpOnly session cookie.
   */
  async initSession(): Promise<AuthResponse | null> {
    try {
      const headers = await this.transport.getHeaders('POST', '/auth/refresh');
      const res = await fetch(`${this.transport.getBaseUrl()}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      this.transport.updateResponseHeaders(res);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.data?.accessToken) {
        this.transport.setToken('');
        return null;
      }

      const data = json.data as AuthResponse;
      this.transport.setToken(data.accessToken, data.expiresIn || 900);
      return data;
    } catch {
      this.transport.setToken('');
      return null;
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const res = await this.transport.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
    this.transport.setToken(res.accessToken || res.token || '', res.expiresIn || 900);
    return res;
  }

  async prelogin(username: string): Promise<{ exists: boolean; isTotpEnabled: boolean; serverTime: number }> {
    return this.transport.request<{ exists: boolean; isTotpEnabled: boolean; serverTime: number }>('/auth/prelogin', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  async register(username: string, authToken: string, rememberMe?: boolean): Promise<AuthResponse> {
    const data = await this.transport.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, authToken, rememberMe }),
    });
    this.transport.setToken(data.accessToken || data.token || '', data.expiresIn || 900);
    return data;
  }

  async login(username: string, authToken: string, totpCode?: string, rememberMe?: boolean): Promise<AuthResponse> {
    const data = await this.transport.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, authToken, totpCode, rememberMe }),
    });
    this.transport.setToken(data.accessToken || data.token || '', data.expiresIn || 900);
    return data;
  }

  async loginPasswordlessTotp(username: string, totpCode: string, rememberMe?: boolean): Promise<AuthResponse> {
    const data = await this.transport.request<AuthResponse>('/auth/login/passwordless-totp', {
      method: 'POST',
      body: JSON.stringify({ username, totpCode, rememberMe }),
    });
    this.transport.setToken(data.accessToken || data.token || '', data.expiresIn || 900);
    return data;
  }

  async getSessions(): Promise<ActiveSession[]> {
    return this.transport.request<ActiveSession[]>('/auth/sessions', {
      method: 'GET',
    });
  }

  async revokeSession(id: string): Promise<void> {
    await this.transport.request<{ message: string }>(`/auth/sessions/${id}/revoke`, {
      method: 'POST',
    });
  }

  async revokeOtherSessions(): Promise<void> {
    await this.transport.request<{ message: string }>('/auth/sessions/revoke-others', {
      method: 'POST',
    });
  }

  async logout(): Promise<void> {
    try {
      const headers = await this.transport.getHeaders('POST', '/auth/logout');
      await fetch(`${this.transport.getBaseUrl()}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    } catch (err) {
      console.warn('Failed to record logout on backend', err);
    } finally {
      this.transport.clearAuth();
    }
  }

  async setupTotp(): Promise<{ secret: string; otpauthUri: string; expiresAt: number }> {
    return this.transport.request<{ secret: string; otpauthUri: string; expiresAt: number }>('/auth/totp/setup', {
      method: 'POST',
    });
  }

  async enableTotp(secret: string, code: string): Promise<{ message: string }> {
    return this.transport.request<{ message: string }>('/auth/totp/enable', {
      method: 'POST',
      body: JSON.stringify({ secret, code }),
    });
  }

  async disableTotp(code: string): Promise<{ message: string }> {
    return this.transport.request<{ message: string }>('/auth/totp/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getAuditLogs(): Promise<AuditLogResponse[]> {
    return this.transport.request<AuditLogResponse[]>('/auth/audit-logs', {
      method: 'GET',
    });
  }
}
