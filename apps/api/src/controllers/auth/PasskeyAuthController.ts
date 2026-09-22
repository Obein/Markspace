import { D1AuditLogRepository } from '../../infrastructure/D1AuditLogRepository';
import {
  PasskeyAuthResult,
  PasskeyAuthService,
  PasskeyLoginVerifyInput,
  PasskeyRegisterVerifyInput,
} from '../../services/PasskeyAuthService';
import { ApiResponse, RequestContext } from '../../types/http';
import { parseDeviceName } from './AuthCredentialController';

export class PasskeyAuthController {
  constructor(
    private readonly passkeyAuthService: PasskeyAuthService,
    private readonly auditLogRepo: D1AuditLogRepository
  ) {}

  private getRpInfo(ctx: RequestContext): { rpID: string; origin: string } {
    const url = new URL(ctx.request.url);
    const origin = url.origin;
    const rpID = url.hostname;
    return { rpID, origin };
  }

  private getClientIp(ctx: RequestContext): string {
    return (
      ctx.request.headers.get('CF-Connecting-IP') ||
      ctx.request.headers.get('X-Forwarded-For') ||
      '127.0.0.1'
    );
  }

  private getUserAgent(ctx: RequestContext): string {
    return ctx.request.headers.get('User-Agent') || 'Unknown Client';
  }

  private getGeoMetadata(ctx: RequestContext) {
    const cf = (ctx.request as any).cf;
    const lat = cf?.latitude ? parseFloat(String(cf.latitude)) : undefined;
    const lon = cf?.longitude ? parseFloat(String(cf.longitude)) : undefined;
    const city = cf?.city ? String(cf.city) : undefined;
    const country = cf?.country ? String(cf.country) : undefined;

    return {
      latitude: lat && !isNaN(lat) ? lat : undefined,
      longitude: lon && !isNaN(lon) ? lon : undefined,
      city,
      country,
    };
  }

  public async registerOptions(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as { username?: string };
    if (!body.username) {
      throw new Error('USERNAME_REQUIRED: Username is required for registration');
    }

    const { rpID } = this.getRpInfo(ctx);
    const options = await this.passkeyAuthService.generateRegistrationOptions(body.username, rpID);

    const response: ApiResponse = {
      success: true,
      data: options,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public async registerVerify(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as PasskeyRegisterVerifyInput;
    const { rpID, origin } = this.getRpInfo(ctx);
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);
    const deviceName = parseDeviceName(userAgent);
    const geo = this.getGeoMetadata(ctx);

    try {
      const result: PasskeyAuthResult = await this.passkeyAuthService.verifyRegistration(
        ctx.env.DB,
        { ...body, deviceName },
        ctx.env.JWT_SECRET,
        rpID,
        origin,
        {
          ipAddress: ip,
          userAgent,
          deviceName,
          ...geo,
        }
      );

      await this.auditLogRepo.recordLog({
        userId: result.user.id,
        username: result.user.username,
        action: 'PASSKEY_REGISTER',
        authMethod: 'WebAuthn FIDO2 / Passkey',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'User registered with Passkey and root UMK envelope',
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };

      const cookieMaxAge = 604800; // 7 days
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': `__Host-auth_refresh_token=${result.refreshToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${cookieMaxAge}`,
      });

      return new Response(JSON.stringify(response), {
        status: 201,
        headers,
      });
    } catch (err: unknown) {
      await this.auditLogRepo.recordLog({
        userId: 'anonymous',
        username: body.username || 'unknown',
        action: 'PASSKEY_REGISTER',
        authMethod: 'WebAuthn FIDO2 / Passkey',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : 'Registration failed',
      });
      throw err;
    }
  }

  public async loginOptions(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json().catch(() => ({}))) as { username?: string };
    const { rpID } = this.getRpInfo(ctx);
    const options = await this.passkeyAuthService.generateAuthenticationOptions(rpID, body.username);

    const response: ApiResponse = {
      success: true,
      data: options,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public async loginVerify(ctx: RequestContext): Promise<Response> {
    const body = (await ctx.request.json()) as PasskeyLoginVerifyInput;
    const { rpID, origin } = this.getRpInfo(ctx);
    const ip = this.getClientIp(ctx);
    const userAgent = this.getUserAgent(ctx);
    const deviceName = parseDeviceName(userAgent);
    const geo = this.getGeoMetadata(ctx);

    try {
      const result: PasskeyAuthResult = await this.passkeyAuthService.verifyAuthentication(
        ctx.env.DB,
        body,
        ctx.env.JWT_SECRET,
        rpID,
        origin,
        {
          rememberMe: body.rememberMe,
          ipAddress: ip,
          userAgent,
          deviceName,
          ...geo,
        }
      );

      await this.auditLogRepo.recordLog({
        userId: result.user.id,
        username: result.user.username,
        action: 'PASSKEY_LOGIN',
        authMethod: 'WebAuthn FIDO2 / Passkey',
        ipAddress: ip,
        userAgent,
        status: 'SUCCESS',
        details: 'Passkey login verified; UMK envelope & vaults dispatched',
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };

      const cookieMaxAge = body.rememberMe ? 604800 : 86400;
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': `__Host-auth_refresh_token=${result.refreshToken}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${cookieMaxAge}`,
      });

      return new Response(JSON.stringify(response), {
        status: 200,
        headers,
      });
    } catch (err: unknown) {
      await this.auditLogRepo.recordLog({
        userId: 'anonymous',
        username: body.username || 'unknown',
        action: 'PASSKEY_LOGIN',
        authMethod: 'WebAuthn FIDO2 / Passkey',
        ipAddress: ip,
        userAgent,
        status: 'FAILED',
        details: err instanceof Error ? err.message : 'Passkey login failed',
      });
      throw err;
    }
  }

  public async updateWrappedUmk(ctx: RequestContext): Promise<Response> {
    if (!ctx.user) {
      throw new Error('UNAUTHORIZED: Authentication required');
    }

    const body = (await ctx.request.json()) as { wrappedUmkByPrf?: string };
    if (!body.wrappedUmkByPrf) {
      throw new Error('INVALID_INPUT: wrappedUmkByPrf is required');
    }

    await this.passkeyAuthService.updateWrappedUmkByPrf(ctx.user.userId, body.wrappedUmkByPrf);

    const response: ApiResponse = {
      success: true,
      data: { updated: true },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public async getCryptoKeys(ctx: RequestContext): Promise<Response> {
    if (!ctx.user) {
      throw new Error('UNAUTHORIZED: Authentication required');
    }

    const userCryptoKeys = await this.passkeyAuthService.getUserCryptoKeys(ctx.user.userId);
    const vaults = await this.passkeyAuthService.getUserVaults(ctx.user.userId);

    const response: ApiResponse = {
      success: true,
      data: {
        userCryptoKeys,
        vaults,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  public async addCredential(ctx: RequestContext): Promise<Response> {
    if (!ctx.user) {
      throw new Error('UNAUTHORIZED: Authentication required');
    }

    const body = (await ctx.request.json()) as { response: any; deviceName?: string };
    const { rpID, origin } = this.getRpInfo(ctx);
    const userAgent = this.getUserAgent(ctx);
    const deviceName = body.deviceName || parseDeviceName(userAgent);

    await this.passkeyAuthService.addCredential(ctx.user.userId, body.response, rpID, origin, deviceName);

    const response: ApiResponse = {
      success: true,
      data: { added: true },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
