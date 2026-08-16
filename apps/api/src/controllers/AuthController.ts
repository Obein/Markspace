import { AuthService } from '../services/AuthService';
import { NonceService } from '../services/NonceService';
import { LoginDTO, RegisterDTO } from '../types/domain';
import { ApiResponse, RequestContext } from '../types/http';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly nonceService: NonceService
  ) {}

  async getNonce(_ctx: RequestContext): Promise<Response> {
    const nonceInfo = this.nonceService.generateNonce();
    const response: ApiResponse = {
      success: true,
      data: nonceInfo,
      timestamp: new Date().toISOString(),
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async register(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as RegisterDTO & { nonce?: string };

    // Anti-replay nonce check if nonce provided
    if (body.nonce && !this.nonceService.consumeNonce(body.nonce)) {
      throw new Error('UNAUTHORIZED: Nonce expired or already consumed');
    }

    const result = await this.authService.register(body, ctx.env.JWT_SECRET);
    const nextNonce = this.nonceService.generateNonce();

    const response: ApiResponse = {
      success: true,
      data: {
        ...result,
        nextNonce: nextNonce.nonce,
      },
      timestamp: new Date().toISOString(),
    };

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': `__Host-auth_token=${result.token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
    });

    return new Response(JSON.stringify(response), {
      status: 201,
      headers,
    });
  }

  async login(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as LoginDTO & { nonce?: string };

    // Anti-replay nonce check if nonce provided
    if (body.nonce && !this.nonceService.consumeNonce(body.nonce)) {
      throw new Error('UNAUTHORIZED: Nonce expired or already consumed');
    }

    const result = await this.authService.login(body, ctx.env.JWT_SECRET);
    const nextNonce = this.nonceService.generateNonce();

    const response: ApiResponse = {
      success: true,
      data: {
        ...result,
        nextNonce: nextNonce.nonce,
      },
      timestamp: new Date().toISOString(),
    };

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': `__Host-auth_token=${result.token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers,
    });
  }
}
