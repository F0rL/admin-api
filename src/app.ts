import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import RedisStore from 'connect-redis';
import { Redis } from 'ioredis';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { errorMiddleware } from './shared/middleware/error.middleware.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';

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
