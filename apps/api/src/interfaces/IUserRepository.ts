import { SystemConfig, User, UserAdminSummary, UserRole } from '../types/domain';

export interface IUserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: User): Promise<User>;
  existsByUsername(username: string): Promise<boolean>;
  countTotalUsers(): Promise<number>;
  findAllUsers(): Promise<User[]>;
  getUserAdminSummaries(): Promise<UserAdminSummary[]>;
  updateRole(id: string, role: UserRole): Promise<boolean>;
  updateTotpSecret(id: string, encryptedSecret: string | null, isEnabled: boolean): Promise<boolean>;
  updateLastActive(id: string, timestamp?: number): Promise<void>;
  updateStorageQuota(id: string, quotaBytes: number | null): Promise<boolean>;
  getUserStorageUsage(userId: string): Promise<number>;
  getSystemConfig(): Promise<SystemConfig>;
  updateSystemConfig(config: Partial<SystemConfig>): Promise<SystemConfig>;
  deleteUserCascade(userId: string): Promise<boolean>;
  findIdleUsers(idleThresholdMs: number): Promise<User[]>;
}
