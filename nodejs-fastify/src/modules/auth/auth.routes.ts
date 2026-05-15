/**
 * 认证模块 - 路由定义
 *
 * POST   /auth/login          - 登录：校验凭证，写入 Session（公开）
 * POST   /auth/logout         - 退出：销毁 Session（需认证）
 * GET    /auth/me             - 获取当前用户信息（需认证）
 * POST   /auth/password/change - 修改当前用户密码（需认证）
 * POST   /auth/password/reset  - 管理员重置指定用户密码（需认证）
 */

import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { zodSchema, successResponseSchema } from '../../shared/lib/zod-schema.js';
import { authService } from './auth.service.js';
import { loginSchema, passwordChangeSchema, passwordResetSchema } from './auth.schema.js';

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: '登录',
        body: zodSchema(loginSchema),
        response: {
          200: successResponseSchema({
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              nickname: { type: 'string' },
              avatar: { type: 'string', nullable: true },
              role: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  code: { type: 'string' },
                },
              },
              menus: {
                type: 'array',
                items: { type: 'object' },
              },
              permissions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          }),
        },
      },
    },
    async (request, reply) => {
      const input = loginSchema.parse(request.body);
      const result = await authService.login(input);

      request.session.userId = result.data.id;
      request.session.username = result.data.username;
      request.session.role = result.data.role?.code ?? '';

      return reply.send(ok(result.data, '登录成功'));
    },
  );

  app.post(
    '/auth/logout',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Auth'],
        summary: '退出登录',
        response: {
          200: successResponseSchema({ type: 'null' }),
        },
      },
    },
    async (request, reply) => {
      await request.session.destroy();
      return reply.send(ok(null, '已退出登录'));
    },
  );

  app.get(
    '/auth/me',
    { preHandler: authGuard, schema: { tags: ['Auth'], summary: '获取当前用户信息' } },
    async (request, reply) => {
      const result = await authService.getMe(request.session.userId);
      return reply.send(ok(result.data));
    },
  );

  app.post(
    '/auth/password/change',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Auth'],
        summary: '修改当前用户密码',
        body: zodSchema(passwordChangeSchema),
        response: {
          200: successResponseSchema({ type: 'null' }),
        },
      },
    },
    async (request, reply) => {
      const input = passwordChangeSchema.parse(request.body);
      await authService.changePassword(request.session.userId, input.oldPassword, input.newPassword);
      return reply.send(ok(null, '密码修改成功'));
    },
  );

  app.post(
    '/auth/password/reset',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Auth'],
        summary: '管理员重置指定用户密码',
        body: zodSchema(passwordResetSchema),
        response: {
          200: successResponseSchema({ type: 'null' }),
        },
      },
    },
    async (request, reply) => {
      const input = passwordResetSchema.parse(request.body);
      await authService.resetPassword(input.userId, input.newPassword);
      return reply.send(ok(null, '密码重置成功'));
    },
  );
}
