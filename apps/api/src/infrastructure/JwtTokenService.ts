import { ITokenService, TokenPair } from '../interfaces/ITokenService';
import { UserRole } from '../types/domain';
import { UserPayload } from '../types/http';

export class JwtTokenService implements ITokenService {
  private readonly atTtlSeconds = 60; // 1 minute Access Token (as requested)
  private readonly rtTtlSeconds = 86400; // 1 day Refresh Token (as requested)

  private base64UrlEncode(str: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return this.arrayBufferToBase64Url(data.buffer as ArrayBuffer);
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private base64UrlDecode(base64Url: string): string {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  private async getHmacKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    return crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }

  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(str));
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private generateRandomHex(byteCount: number): string {
    const array = new Uint8Array(byteCount);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  public async generateAccessToken(
    payload: UserPayload,
    secret: string,
    expiresInSeconds: number = this.atTtlSeconds
  ): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const jti = `at_${this.generateRandomHex(16)}`;
    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
      jti,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const key = await this.getHmacKey(secret);
    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign));
    const encodedSignature = this.arrayBufferToBase64Url(signatureBuffer);

    return `${dataToSign}.${encodedSignature}`;
  }

  public async verifyAccessToken(token: string, secret: string): Promise<UserPayload | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      const dataToVerify = `${encodedHeader}.${encodedPayload}`;

      const key = await this.getHmacKey(secret);

      let base64Sig = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
      while (base64Sig.length % 4 !== 0) {
        base64Sig += '=';
      }
      const binarySig = atob(base64Sig);
      const signatureBytes = new Uint8Array(binarySig.length);
      for (let i = 0; i < binarySig.length; i++) {
        signatureBytes[i] = binarySig.charCodeAt(i);
      }

      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBytes,
        new TextEncoder().encode(dataToVerify)
      );

      if (!isValid) return null;

      const payloadJson = this.base64UrlDecode(encodedPayload);
      const decoded = JSON.parse(payloadJson) as UserPayload & { exp?: number; jti?: string };

      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return null;
      }

      return {
        userId: decoded.userId,
        username: decoded.username,
        role: (decoded.role as UserRole) || 'user',
      };
    } catch {
      return null;
    }
  }

  // Backward-compatible aliases
  public async generateToken(
    payload: UserPayload,
    secret: string,
    expiresInSeconds?: number
  ): Promise<string> {
    return this.generateAccessToken(payload, secret, expiresInSeconds);
  }

  public async verifyToken(token: string, secret: string): Promise<UserPayload | null> {
    return this.verifyAccessToken(token, secret);
  }

  /**
   * Issues an initial TokenPair for a newly authenticated session.
   */
  public async issueInitialTokenPair(
    db: D1Database,
    userId: string,
    payload: UserPayload,
    secret: string,
    dpopJkt?: string
  ): Promise<TokenPair> {
    const familyId = `fam_${this.generateRandomHex(16)}`;
    const generation = 0;
    const now = Date.now();

    // 1. Initialize Token Family in D1
    await db
      .prepare(
        `INSERT INTO token_families (id, user_id, active_generation, is_revoked, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?)`
      )
      .bind(familyId, userId, generation, now, now)
      .run();

    // 2. Generate Refresh Token
    const rawRefreshToken = `rt_${this.generateRandomHex(32)}`;
    const tokenHash = await this.hashString(rawRefreshToken);
    const expiresAt = now + this.rtTtlSeconds * 1000;

    await db
      .prepare(
        `INSERT INTO refresh_tokens (token_hash, family_id, generation, user_id, dpop_jkt, expires_at, is_used, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .bind(tokenHash, familyId, generation, userId, dpopJkt || null, expiresAt, now)
      .run();

    // 3. Generate short-lived Access Token (1 min)
    const accessToken = await this.generateAccessToken(payload, secret, this.atTtlSeconds);

    return {
      accessToken,
      accessTokenJti: `at_${this.generateRandomHex(16)}`,
      rawRefreshToken,
      familyId,
      generation,
      expiresInSeconds: this.atTtlSeconds,
    };
  }

  /**
   * Rotates a Refresh Token (RTR) and issues a fresh short-lived Access Token.
   * Enforces Token Family Tree tracking & automated breach/reuse detection.
   */
  public async rotateRefreshToken(
    db: D1Database,
    rawOldRefreshToken: string,
    secret: string,
    presentedDpopJkt?: string
  ): Promise<TokenPair & { userPayload: UserPayload }> {
    const oldTokenHash = await this.hashString(rawOldRefreshToken);

    const record = await db
      .prepare(`SELECT * FROM refresh_tokens WHERE token_hash = ?`)
      .bind(oldTokenHash)
      .first<{
        token_hash: string;
        family_id: string;
        generation: number;
        user_id: string;
        dpop_jkt: string | null;
        expires_at: number;
        is_used: number;
      }>();

    if (!record) {
      throw new Error('INVALID_REFRESH_TOKEN: Token not found');
    }

    const family = await db
      .prepare(`SELECT * FROM token_families WHERE id = ?`)
      .bind(record.family_id)
      .first<{
        id: string;
        user_id: string;
        active_generation: number;
        is_revoked: number;
      }>();

    if (!family || family.is_revoked === 1) {
      throw new Error('SESSION_REVOKED: Session has been revoked or expired');
    }

    if (Date.now() > record.expires_at) {
      throw new Error('EXPIRED_REFRESH_TOKEN: Refresh token has expired');
    }

    if (record.dpop_jkt && presentedDpopJkt && record.dpop_jkt !== presentedDpopJkt) {
      await this.revokeFamily(db, record.family_id, 'DPOP_DEVICE_MISMATCH');
      throw new Error('SECURITY_ALERT: DPoP device key mismatch during token refresh');
    }

    // BREACH DETECTION: If an already used token is presented again (replay attack)
    if (record.is_used === 1 || record.generation < family.active_generation) {
      await this.revokeFamily(
        db,
        record.family_id,
        `REUSE_DETECTED: Stale generation ${record.generation} presented (Active is ${family.active_generation})`
      );
      throw new Error('BREACH_DETECTED: Refresh token reuse detected. Entire session revoked.');
    }

    // Fetch user details for the new Access Token
    const userRow = await db
      .prepare(`SELECT id, username, role FROM users WHERE id = ?`)
      .bind(record.user_id)
      .first<{ id: string; username: string; role: string }>();

    if (!userRow) {
      throw new Error('USER_NOT_FOUND: User associated with token not found');
    }

    const userPayload: UserPayload = {
      userId: userRow.id,
      username: userRow.username,
      role: (userRow.role as UserRole) || 'user',
    };

    const nextGeneration = record.generation + 1;
    const now = Date.now();
    const newRawRefreshToken = `rt_${this.generateRandomHex(32)}`;
    const newTokenHash = await this.hashString(newRawRefreshToken);
    const newExpiresAt = now + this.rtTtlSeconds * 1000;

    // Atomic D1 batch execution: Mark old token used, insert next token, advance active generation
    await db.batch([
      db
        .prepare(`UPDATE refresh_tokens SET is_used = 1 WHERE token_hash = ?`)
        .bind(oldTokenHash),
      db
        .prepare(
          `INSERT INTO refresh_tokens (token_hash, family_id, generation, user_id, dpop_jkt, expires_at, is_used, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
        )
        .bind(
          newTokenHash,
          record.family_id,
          nextGeneration,
          record.user_id,
          record.dpop_jkt,
          newExpiresAt,
          now
        ),
      db
        .prepare(
          `UPDATE token_families SET active_generation = ?, updated_at = ? WHERE id = ?`
        )
        .bind(nextGeneration, now, record.family_id),
    ]);

    const newAccessToken = await this.generateAccessToken(userPayload, secret, this.atTtlSeconds);

    return {
      accessToken: newAccessToken,
      accessTokenJti: `at_${this.generateRandomHex(16)}`,
      rawRefreshToken: newRawRefreshToken,
      familyId: record.family_id,
      generation: nextGeneration,
      expiresInSeconds: this.atTtlSeconds,
      userPayload,
    };
  }

  public async revokeFamily(db: D1Database, familyId: string, reason = 'LOGOUT'): Promise<void> {
    const now = Date.now();
    await db
      .prepare(`UPDATE token_families SET is_revoked = 1, revoked_reason = ?, updated_at = ? WHERE id = ?`)
      .bind(reason, now, familyId)
      .run();
  }

  public async revokeAllUserFamilies(db: D1Database, userId: string): Promise<void> {
    const now = Date.now();
    await db
      .prepare(`UPDATE token_families SET is_revoked = 1, revoked_reason = 'REVOKE_ALL_SESSIONS', updated_at = ? WHERE user_id = ?`)
      .bind(now, userId)
      .run();
  }
}
