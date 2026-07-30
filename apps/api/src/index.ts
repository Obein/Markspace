import { Router } from './router/Router';
import { Env } from './types/env';

const router = new Router();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router.handle(request, env);
  },
};
