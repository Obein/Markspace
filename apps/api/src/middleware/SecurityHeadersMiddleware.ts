export class SecurityHeadersMiddleware {
  public static apply(headers: Headers, requestOrigin?: string | null): void {
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Content-Security-Policy', "require-trusted-types-for 'script';");
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set(
      'Access-Control-Expose-Headers',
      'X-Next-Nonce, DPoP, Set-Cookie, X-Encrypted-DEK, X-Commit-Hash, Content-Disposition, X-Client-IP'
    );
    if (requestOrigin) {
      headers.set('Access-Control-Allow-Origin', requestOrigin);
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Vary', 'Origin');
    }
  }

  public static applyHeaders(response: Response, requestOrigin?: string | null): Response {
    this.apply(response.headers, requestOrigin);
    return response;
  }
}
