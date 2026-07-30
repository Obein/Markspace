import { IPasswordHasher } from '../interfaces/IPasswordHasher';

export class WebCryptoHasher implements IPasswordHasher {
  generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async hash(plainToken: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${plainToken}:${salt}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async verify(plainToken: string, hash: string, salt: string): Promise<boolean> {
    const computedHash = await this.hash(plainToken, salt);
    return computedHash === hash;
  }
}
