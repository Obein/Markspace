import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { D1WebAuthnRepository } from '../infrastructure/D1WebAuthnRepository';
import { D1UserVaultRepository } from '../infrastructure/D1UserVaultRepository';
import { IUserRepository } from '../interfaces/IUserRepository';
import { ITokenService, IssueTokenOptions } from '../interfaces/ITokenService';
import { UserRole } from '../types/domain';

export interface PasskeyRegisterVerifyInput {
  username: string;
  response: RegistrationResponseJSON;
  wrappedUmkByPrf?: string;
  wrappedUmkByRecovery: string;
  recoverySalt: string;
  initialVault?: {
    name: string;
    salt: string;
    wrappedVmk: string;
  };
  deviceName?: string;
}

export interface PasskeyLoginVerifyInput {
  response: AuthenticationResponseJSON;
  username?: string;
  rememberMe?: boolean;
}

export interface PasskeyAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    role: UserRole;
  };
  userCryptoKeys: {
    wrappedUmkByPrf: string | null;
    wrappedUmkByRecovery: string;
    recoverySalt: string;
  };
  vaults: Array<{
    id: string;
    name: string;
    salt: string;
    wrappedVmk: string;
    encryptedStorageConfig: string | null;
    isDefault: boolean;
  }>;
}

export class PasskeyAuthService {
  constructor(
    private readonly webAuthnRepo: D1WebAuthnRepository,
    private readonly userVaultRepo: D1UserVaultRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  public static bufferToBase64URL(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  public static base64URLToBuffer(base64url: string): Uint8Array<ArrayBuffer> {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Generates WebAuthn registration options for a new username.
   */
  public async generateRegistrationOptions(
    username: string,
    rpID: string,
    rpName: string = 'Markspace E2EE Vault'
  ) {
    const cleanUsername = username.trim().toLowerCase();
    const exists = await this.userRepo.existsByUsername(cleanUsername);
    if (exists) {
      throw new Error('USER_EXISTS: Username is already taken');
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: cleanUsername,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    await this.webAuthnRepo.saveChallenge(options.challenge, 'registration', undefined, 300);
    return options;
  }

  /**
   * Verifies WebAuthn registration response and registers user, UMK envelope, and default vault.
   */
  public async verifyRegistration(
    db: D1Database,
    input: PasskeyRegisterVerifyInput,
    jwtSecret: string,
    expectedRPID: string,
    expectedOrigin: string,
    tokenOptions?: IssueTokenOptions
  ): Promise<PasskeyAuthResult> {
    const cleanUsername = input.username.trim().toLowerCase();
    
    // Look up challenge by response clientDataJSON challenge
    const clientDataObj = JSON.parse(atob(input.response.response.clientDataJSON.replace(/-/g, '+').replace(/_/g, '/')));
    const challengeStr = clientDataObj.challenge;
    const challengeRecord = await this.webAuthnRepo.getChallenge(challengeStr);

    if (!challengeRecord || challengeRecord.type !== 'registration') {
      throw new Error('CHALLENGE_EXPIRED: Registration challenge not found or expired');
    }

    const verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin,
      expectedRPID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('VERIFICATION_FAILED: Passkey registration verification failed');
    }

    // Clean up consumed challenge
    await this.webAuthnRepo.deleteChallenge(challengeRecord.challenge);

    const { credential, aaguid } = verification.registrationInfo;
    const userId = crypto.randomUUID();
    const totalUsers = await this.userRepo.countTotalUsers();
    const role: UserRole = totalUsers === 0 ? 'admin' : 'user';

    // 1. Create User
    const now = Date.now();
    await this.userRepo.create({
      id: userId,
      username: cleanUsername,
      authTokenHash: 'PASSKEY_AUTH',
      salt: 'PASSKEY_SALT',
      role,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    });

    // 2. Save WebAuthn Credential
    const publicKeyBase64Url = PasskeyAuthService.bufferToBase64URL(credential.publicKey);
    await this.webAuthnRepo.saveCredential({
      id: credential.id,
      userId,
      publicKey: publicKeyBase64Url,
      counter: credential.counter,
      transports: JSON.stringify(input.response.response.transports || []),
      deviceName: input.deviceName || 'Passkey Device',
      aaguid: aaguid || undefined,
    });

    // 3. Save User Crypto Keys (UMK Envelope)
    await this.webAuthnRepo.saveUserCryptoKeys({
      userId,
      wrappedUmkByPrf: input.wrappedUmkByPrf || null,
      wrappedUmkByRecovery: input.wrappedUmkByRecovery,
      recoverySalt: input.recoverySalt,
    });

    // 4. Create Initial Default Vault
    const initialVault = input.initialVault || {
      name: 'Main Vault',
      salt: crypto.randomUUID().replace(/-/g, ''),
      wrappedVmk: '',
    };

    const vaultId = crypto.randomUUID();
    const createdVault = await this.userVaultRepo.createVault({
      id: vaultId,
      userId,
      name: initialVault.name,
      salt: initialVault.salt,
      wrappedVmk: initialVault.wrappedVmk,
      isDefault: true,
    });

    // 5. Issue JWT & Refresh Tokens
    const tokenPair = await this.tokenService.issueInitialTokenPair(
      db,
      userId,
      {
        userId,
        username: cleanUsername,
        role,
      },
      jwtSecret,
      tokenOptions
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.rawRefreshToken,
      expiresIn: tokenPair.expiresInSeconds,
      user: {
        id: userId,
        username: cleanUsername,
        role,
      },
      userCryptoKeys: {
        wrappedUmkByPrf: input.wrappedUmkByPrf || null,
        wrappedUmkByRecovery: input.wrappedUmkByRecovery,
        recoverySalt: input.recoverySalt,
      },
      vaults: [createdVault],
    };
  }

  /**
   * Generates WebAuthn authentication options.
   * If username is provided, restricts allowCredentials to that user's devices.
   */
  public async generateAuthenticationOptions(rpID: string, username?: string) {
    let allowCredentials;

    if (username) {
      const cleanUsername = username.trim().toLowerCase();
      const user = await this.userRepo.findByUsername(cleanUsername);
      if (user) {
        const credentials = await this.webAuthnRepo.findCredentialsByUserId(user.id);
        allowCredentials = credentials.map((cred) => ({
          id: cred.id,
          transports: cred.transports ? JSON.parse(cred.transports) : undefined,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    await this.webAuthnRepo.saveChallenge(options.challenge, 'authentication', undefined, 300);
    return options;
  }

  /**
   * Verifies WebAuthn assertion response, updates counter, and returns tokens + UMK envelopes + vaults.
   */
  public async verifyAuthentication(
    db: D1Database,
    input: PasskeyLoginVerifyInput,
    jwtSecret: string,
    expectedRPID: string,
    expectedOrigin: string,
    tokenOptions?: IssueTokenOptions
  ): Promise<PasskeyAuthResult> {
    const clientDataObj = JSON.parse(atob(input.response.response.clientDataJSON.replace(/-/g, '+').replace(/_/g, '/')));
    const challengeStr = clientDataObj.challenge;
    const challengeRecord = await this.webAuthnRepo.getChallenge(challengeStr);

    if (!challengeRecord || challengeRecord.type !== 'authentication') {
      throw new Error('CHALLENGE_EXPIRED: Authentication challenge not found or expired');
    }

    const credentialRecord = await this.webAuthnRepo.findCredentialById(input.response.id);
    if (!credentialRecord) {
      throw new Error('CREDENTIAL_NOT_FOUND: Passkey credential is not registered with Markspace');
    }

    const user = await this.userRepo.findById(credentialRecord.userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND: User account associated with this Passkey does not exist');
    }

    const verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin,
      expectedRPID,
      credential: {
        id: credentialRecord.id,
        publicKey: PasskeyAuthService.base64URLToBuffer(credentialRecord.publicKey),
        counter: credentialRecord.counter,
        transports: credentialRecord.transports ? JSON.parse(credentialRecord.transports) : undefined,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      throw new Error('VERIFICATION_FAILED: Passkey signature verification failed');
    }

    // Clean up consumed challenge & update counter
    await this.webAuthnRepo.deleteChallenge(challengeRecord.challenge);
    await this.webAuthnRepo.updateCredentialCounter(credentialRecord.id, verification.authenticationInfo.newCounter);

    // Fetch user crypto keys (UMK envelopes) and user vaults
    const userCryptoKeys = await this.webAuthnRepo.getUserCryptoKeys(user.id);
    if (!userCryptoKeys) {
      throw new Error('CRYPTO_KEYS_NOT_FOUND: User root cryptographic envelope is missing');
    }

    const vaults = await this.userVaultRepo.getVaultsByUserId(user.id);

    // Issue JWT & Refresh Tokens
    const tokenPair = await this.tokenService.issueInitialTokenPair(
      db,
      user.id,
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      jwtSecret,
      tokenOptions
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.rawRefreshToken,
      expiresIn: tokenPair.expiresInSeconds,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      userCryptoKeys: {
        wrappedUmkByPrf: userCryptoKeys.wrappedUmkByPrf,
        wrappedUmkByRecovery: userCryptoKeys.wrappedUmkByRecovery,
        recoverySalt: userCryptoKeys.recoverySalt,
      },
      vaults,
    };
  }

  /**
   * Rebinds or updates wrapped UMK by PRF for an authenticated user on a new device.
   */
  public async updateWrappedUmkByPrf(userId: string, wrappedUmkByPrf: string): Promise<void> {
    await this.webAuthnRepo.updateWrappedUmkByPrf(userId, wrappedUmkByPrf);
  }

  /**
   * Gets user crypto keys envelope for an authenticated user.
   */
  public async getUserCryptoKeys(userId: string) {
    return this.webAuthnRepo.getUserCryptoKeys(userId);
  }

  /**
   * Gets all vaults belonging to an authenticated user.
   */
  public async getUserVaults(userId: string) {
    return this.userVaultRepo.getVaultsByUserId(userId);
  }

  /**
   * Registers an additional Passkey device to an existing authenticated user account.
   */
  public async addCredential(
    userId: string,
    response: RegistrationResponseJSON,
    expectedRPID: string,
    expectedOrigin: string,
    deviceName?: string
  ): Promise<void> {
    const clientDataObj = JSON.parse(atob(response.response.clientDataJSON.replace(/-/g, '+').replace(/_/g, '/')));
    const challengeStr = clientDataObj.challenge;
    const challengeRecord = await this.webAuthnRepo.getChallenge(challengeStr);

    if (!challengeRecord || challengeRecord.type !== 'registration') {
      throw new Error('CHALLENGE_EXPIRED: Registration challenge expired');
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin,
      expectedRPID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('VERIFICATION_FAILED: Device Passkey registration failed');
    }

    await this.webAuthnRepo.deleteChallenge(challengeRecord.challenge);
    const { credential, aaguid } = verification.registrationInfo;
    const publicKeyBase64Url = PasskeyAuthService.bufferToBase64URL(credential.publicKey);

    await this.webAuthnRepo.saveCredential({
      id: credential.id,
      userId,
      publicKey: publicKeyBase64Url,
      counter: credential.counter,
      transports: JSON.stringify(response.response.transports || []),
      deviceName: deviceName || 'Additional Passkey',
      aaguid: aaguid || undefined,
    });
  }
}
