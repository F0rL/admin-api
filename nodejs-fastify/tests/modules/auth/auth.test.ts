import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';
import { errorMiddleware } from '../../../src/shared/middleware/error.middleware.js';
import { authRoutes } from '../../../src/modules/auth/auth.routes.js';
import { authService } from '../../../src/modules/auth/auth.service.js';
import { AppError } from '../../../src/shared/lib/errors.js';
import * as session from '../../../src/shared/lib/session.js';

describe('auth routes', () => {
  const app = Fastify();

  beforeAll(async () => {
    app.setErrorHandler(errorMiddleware);
    await app.register(authRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login should fail with invalid credentials', async () => {
    vi.spyOn(authService, 'login').mockRejectedValueOnce(
      new AppError(401, 'AUTH_LOGIN_FAILED', 'Invalid username or password'),
    );

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'wrong', password: 'wrong' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('success', false);
    expect(body.error.code).toBe('AUTH_LOGIN_FAILED');
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

  it('POST /auth/login should return sessionId on success', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'admin',
      nickname: '管理员',
      avatar: null,
      role: { id: 'role-1', name: '超级管理员', code: 'superadmin' },
      menus: [],
      permissions: ['user:list'],
    };

    vi.spyOn(authService, 'login').mockResolvedValueOnce({ data: mockUser });
    vi.spyOn(session, 'createSession').mockResolvedValueOnce('mock-session-id-xxx');

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('success', true);
    expect(body.data).toEqual({ sessionId: 'mock-session-id-xxx' });
    expect(body).toHaveProperty('message', '登录成功');
  });

  it('GET /auth/me should return user info with valid session', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'admin',
      nickname: '管理员',
      avatar: null,
      role: { id: 'role-1', name: '超级管理员', code: 'superadmin' },
      menus: [],
      permissions: ['user:list'],
    };

    vi.spyOn(session, 'getSession').mockResolvedValueOnce({
      userId: 'user-1',
      username: 'admin',
      role: 'superadmin',
    });
    vi.spyOn(authService, 'getMe').mockResolvedValueOnce({ data: mockUser });

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer valid-session-id' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('success', true);
    expect(body.data.username).toBe('admin');
  });
});
