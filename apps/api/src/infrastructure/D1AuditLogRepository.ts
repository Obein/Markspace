import { AuditLogEntity, CreateAuditLogDTO } from '../types/domain';

export interface D1AuditLogRow {
  id: string;
  user_id: string;
  username: string;
  action: string;
  auth_method: string;
  ip_address: string;
  user_agent: string;
  status: string;
  details: string;
  timestamp: number;
}

export class D1AuditLogRepository {
  private initPromise: Promise<void> | null = null;

  constructor(private readonly db: D1Database) {}

  private async ensureTable(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await this.db
          .prepare(
            `CREATE TABLE IF NOT EXISTS audit_logs (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              username TEXT NOT NULL,
              action TEXT NOT NULL,
              auth_method TEXT NOT NULL,
              ip_address TEXT NOT NULL,
              user_agent TEXT NOT NULL,
              status TEXT NOT NULL,
              details TEXT,
              timestamp INTEGER NOT NULL
            )`
          )
          .run();

        await this.db
          .prepare(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, timestamp DESC)`)
          .run();
      })();
    }
    return this.initPromise;
  }

  public async recordLog(dto: CreateAuditLogDTO): Promise<AuditLogEntity> {
    await this.ensureTable();

    const id = `audit_${crypto.randomUUID()}`;
    const timestamp = Date.now();
    const details = dto.details || '';

    await this.db
      .prepare(
        `INSERT INTO audit_logs 
         (id, user_id, username, action, auth_method, ip_address, user_agent, status, details, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        dto.userId,
        dto.username,
        dto.action,
        dto.authMethod,
        dto.ipAddress,
        dto.userAgent,
        dto.status,
        details,
        timestamp
      )
      .run();

    return {
      id,
      userId: dto.userId,
      username: dto.username,
      action: dto.action,
      authMethod: dto.authMethod,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      status: dto.status,
      details,
      timestamp,
    };
  }

  public async getLogsByUser(userId: string, limit = 50): Promise<AuditLogEntity[]> {
    await this.ensureTable();

    const { results } = await this.db
      .prepare(
        `SELECT * FROM audit_logs 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`
      )
      .bind(userId, limit)
      .all<D1AuditLogRow>();

    return (results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      action: row.action as AuditLogEntity['action'],
      authMethod: row.auth_method,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status as AuditLogEntity['status'],
      details: row.details || '',
      timestamp: row.timestamp,
    }));
  }
}
