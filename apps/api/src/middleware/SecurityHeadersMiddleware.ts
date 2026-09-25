export class SecurityHeadersMiddleware {
  public static apply(headers: Headers, allowedOrigin?: string | null): void {
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
    headers.set('Vary', 'Origin');
    if (allowedOrigin) {
      headers.set('Access-Control-Allow-Origin', allowedOrigin);
      headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  public static applyHeaders(response: Response, allowedOrigin?: string | null): Response {
    this.apply(response.headers, allowedOrigin);
    return response;
  }
}
