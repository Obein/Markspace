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
  private static readonly MAX_LOG_RETENTION = 100;

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

    // Enforce 100 entries max retention policy per user
    try {
      await this.db
        .prepare(
          `DELETE FROM audit_logs 
           WHERE user_id = ? 
           AND id NOT IN (
             SELECT id FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ${D1AuditLogRepository.MAX_LOG_RETENTION}
           )`
        )
        .bind(dto.userId, dto.userId)
        .run();
    } catch (err) {
      console.warn('Failed to prune older audit logs for user', err);
    }

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

  public async getLogsByUser(userId: string, limit = 100): Promise<AuditLogEntity[]> {
    await this.ensureTable();

    const { results } = await this.db
      .prepare(
        `SELECT * FROM audit_logs 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`
      )
      .bind(userId, Math.min(limit, D1AuditLogRepository.MAX_LOG_RETENTION))
      .all<D1AuditLogRow>();

    return (results || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      action: row.action as AuditLogEntity['action'],
      authMethod: row.auth_method,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status as 'SUCCESS' | 'FAILED',
      details: row.details,
      timestamp: row.timestamp,
    }));
  }
}
