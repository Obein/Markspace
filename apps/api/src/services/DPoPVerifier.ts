export interface DPoPHeader {
  typ: string;
  alg: string;
  jwk: {
    kty: string;
    crv: string;
    x: string;
    y: string;
  };
}

export interface DPoPPayload {
  jti: string;
  htm: string;
  htu: string;
  iat: number;
  nonce?: string;
}

export class DPoPVerifier {
  private static base64UrlDecode(str: string): Uint8Array {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  public static async verifyProof(
    dpopToken: string,
    expectedMethod: string,
    expectedPathname: string
  ): Promise<{ isValid: boolean; thumbprint: string; payload: DPoPPayload }> {
    const parts = dpopToken.split('.');
    if (parts.length !== 3) {
      throw new Error('BAD_REQUEST: Invalid DPoP proof token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const headerStr = new TextDecoder().decode(this.base64UrlDecode(headerB64));
    const payloadStr = new TextDecoder().decode(this.base64UrlDecode(payloadB64));

    const header = JSON.parse(headerStr) as DPoPHeader;
    const payload = JSON.parse(payloadStr) as DPoPPayload;

    if (header.typ !== 'dpop+jwt' || header.alg !== 'ES256' || !header.jwk) {
      throw new Error('BAD_REQUEST: Invalid DPoP header algorithm or typ');
    }

    // Import client public key
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      header.jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    // Verify ECDSA signature
    const signature = this.base64UrlDecode(signatureB64);
    const dataToVerify = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const isSigValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signature,
      dataToVerify
    );

    if (!isSigValid) {
      throw new Error('UNAUTHORIZED: Invalid DPoP proof cryptographic signature');
    }

    // Verify method & path
    if (payload.htm.toUpperCase() !== expectedMethod.toUpperCase()) {
      throw new Error(`UNAUTHORIZED: DPoP method mismatch (${payload.htm} vs ${expectedMethod})`);
    }

    if (!expectedPathname.endsWith(payload.htu) && !payload.htu.endsWith(expectedPathname)) {
      throw new Error(`UNAUTHORIZED: DPoP path mismatch (${payload.htu} vs ${expectedPathname})`);
    }

    // Calculate JWK Thumbprint
    const jwkString = JSON.stringify({
      crv: header.jwk.crv,
      kty: header.jwk.kty,
      x: header.jwk.x,
      y: header.jwk.y,
    });
    const thumbprintBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jwkString));
    const thumbprint = Array.from(new Uint8Array(thumbprintBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      isValid: true,
      thumbprint,
      payload,
    };
  }
}
