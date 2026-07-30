import { ITokenService } from '../interfaces/ITokenService';
import { RequestContext } from '../types/http';

export class AuthMiddleware {
  constructor(private readonly tokenService: ITokenService) {}

  async authenticate(ctx: RequestContext): Promise<RequestContext> {
    const authHeader = ctx.request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('UNAUTHORIZED: Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new Error('UNAUTHORIZED: Bearer token is empty');
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
