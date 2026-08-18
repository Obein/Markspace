import { D1AuditLogRepository } from '../infrastructure/D1AuditLogRepository';
import { IUserRepository } from '../interfaces/IUserRepository';
import {
  UpdateSystemConfigDTO,
  UpdateUserQuotaDTO,
  UpdateUserRoleDTO,
} from '../types/domain';
import { ApiResponse, RequestContext } from '../types/http';

export class AdminController {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditLogRepo?: D1AuditLogRepository
  ) {}

  private getClientIp(ctx: RequestContext): string {
    return (
      ctx.request.headers.get('CF-Connecting-IP') ||
      ctx.request.headers.get('X-Forwarded-For') ||
      '127.0.0.1'
    );
  }

  private getUserAgent(ctx: RequestContext): string {
    return ctx.request.headers.get('User-Agent') || 'Admin Client';
  }

  /**
   * GET /api/v1/admin/users
   * List all registered users with UUID, activity, and storage quotas (Admin only).
   */
  async listUsers(_ctx: RequestContext): Promise<Response> {
    const userSummaries = await this.userRepository.getUserAdminSummaries();

    const response: ApiResponse = {
      success: true,
      data: userSummaries,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * DELETE /api/v1/admin/users/:id
   * Permanently delete a user and cascade delete all their vaults and data (Admin only).
   */
  async deleteUser(ctx: RequestContext): Promise<Response> {
    const targetUserId = ctx.params.id;
    const currentUserId = ctx.user!.userId;

    if (targetUserId === currentUserId) {
      throw new Error('FORBIDDEN: You cannot delete your own active administrator account');
    }

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new Error('NOT_FOUND: Target user not found');
    }

    await this.userRepository.deleteUserCascade(targetUserId);

    if (this.auditLogRepo) {
      await this.auditLogRepo.recordLog({
        userId: currentUserId,
        username: ctx.user?.username || 'admin',
        action: 'ADMIN_DELETE_USER',
        authMethod: 'Admin Panel Action',
        ipAddress: this.getClientIp(ctx),
        userAgent: this.getUserAgent(ctx),
        status: 'SUCCESS',
        details: `Deleted user ${targetUser.username} (${targetUserId}) and wiped all associated vaults.`,
      });
    }

    const response: ApiResponse = {
      success: true,
      data: { message: `User ${targetUser.username} and all associated data permanently deleted` },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * PUT /api/v1/admin/users/:id/role
   * Update user role (Admin only).
   */
  async updateUserRole(ctx: RequestContext): Promise<Response> {
    const targetUserId = ctx.params.id;
    const currentUserId = ctx.user!.userId;
    const body = (await ctx.request.json()) as UpdateUserRoleDTO;

    if (!body.role || (body.role !== 'admin' && body.role !== 'user')) {
      throw new Error('INVALID_INPUT: Role must be either "admin" or "user"');
    }

    if (targetUserId === currentUserId && body.role !== 'admin') {
      throw new Error('FORBIDDEN: You cannot demote your own administrator account');
    }

    const updated = await this.userRepository.updateRole(targetUserId, body.role);
    if (!updated) {
      throw new Error('NOT_FOUND: Target user not found');
    }

    if (this.auditLogRepo) {
      await this.auditLogRepo.recordLog({
        userId: currentUserId,
        username: ctx.user?.username || 'admin',
        action: 'ADMIN_UPDATE_ROLE',
        authMethod: 'Admin Panel Action',
        ipAddress: this.getClientIp(ctx),
        userAgent: this.getUserAgent(ctx),
        status: 'SUCCESS',
        details: `Updated role of user ${targetUserId} to ${body.role}`,
      });
    }

    const response: ApiResponse = {
      success: true,
      data: { message: `User role updated to ${body.role}` },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * PUT /api/v1/admin/users/:id/quota
   * Update individual user storage quota (Admin only).
   */
  async updateUserQuota(ctx: RequestContext): Promise<Response> {
    const targetUserId = ctx.params.id;
    const currentUserId = ctx.user!.userId;
    const body = (await ctx.request.json()) as UpdateUserQuotaDTO;

    let quotaBytes: number | null = null;
    if (body.storageQuotaBytes !== null && body.storageQuotaBytes !== undefined) {
      const bytes = Number(body.storageQuotaBytes);
      const minBytes = 1 * 1024 * 1024; // 1MB
      const maxBytes = 1024 * 1024 * 1024 * 1024; // 1TB
      if (isNaN(bytes) || bytes < minBytes || bytes > maxBytes) {
        throw new Error('INVALID_INPUT: Storage quota must be between 1MB (1,048,576 B) and 1TB (1,099,511,627,776 B)');
      }
      quotaBytes = bytes;
    }

    const updated = await this.userRepository.updateStorageQuota(targetUserId, quotaBytes);
    if (!updated) {
      throw new Error('NOT_FOUND: Target user not found');
    }

    if (this.auditLogRepo) {
      await this.auditLogRepo.recordLog({
        userId: currentUserId,
        username: ctx.user?.username || 'admin',
        action: 'ADMIN_UPDATE_QUOTA',
        authMethod: 'Admin Panel Action',
        ipAddress: this.getClientIp(ctx),
        userAgent: this.getUserAgent(ctx),
        status: 'SUCCESS',
        details: `Updated custom storage quota for user ${targetUserId} to ${quotaBytes ? (quotaBytes / (1024 * 1024)).toFixed(1) + 'MB' : 'Default'}`,
      });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Storage quota updated successfully`,
        storageQuotaBytes: quotaBytes,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * GET /api/v1/admin/settings
   * Retrieve system global policies (Admin only).
   */
  async getSystemSettings(_ctx: RequestContext): Promise<Response> {
    const config = await this.userRepository.getSystemConfig();

    const response: ApiResponse = {
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * PUT /api/v1/admin/settings
   * Update system global policies (Admin only).
   */
  async updateSystemSettings(ctx: RequestContext): Promise<Response> {
    const currentUserId = ctx.user!.userId;
    const body = (await ctx.request.json()) as UpdateSystemConfigDTO;

    const updates: Partial<UpdateSystemConfigDTO> = {};

    if (body.defaultStorageQuotaBytes !== undefined) {
      const bytes = Number(body.defaultStorageQuotaBytes);
      const minBytes = 1 * 1024 * 1024; // 1MB
      const maxBytes = 1024 * 1024 * 1024 * 1024; // 1TB
      if (isNaN(bytes) || bytes < minBytes || bytes > maxBytes) {
        throw new Error('INVALID_INPUT: Default storage quota must be between 1MB and 1TB');
      }
      updates.defaultStorageQuotaBytes = bytes;
    }

    if (body.idleDestructionPeriodMs !== undefined) {
      const period = Number(body.idleDestructionPeriodMs);
      const minPeriod = 30 * 24 * 60 * 60 * 1000; // 1 month (~30 days)
      const maxPeriod = 365 * 24 * 60 * 60 * 1000; // 1 year
      if (period !== 0 && (isNaN(period) || period < minPeriod || period > maxPeriod)) {
        throw new Error('INVALID_INPUT: Idle destruction period must be 0 (disabled) or between 1 month and 1 year');
      }
      updates.idleDestructionPeriodMs = period;
    }

    const newConfig = await this.userRepository.updateSystemConfig(updates);

    if (this.auditLogRepo) {
      await this.auditLogRepo.recordLog({
        userId: currentUserId,
        username: ctx.user?.username || 'admin',
        action: 'ADMIN_UPDATE_POLICY',
        authMethod: 'Admin Panel Action',
        ipAddress: this.getClientIp(ctx),
        userAgent: this.getUserAgent(ctx),
        status: 'SUCCESS',
        details: `Updated global system policies: Default Quota=${(newConfig.defaultStorageQuotaBytes / (1024 * 1024)).toFixed(0)}MB, Idle Lifecycle=${newConfig.idleDestructionPeriodMs > 0 ? (newConfig.idleDestructionPeriodMs / (24 * 3600 * 1000)).toFixed(0) + ' days' : 'Disabled'}`,
      });
    }

    const response: ApiResponse = {
      success: true,
      data: newConfig,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * POST /api/v1/admin/maintenance/cleanup-idle-users
   * Manually trigger idle account lifecycle cleanup (Admin only).
   */
  async cleanupIdleUsers(_ctx: RequestContext): Promise<Response> {
    const config = await this.userRepository.getSystemConfig();

    if (config.idleDestructionPeriodMs <= 0) {
      const response: ApiResponse = {
        success: true,
        data: {
          destroyedCount: 0,
          destroyedUsernames: [],
          message: 'Idle destruction policy is currently disabled',
        },
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const idleUsers = await this.userRepository.findIdleUsers(config.idleDestructionPeriodMs);
    const destroyedUsernames: string[] = [];

    for (const idleUser of idleUsers) {
      await this.userRepository.deleteUserCascade(idleUser.id);
      destroyedUsernames.push(idleUser.username);

      if (this.auditLogRepo) {
        await this.auditLogRepo.recordLog({
          userId: idleUser.id,
          username: idleUser.username,
          action: 'USER_IDLE_DESTROYED',
          authMethod: 'Automated Lifecycle Sweeper',
          ipAddress: '127.0.0.1',
          userAgent: 'Cloudflare Worker Scheduled Cron',
          status: 'SUCCESS',
          details: `User ${idleUser.username} was automatically destroyed due to exceeding idle threshold (${(config.idleDestructionPeriodMs / (24 * 3600 * 1000)).toFixed(0)} days).`,
        });
      }
    }

    const response: ApiResponse = {
      success: true,
      data: {
        destroyedCount: destroyedUsernames.length,
        destroyedUsernames,
        message: `Successfully cleaned up ${destroyedUsernames.length} idle accounts`,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
