import { DPoPSigner } from '../../crypto/DPoPSigner';
import { AuthResponse } from '../../interfaces/IApiClient';

export class HttpTransport {
  private inMemoryAccessToken: string | null = null;
  private tokenExpiresAt = 0;
  private refreshPromise: Promise<string | null> | null = null;
  private readonly baseUrl: string;
  private currentNonce: string | null = null;
  private currentNonceTimestamp = 0;
  private onForceLogoutCallback: ((reason: string) => void) | null = null;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  getBaseUrl(): string {
    return this.baseUrl;
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

  clearAuth(): void {
    this.setToken('');
    this.currentNonce = null;
    this.currentNonceTimestamp = 0;
  }

  /**
   * Retrieves a valid Access Token, triggering proactive silent refresh if near expiry.
   */
  async getValidAccessToken(): Promise<string | null> {
    if (this.inMemoryAccessToken && Date.now() < this.tokenExpiresAt) {
      return this.inMemoryAccessToken;
    }
    return this.silentRefresh();
  }

  /**
   * Proactive / Reactive Silent Refresh via HttpOnly Cookie (RTR)
   */
  async silentRefresh(): Promise<string | null> {
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
   * AOP Aspect: Perform initial Nonce handshake if not already cached or expired.
   */
  async getNonce(): Promise<string> {
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
  async getHeaders(method: string, path: string): Promise<Record<string, string>> {
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

  updateNextNonceFromResponse(res: Response): void {
    const nextNonceHeader = res.headers.get('X-Next-Nonce');
    if (nextNonceHeader) {
      this.currentNonce = nextNonceHeader;
      this.currentNonceTimestamp = Date.now();
    }
  }

  /**
   * Core AOP HTTP Request Pipeline with Automatic Header Nonce Handshake & Dispatch.
   */
  async request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
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

    this.updateNextNonceFromResponse(res);

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
        this.clearAuth();
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
}
