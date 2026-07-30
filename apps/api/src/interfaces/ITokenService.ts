import { UserPayload } from '../types/http';

export interface ITokenService {
  generateToken(payload: UserPayload, secret: string, expiresInSeconds?: number): Promise<string>;
  verifyToken(token: string, secret: string): Promise<UserPayload | null>;
}
