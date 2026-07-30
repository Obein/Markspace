export interface IPasswordHasher {
  generateSalt(): string;
  hash(plainToken: string, salt: string): Promise<string>;
  verify(plainToken: string, hash: string, salt: string): Promise<boolean>;
}
