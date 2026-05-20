import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Fastify from 'fastify'
import { z } from 'zod'
import { chineseErrorMap } from '../../../src/shared/lib/zod-error-map.js'
import { errorMiddleware } from '../../../src/shared/middleware/error.middleware.js'
import { authRoutes } from '../../../src/modules/auth/auth.routes.js'
import { authService } from '../../../src/modules/auth/auth.service.js'
import { AppError } from '../../../src/shared/lib/errors.js'
import * as session from '../../../src/shared/lib/session.js'

// 注册全局中文错误映射
z.setErrorMap(chineseErrorMap)

describe('auth routes', () => {
  const app = Fastify()

  beforeAll(async () => {
    app.setValidatorCompiler(req => {
      if (req.httpPart === 'body') {
        return value => ({ value })
      }
      return () => ({ value: true })
    })
    app.setErrorHandler(errorMiddleware)
    await app.register(authRoutes)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  // ── POST /auth/login ───────────────────────────

  it('POST /auth/login should return validation error when fields are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('COMMON_PARAM_ERROR')
    expect(body.error.message).toBe('用户名')
    expect(body.error.details).toBeDefined()
  })

  it('POST /auth/login should return validation error when username is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: '', password: 'somepass' },
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('COMMON_PARAM_ERROR')
    expect(body.error.message).toBe('用户名')
  })

  it('POST /auth/login should return validation error when password is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: '' },
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('COMMON_PARAM_ERROR')
    expect(body.error.message).toBe('密码不能为空')
  })

  it('POST /auth/login should fail with invalid credentials', async () => {
    vi.spyOn(authService, 'login').mockRejectedValueOnce(
      new AppError(400, 'AUTH_LOGIN_FAILED', '用户名或密码错误')
    )

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'wrong', password: 'wrong' },
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('AUTH_LOGIN_FAILED')
  })

  it('POST /auth/login should return sessionId on success', async () => {
    vi.spyOn(authService, 'login').mockResolvedValueOnce({
      id: 'user-1',
      username: 'admin',
      role: { id: 'role-1', name: '超级管理员', code: 'super_admin' },
    })
    vi.spyOn(session, 'createSession').mockResolvedValueOnce(
      'mock-session-id-xxx'
    )

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.data).toEqual({ sessionId: 'mock-session-id-xxx' })
    expect(body.message).toBe('登录成功')
  })

  // ── GET /auth/me ──────────────────────────────

  it('GET /auth/me should return 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
    })

    expect(res.statusCode).toBe(401)
  })

  it('GET /auth/me should return user info with valid session', async () => {
    vi.spyOn(session, 'getSession').mockResolvedValueOnce({
      userId: 'user-1',
      username: 'admin',
      role: 'super_admin',
    })
    vi.spyOn(authService, 'getMe').mockResolvedValueOnce({
      data: {
        id: 'user-1',
        username: 'admin',
        nickname: '管理员',
        avatar: null,
        role: { id: 'role-1', name: '超级管理员', code: 'super_admin' },
        menus: [],
        permissions: ['user:list'],
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer valid-session-id' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.data.username).toBe('admin')
  })

  // ── POST /auth/logout ─────────────────────────

  it('POST /auth/logout should return 401 when not authenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
    })

    expect(res.statusCode).toBe(401)
  })

  it('POST /auth/logout should succeed with valid session', async () => {
    vi.spyOn(session, 'getSession').mockResolvedValueOnce({
      userId: 'user-1',
      username: 'admin',
      role: 'super_admin',
    })
    vi.spyOn(session, 'destroySession').mockResolvedValueOnce(undefined)

    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: 'Bearer valid-session-id' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.message).toBe('已退出登录')
  })

  // ── POST /auth/password/change ────────────────

  it('POST /auth/password/change should return validation error when newPassword is too short', async () => {
    vi.spyOn(session, 'getSession').mockResolvedValueOnce({
      userId: 'user-1',
      username: 'admin',
      role: 'super_admin',
    })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/password/change',
      headers: { authorization: 'Bearer valid-session-id' },
      payload: { oldPassword: 'oldpass', newPassword: '12345' },
    })

    expect(res.statusCode).toBe(400)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('COMMON_PARAM_ERROR')
    expect(body.error.message).toBe('新密码')
  })

  it('POST /auth/password/change should succeed', async () => {
    vi.spyOn(session, 'getSession').mockResolvedValueOnce({
      userId: 'user-1',
      username: 'admin',
      role: 'super_admin',
    })
    vi.spyOn(authService, 'changePassword').mockResolvedValueOnce(undefined)

    const res = await app.inject({
      method: 'POST',
      url: '/auth/password/change',
      headers: { authorization: 'Bearer valid-session-id' },
      payload: { oldPassword: 'oldpass', newPassword: 'newpass123' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.message).toBe('密码修改成功')
  })

  // ── POST /auth/password/reset ─────────────────

  it('POST /auth/password/reset should succeed', async () => {
    vi.spyOn(session, 'getSession').mockResolvedValueOnce({
      userId: 'admin-user',
      username: 'admin',
      role: 'super_admin',
    })
    vi.spyOn(authService, 'resetPassword').mockResolvedValueOnce(undefined)

    const res = await app.inject({
      method: 'POST',
      url: '/auth/password/reset',
      headers: { authorization: 'Bearer valid-session-id' },
      payload: { userId: 'target-user-id', newPassword: 'newpass456' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.message).toBe('密码重置成功')
  })
})
