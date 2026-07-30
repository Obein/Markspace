import { IUserRepository } from '../interfaces/IUserRepository';
import { User, UserRole } from '../types/domain';

export class D1UserRepository implements IUserRepository {
  constructor(private readonly db: D1Database) {}

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT id, username, auth_token_hash, salt, role, created_at, updated_at FROM users WHERE username = ?')
      .bind(username)
      .first<{
        id: string;
        username: string;
        auth_token_hash: string;
        salt: string;
        role: string;
        created_at: number;
        updated_at: number;
      }>();

    if (!result) return null;

    return {
      id: result.id,
      username: result.username,
      authTokenHash: result.auth_token_hash,
      salt: result.salt,
      role: (result.role as UserRole) || 'user',
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT id, username, auth_token_hash, salt, role, created_at, updated_at FROM users WHERE id = ?')
      .bind(id)
      .first<{
        id: string;
        username: string;
        auth_token_hash: string;
        salt: string;
        role: string;
        created_at: number;
        updated_at: number;
      }>();

    if (!result) return null;

    return {
      id: result.id,
      username: result.username,
      authTokenHash: result.auth_token_hash,
      salt: result.salt,
      role: (result.role as UserRole) || 'user',
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async create(user: User): Promise<User> {
    await this.db
      .prepare(
        'INSERT INTO users (id, username, auth_token_hash, salt, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(user.id, user.username, user.authTokenHash, user.salt, user.role, user.createdAt, user.updatedAt)
      .run();

    return user;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const result = await this.db
      .prepare('SELECT 1 FROM users WHERE username = ? LIMIT 1')
      .bind(username)
      .first();

    return result !== null;
  }

  async countTotalUsers(): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as total FROM users')
      .first<{ total: number }>();

    return result?.total ?? 0;
  }

  async findAllUsers(): Promise<User[]> {
    const { results } = await this.db
      .prepare('SELECT id, username, auth_token_hash, salt, role, created_at, updated_at FROM users ORDER BY created_at ASC')
      .all<{
        id: string;
        username: string;
        auth_token_hash: string;
        salt: string;
        role: string;
        created_at: number;
        updated_at: number;
      }>();

    return (results || []).map((row) => ({
      id: row.id,
      username: row.username,
      authTokenHash: row.auth_token_hash,
      salt: row.salt,
      role: (row.role as UserRole) || 'user',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async updateRole(id: string, role: UserRole): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .bind(role, Date.now(), id)
      .run();

    return (result.meta.changes ?? 0) > 0;
  }
}
