import { ITokenService } from '../interfaces/ITokenService';
import { UserRole } from '../types/domain';
import { UserPayload } from '../types/http';

export class JwtTokenService implements ITokenService {
  private base64UrlEncode(str: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return this.arrayBufferToBase64Url(data.buffer as ArrayBuffer);
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private base64UrlDecode(base64Url: string): string {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  private async getHmacKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    return crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }

  async generateToken(payload: UserPayload, secret: string, expiresInSeconds = 86400 * 7): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const key = await this.getHmacKey(secret);
    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
    const encodedSignature = this.arrayBufferToBase64Url(signatureBuffer);

    return `${dataToSign}.${encodedSignature}`;
  }

  async verifyToken(token: string, secret: string): Promise<UserPayload | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      const dataToVerify = `${encodedHeader}.${encodedPayload}`;

      const key = await this.getHmacKey(secret);

      let base64Sig = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
      while (base64Sig.length % 4 !== 0) {
        base64Sig += '=';
      }
      const binarySig = atob(base64Sig);
      const signatureBytes = new Uint8Array(binarySig.length);
      for (let i = 0; i < binarySig.length; i++) {
        signatureBytes[i] = binarySig.charCodeAt(i);
      }

      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBytes,
        new TextEncoder().encode(dataToVerify)
      );

      if (!isValid) return null;

      const payloadJson = this.base64UrlDecode(encodedPayload);
      const decoded = JSON.parse(payloadJson) as UserPayload & { exp?: number };

      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return null;
      }

      return {
        userId: decoded.userId,
        username: decoded.username,
        role: (decoded.role as UserRole) || 'user',
      };
    } catch {
      return null;
    }
  }
}
