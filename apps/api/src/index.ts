import { ServiceContainer } from './container/ServiceContainer';
import { D1UserRepository } from './infrastructure/D1UserRepository';
import { Router } from './router/Router';
import { Env } from './types/env';

const router = new Router();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router.handle(request, env);
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      const userRepo = new D1UserRepository(env.DB);
      const container = new ServiceContainer(env);
      const config = await userRepo.getSystemConfig();

      if (config.idleDestructionPeriodMs > 0) {
        const idleUsers = await userRepo.findIdleUsers(config.idleDestructionPeriodMs);
        for (const idleUser of idleUsers) {
          await userRepo.deleteUserCascade(idleUser.id);
          await container.auditLogRepository.recordLog({
            userId: idleUser.id,
            username: idleUser.username,
            action: 'USER_IDLE_DESTROYED',
            authMethod: 'Cloudflare Worker Scheduled Cron',
            ipAddress: '127.0.0.1',
            userAgent: 'System Cron Lifecycle Sweeper',
            status: 'SUCCESS',
            details: `User ${idleUser.username} was automatically destroyed due to exceeding idle threshold (${(config.idleDestructionPeriodMs / (24 * 3600 * 1000)).toFixed(0)} days).`,
          });
        }
      }
    } catch (err) {
      console.error('Scheduled idle users sweeper failed:', err);
    }
  },
};
