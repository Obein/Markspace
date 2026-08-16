import { ITokenService } from '../interfaces/ITokenService';
import { RequestContext } from '../types/http';

export class AuthMiddleware {
  constructor(private readonly tokenService: ITokenService) {}

  private extractCookieToken(cookieHeader: string | null): string | null {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name === '__Host-auth_token' || name === 'auth_token') {
        return valueParts.join('=').trim();
      }
    }
    return null;
  }

  async authenticate(ctx: RequestContext): Promise<RequestContext> {
    let token: string | null = null;

    const authHeader = ctx.request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      const cookieHeader = ctx.request.headers.get('Cookie');
      token = this.extractCookieToken(cookieHeader);
    }

    if (!token) {
      throw new Error('UNAUTHORIZED: Missing or invalid Authorization credentials');
    }

    const userPayload = await this.tokenService.verifyToken(token, ctx.env.JWT_SECRET);
    if (!userPayload) {
      throw new Error('UNAUTHORIZED: Invalid or expired access token');
    }

    return {
      ...ctx,
      user: userPayload,
    };
  }
}
