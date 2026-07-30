import { RequestContext } from '../types/http';

export class AdminMiddleware {
  static authorize(ctx: RequestContext): void {
    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new Error('FORBIDDEN: Admin privileges required');
    }
  }
}
