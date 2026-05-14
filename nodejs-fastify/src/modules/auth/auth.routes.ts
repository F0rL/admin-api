/**
 * 认证模块 - 路由定义
 *
 * POST /auth/login   - 登录：校验凭证，写入 Session
 * POST /auth/logout  - 退出：销毁 Session（需认证）
 * GET  /auth/me      - 获取当前用户信息（需认证）
 */

import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { authService } from './auth.service.js';
import { loginSchema } from './auth.schema.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input);

    request.session.userId = result.user.id;
    request.session.username = result.user.username;
    request.session.role = result.user.role;

    return reply.send(ok(result.user, 'Login successful'));
  });

  app.post('/auth/logout', { preHandler: authGuard }, async (request, reply) => {
    await request.session.destroy();
    return reply.send(ok(null, 'Logged out successfully'));
  });

  app.get('/auth/me', { preHandler: authGuard }, async (request, reply) => {
    const result = await authService.getMe(request.session.userId);
    return reply.send(ok(result.user));
  });
}
