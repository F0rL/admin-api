/**
 * Fastify 应用工厂
 *
 * 组装应用所需的所有插件和路由：
 * - Cookie 解析（Session 前置依赖）
 * - Redis 存储的 Session（connect-redis）
 * - 全局错误处理中间件
 * - 所有路由挂载到 /api/v1 前缀下
 *
 * buildApp() 返回已配置的 Fastify 实例，server.ts 负责启动监听。
 */

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { RedisStore } from 'connect-redis';
import { Redis } from 'ioredis';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { errorMiddleware } from './shared/middleware/error.middleware.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { roleRoutes } from './modules/role/role.routes.js';
import { menuRoutes } from './modules/menu/menu.routes.js';
import { departmentRoutes } from './modules/department/department.routes.js';

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
  });

  // Cookie parser (required by session)
  await app.register(fastifyCookie);

  // Redis-backed session store
  const redisClient = new Redis(env.REDIS_URL);
  const redisStore = new RedisStore({ client: redisClient });

  await app.register(fastifySession, {
    store: redisStore,
    secret: env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: env.NODE_ENV === 'prod',
      maxAge: env.SESSION_TTL * 1000,
    },
    saveUninitialized: false,
  });

  // Global error handler
  app.setErrorHandler(errorMiddleware);

  // Register all routes under /api/v1 prefix
  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes);
      await api.register(userRoutes);
      await api.register(roleRoutes);
      await api.register(menuRoutes);
      await api.register(departmentRoutes);
    },
    { prefix: '/api/v1' },
  );

  // Graceful shutdown
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
    await redisClient.quit();
  });

  return app;
}
