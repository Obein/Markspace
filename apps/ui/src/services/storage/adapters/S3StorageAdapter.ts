import { S3Config, StorageTestResult } from '../ThirdPartyStorageTypes';

/**
 * Lightweight browser-compatible S3 REST Client with AWS Signature V4.
 */
export class S3StorageAdapter {
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
  }

  /**
   * Tests S3 connectivity by sending a HEAD/GET request on the bucket.
   */
  public async testConnection(): Promise<StorageTestResult> {
    const startTime = performance.now();
    try {
      if (!this.config.endpoint || !this.config.bucketName) {
        return {
          success: false,
          message: 'Endpoint and Bucket Name are required.',
        };
      }

      const endpoint = this.normalizeEndpoint(this.config.endpoint);
      const url = this.config.forcePathStyle
        ? `${endpoint}/${this.config.bucketName}`
        : this.getVirtualHostUrl(endpoint, this.config.bucketName);

      // Perform ping request with auth header
      const headers = await this.signRequest('GET', url, {
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      });

      const response = await fetch(url, {
        method: 'GET',
        headers,
      }).catch((err) => {
        throw new Error(`Network request failed: ${err.message || 'CORS or unreachable endpoint'}`);
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (response.ok || response.status === 200 || response.status === 404 || response.status === 403) {
        // 200: Connected & bucket listed
        // 404/403: Endpoint reached successfully (bucket permissions / empty)
        if (response.status === 403 && !this.config.accessKeyId) {
          return {
            success: false,
            message: 'Authentication failed (403 Forbidden). Please verify Access Key ID & Secret.',
            latencyMs,
          };
        }
        return {
          success: true,
          message: `Connected to S3 successfully (${latencyMs}ms)`,
          latencyMs,
          details: `Status: ${response.status} ${response.statusText}`,
        };
      }

      return {
        success: false,
        message: `S3 Error ${response.status}: ${response.statusText}`,
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        message: err?.message || 'Failed to connect to S3 endpoint.',
        latencyMs,
      };
    }
  }

  private normalizeEndpoint(endpoint: string): string {
    let clean = endpoint.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean;
  }

  private getVirtualHostUrl(endpoint: string, bucket: string): string {
    const url = new URL(endpoint);
    return `${url.protocol}//${bucket}.${url.host}${url.pathname}`.replace(/\/+$/, '');
  }

  /**
   * Generates AWS Signature Version 4 Authorization headers.
   */
  private async signRequest(
    method: string,
    urlStr: string,
    extraHeaders: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const region = this.config.region || 'us-east-1';
    const service = 's3';

    const url = new URL(urlStr);
    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-date': amzDate,
      ...extraHeaders,
    };

    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      return headers;
    }

    try {
      // Simplified SigV4 HMAC computation using Web Crypto API
      const canonicalHeaders = Object.keys(headers)
        .sort()
        .map((k) => `${k.toLowerCase()}:${headers[k].trim()}\n`)
        .join('');
      const signedHeaders = Object.keys(headers)
        .sort()
        .map((k) => k.toLowerCase())
        .join(';');

      const canonicalRequest = [
        method,
        url.pathname || '/',
        url.search.slice(1),
        canonicalHeaders,
        signedHeaders,
        headers['x-amz-content-sha256'] || 'UNSIGNED-PAYLOAD',
      ].join('\n');

      const canonicalRequestHash = await this.sha256Hex(canonicalRequest);
      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
      const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

      const signingKey = await this.getSignatureKey(this.config.secretAccessKey, dateStamp, region, service);
      const signature = await this.hmacHex(signingKey, stringToSign);

      headers['Authorization'] =
        `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    } catch (_) {
      // Fallback to basic headers if WebCrypto is limited
    }

    return headers;
  }

  private async sha256Hex(str: string): Promise<string> {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hmac(key: CryptoKey, data: string): Promise<ArrayBuffer> {
    return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  }

  private async hmacHex(key: CryptoKey, data: string): Promise<string> {
    const sig = await this.hmac(key, data);
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async getSignatureKey(
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Promise<CryptoKey> {
    const importKey = (raw: BufferSource) =>
      crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

    const kDateKey = await importKey(new TextEncoder().encode(`AWS4${key}`));
    const kDate = await this.hmac(kDateKey, dateStamp);

    const kRegionKey = await importKey(kDate);
    const kRegion = await this.hmac(kRegionKey, regionName);

    const kServiceKey = await importKey(kRegion);
    const kService = await this.hmac(kServiceKey, serviceName);

    const kSigningKey = await importKey(kService);
    const kSigning = await this.hmac(kSigningKey, 'aws4_request');

    return importKey(kSigning);
  }
}
