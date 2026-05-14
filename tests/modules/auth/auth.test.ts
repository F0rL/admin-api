import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { Redis } from 'ioredis';
import { RedisStore } from 'connect-redis';
import { errorMiddleware } from '../../../src/shared/middleware/error.middleware.js';
import { authRoutes } from '../../../src/modules/auth/auth.routes.js';
import { authService } from '../../../src/modules/auth/auth.service.js';
import { AppError } from '../../../src/shared/lib/errors.js';

describe('auth routes', () => {
  const app = Fastify();
  let redisClient: Redis;

  beforeAll(async () => {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379/1');
    const redisStore = new RedisStore({ client: redisClient });

    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      store: redisStore,
      secret: 'a'.repeat(32),
      cookie: { httpOnly: true, sameSite: 'lax', path: '/' },
      saveUninitialized: false,
    });

    app.setErrorHandler(errorMiddleware);
    await app.register(authRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await redisClient.quit();
  });

  it('POST /auth/login should fail with invalid credentials', async () => {
    vi.spyOn(authService, 'login').mockRejectedValueOnce(
      new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password'),
    );

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'wrong', password: 'wrong' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('success', false);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /auth/me should return 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /auth/logout should return 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
    });

    expect(res.statusCode).toBe(401);
  });
});
