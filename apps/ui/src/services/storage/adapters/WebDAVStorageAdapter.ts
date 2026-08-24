import { WebDAVConfig, StorageTestResult } from '../ThirdPartyStorageTypes';

/**
 * WebDAV Protocol Storage Adapter for Nextcloud, Nutstore, NAS, and AList.
 */
export class WebDAVStorageAdapter {
  private config: WebDAVConfig;

  constructor(config: WebDAVConfig) {
    this.config = config;
  }

  /**
   * Tests WebDAV connectivity using a lightweight PROPFIND or OPTIONS request.
   */
  public async testConnection(): Promise<StorageTestResult> {
    const startTime = performance.now();
    try {
      if (!this.config.serverUrl) {
        return {
          success: false,
          message: 'Server URL is required.',
        };
      }

      const url = this.normalizeUrl(this.config.serverUrl, this.config.basePath);
      const headers: Record<string, string> = {
        Depth: '0',
      };

      if (this.config.username && this.config.password) {
        const credentials = btoa(`${this.config.username}:${this.config.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      // Try PROPFIND first, fallback to OPTIONS/HEAD
      const response = await fetch(url, {
        method: 'PROPFIND',
        headers,
      }).catch(async () => {
        // Fallback for servers not permitting PROPFIND in CORS preflight
        return fetch(url, {
          method: 'GET',
          headers,
        });
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (
        response.status === 207 || // Multi-Status (Standard WebDAV success)
        response.status === 200 ||
        response.status === 404 || // Server reachable, directory ready to be created
        response.status === 204
      ) {
        return {
          success: true,
          message: `Connected to WebDAV server (${latencyMs}ms)`,
          latencyMs,
          details: `HTTP ${response.status} ${response.statusText}`,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: 'Authentication failed (401 Unauthorized). Please check username or app password.',
          latencyMs,
        };
      }

      return {
        success: false,
        message: `WebDAV Server returned ${response.status}: ${response.statusText}`,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        message: err?.message || 'Failed to connect to WebDAV server. Check CORS or URL validity.',
        latencyMs,
      };
    }
  }

  private normalizeUrl(serverUrl: string, basePath?: string): string {
    let clean = serverUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    if (basePath && basePath.trim() !== '' && basePath.trim() !== '/') {
      const path = basePath.trim().startsWith('/') ? basePath.trim() : `/${basePath.trim()}`;
      clean = `${clean}${path}`;
    }
    return clean;
  }
}
