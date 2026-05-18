/**
 * Fastify 应用工厂
 *
 * 组装应用所需的所有插件和路由：
 * - CORS（跨域支持）
 * - Swagger / OpenAPI 文档
 * - 全局错误处理中间件
 * - 所有路由挂载到 /api/v1 前缀下
 *
 * buildApp() 返回已配置的 Fastify 实例，server.ts 负责启动监听。
 */

import Fastify, { type FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { env } from './config/env.js'
import { prisma } from './database/prisma.js'
import { errorMiddleware } from './shared/middleware/error.middleware.js'
import { closeSessionRedis } from './shared/lib/session.js'
import { healthRoutes } from './modules/health/health.routes.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { userRoutes } from './modules/user/user.routes.js'
import { roleRoutes } from './modules/role/role.routes.js'
import { menuRoutes } from './modules/menu/menu.routes.js'
import { departmentRoutes } from './modules/department/department.routes.js'

const routeModules = [
  healthRoutes, authRoutes, userRoutes,
  roleRoutes, menuRoutes, departmentRoutes,
] as const

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'test' ? 'silent' : 'info',
      ...(env.NODE_ENV === 'dev' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }),
    },
  })

  const displayHost = env.HOST === '0.0.0.0' ? 'localhost' : env.HOST

  // Swagger / OpenAPI 文档
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Admin API',
        description: '后台管理系统接口文档',
        version: '0.1.0',
      },
      servers: [
        { url: `http://${displayHost}:${env.PORT}`, description: '开发环境' },
      ],
      components: {
        securitySchemes: {
          sessionCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: 'sessionId',
            description: 'Session ID（登录后自动设置）',
          },
        },
      },
    },
  })

  const docsPrefix = 'docs'
  await app.register(fastifySwaggerUi, {
    routePrefix: `/${docsPrefix}`,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  })

  app.log.info(`API 文档: http://${displayHost}:${env.PORT}/${docsPrefix}`)

  // CORS（允许 Swagger UI 跨域请求）
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  })

  // Global error handler
  app.setErrorHandler(errorMiddleware)

  // Register all routes under /api/v1 prefix
  await app.register(
    async (api: FastifyInstance) => {
      for (const registerRoutes of routeModules) {
        await api.register(registerRoutes)
      }
    },
    { prefix: '/api/v1' }
  )

  // Graceful shutdown
  app.addHook('onClose', async () => {
    await prisma.$disconnect()
    await closeSessionRedis()
  })

  return app
}
