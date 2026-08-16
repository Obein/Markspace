export class DPoPSigner {
  private static keyPair: CryptoKeyPair | null = null;

  private static base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private static async getOrCreateKeyPair(): Promise<CryptoKeyPair> {
    if (!this.keyPair) {
      // Non-extractable ECDSA P-256 Key Pair
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        false, // CRITICAL: Non-extractable private key sandbox
        ['sign', 'verify']
      );
    }
    return this.keyPair;
  }

  public static async createProof(
    httpMethod: string,
    httpUrl: string,
    nonce?: string
  ): Promise<string> {
    const keyPair = await this.getOrCreateKeyPair();
    const publicJwk = (await window.crypto.subtle.exportKey('jwk', keyPair.publicKey)) as any;

    const header = {
      typ: 'dpop+jwt',
      alg: 'ES256',
      jwk: {
        kty: publicJwk.kty,
        crv: publicJwk.crv,
        x: publicJwk.x,
        y: publicJwk.y,
      },
    };

    const payload = {
      jti: `dpop_${crypto.randomUUID()}`,
      htm: httpMethod.toUpperCase(),
      htu: httpUrl,
      iat: Math.floor(Date.now() / 1000),
      nonce: nonce || undefined,
    };

    const encoder = new TextEncoder();
    const headerB64 = this.base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const payloadB64 = this.base64UrlEncode(encoder.encode(JSON.stringify(payload)));
    const dataToSign = encoder.encode(`${headerB64}.${payloadB64}`);

    const signatureBuffer = await window.crypto.subtle.sign(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      keyPair.privateKey,
      dataToSign
    );

    const signatureB64 = this.base64UrlEncode(signatureBuffer);
    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }
}
