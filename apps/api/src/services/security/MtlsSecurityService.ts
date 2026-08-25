import { Env } from '../../types/env';

export interface MtlsVerificationResult {
  success: boolean;
  certPresented: boolean;
  certVerified: boolean;
  reason?: string;
  fingerprint?: string;
  subjectDn?: string;
  issuerDn?: string;
}

/**
 * MtlsSecurityService
 * 
 * Verifies mutual TLS (mTLS) machine identity on Cloudflare Workers edge.
 * Validates client certificates to prevent unauthorized horizontal movement across sensitive backend endpoints.
 */
export class MtlsSecurityService {
  /**
   * Determines if mTLS machine identity verification is strictly enforced in the current environment.
   */
  public static isMtlsEnforced(env: Env): boolean {
    if (!env) return false;
    const val = (env.ENFORCE_MTLS as any);
    return val === true || val === 'true' || val === '1';
  }

  /**
   * Inspects and validates mTLS client certificates from Cloudflare edge context.
   */
  public static verifyClientIdentity(request: Request): MtlsVerificationResult {
    const cf = (request as any).cf;
    const tlsAuth = cf?.tlsClientAuth;

    const certPresented = Boolean(tlsAuth?.certPresented === '1');
    const certVerified = tlsAuth?.certVerified === 'SUCCESS';
    const fingerprint = tlsAuth?.certFingerprintSHA256 || undefined;
    const subjectDn = tlsAuth?.certSubjectDN || undefined;
    const issuerDn = tlsAuth?.certIssuerDN || undefined;

    if (!certPresented) {
      return {
        success: false,
        certPresented: false,
        certVerified: false,
        reason: 'NO_CLIENT_CERTIFICATE: Client certificate was not presented during TLS handshake',
      };
    }

    if (!certVerified) {
      const failReason = tlsAuth?.certVerified || 'Verification failed';
      return {
        success: false,
        certPresented: true,
        certVerified: false,
        reason: `CLIENT_CERTIFICATE_INVALID: mTLS certificate validation failed (${failReason})`,
        fingerprint,
        subjectDn,
        issuerDn,
      };
    }

    return {
      success: true,
      certPresented: true,
      certVerified: true,
      fingerprint,
      subjectDn,
      issuerDn,
    };
  }

  /**
   * Evaluates whether an endpoint request passes mTLS policy.
   * If mTLS is not strictly enforced in environment and no cert is presented, passes.
   * If cert is presented, it MUST be valid regardless.
   * If mTLS is strictly enforced, cert MUST be presented and verified.
   */
  public static checkAccess(request: Request, env: Env): { allowed: boolean; errorResponse?: Response; result: MtlsVerificationResult } {
    const result = this.verifyClientIdentity(request);
    const enforced = this.isMtlsEnforced(env);

    if (enforced && (!result.certPresented || !result.certVerified)) {
      return {
        allowed: false,
        result,
        errorResponse: new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'MTLS_VERIFICATION_REQUIRED',
              message: result.reason || 'mTLS machine identity verification is strictly required for this endpoint.',
            },
            timestamp: new Date().toISOString(),
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        ),
      };
    }

    // If cert was presented but failed verification (even when not strictly enforced globally), reject for security
    if (result.certPresented && !result.certVerified) {
      return {
        allowed: false,
        result,
        errorResponse: new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'MTLS_CERTIFICATE_INVALID',
              message: result.reason || 'Presented mTLS client certificate is invalid or untrusted.',
            },
            timestamp: new Date().toISOString(),
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        ),
      };
    }

    return { allowed: true, result };
  }
}
