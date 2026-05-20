/**
 * 认证模块 - 路由定义
 *
 * POST   /auth/login          - 登录：校验凭证，返回 sessionId
 * POST   /auth/logout         - 退出：销毁 session（需认证）
 * GET    /auth/me             - 获取当前用户信息（需认证）
 * POST   /auth/password/change - 修改当前用户密码（需认证）
 * POST   /auth/password/reset  - 管理员重置指定用户密码（需认证）
 */

import { FastifyInstance } from 'fastify'
import { authGuard } from '../../shared/middleware/auth.guard.js'
import { ok } from '../../shared/lib/response.js'
import { createSession, destroySession } from '../../shared/lib/session.js'
import {
  zodSchema,
  successResponseSchema,
} from '../../shared/lib/zod-schema.js'
import { validate } from '../../shared/lib/validation.js'
import { authService } from './auth.service.js'
import {
  loginSchema,
  passwordChangeSchema,
  passwordResetSchema,
} from './auth.schema.js'

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
              sessionId: {
                type: 'string',
                description: '会话 ID，后续请求需在 Authorization 头中携带',
              },
            },
          }),
        },
      },
    },
    async (request, reply) => {
      const input = validate(loginSchema, request.body, { pathPrefix: 'body' })
      const result = await authService.login(input)
      const sessionId = await createSession({
        userId: result.id,
        username: result.username,
        role: result.role?.code ?? '',
      })

      return reply.send(ok({ sessionId }, '登录成功'))
    }
  )

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
      await destroySession(request.sessionId)
      return reply.send(ok(null, '已退出登录'))
    }
  )

  app.get(
    '/auth/me',
    {
      preHandler: authGuard,
      schema: { tags: ['Auth'], summary: '获取当前用户信息' },
    },
    async (request, reply) => {
      const result = await authService.getMe(request.userId)
      return reply.send(ok(result.data))
    }
  )

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
      const input = validate(passwordChangeSchema, request.body, {
        pathPrefix: 'body',
      })
      await authService.changePassword(
        request.userId,
        input.oldPassword,
        input.newPassword
      )
      return reply.send(ok(null, '密码修改成功'))
    }
  )

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
      const input = validate(passwordResetSchema, request.body, {
        pathPrefix: 'body',
      })
      await authService.resetPassword(input.userId, input.newPassword)
      return reply.send(ok(null, '密码重置成功'))
    }
  )
}
