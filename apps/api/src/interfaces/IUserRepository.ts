import { User, UserRole } from '../types/domain';

export interface IUserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: User): Promise<User>;
  existsByUsername(username: string): Promise<boolean>;
  countTotalUsers(): Promise<number>;
  findAllUsers(): Promise<User[]>;
  updateRole(id: string, role: UserRole): Promise<boolean>;
  updateTotpSecret(id: string, encryptedSecret: string | null, isEnabled: boolean): Promise<boolean>;
}
