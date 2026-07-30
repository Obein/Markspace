import { UserRole } from './domain';
import { Env } from './env';

export interface UserPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface RequestContext {
  request: Request;
  env: Env;
  params: Record<string, string>;
  user?: UserPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
