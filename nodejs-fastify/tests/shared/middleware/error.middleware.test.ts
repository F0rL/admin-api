import { describe, it, expect, vi } from 'vitest'
import { AppError } from '../../../src/shared/lib/errors.js'
import { fail } from '../../../src/shared/lib/response.js'
import { errorMiddleware } from '../../../src/shared/middleware/error.middleware.js'

/**
 * 构造符合 Fastify 接口的 mock request/reply
 */
function mockReply() {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }
  return reply as unknown as Parameters<typeof errorMiddleware>[2]
}

function mockRequest(log: Record<string, unknown> = {}) {
  return {
    log: {
      error: vi.fn(),
      ...log,
    },
    url: '/test',
    method: 'GET',
  } as unknown as Parameters<typeof errorMiddleware>[1]
}

describe('errorMiddleware', () => {
  it('should format AppError with correct status and response shape', async () => {
    const err = new AppError(404, 'USER_NOT_FOUND', 'User not found', { id: 1 })
    const req = mockRequest()
    const rep = mockReply()

    await errorMiddleware(err, req as any, rep as any)

    expect(rep.status).toHaveBeenCalledWith(404)
    expect(rep.send).toHaveBeenCalledWith(
      fail('USER_NOT_FOUND', 'User not found', { id: 1 })
    )
  })

  it('should handle AppError without details', async () => {
    const err = new AppError(400, 'COMMON_PARAM_ERROR', 'Invalid')
    const req = mockRequest()
    const rep = mockReply()

    await errorMiddleware(err, req as any, rep as any)

    expect(rep.status).toHaveBeenCalledWith(400)
    expect(rep.send).toHaveBeenCalledWith(
      fail('COMMON_PARAM_ERROR', 'Invalid')
    )
  })

  it('should handle FastifyError with statusCode', async () => {
    const err = Object.assign(new Error('Not found'), { statusCode: 404 })
    const req = mockRequest()
    const rep = mockReply()

    await errorMiddleware(err as any, req as any, rep as any)

    expect(rep.status).toHaveBeenCalledWith(404)
    expect(rep.send).toHaveBeenCalledWith(
      fail('COMMON_ERROR', 'Not found')
    )
  })

  it('should handle unknown Error with 500', async () => {
    const err = new Error('Something broke')
    const req = mockRequest()
    const rep = mockReply()

    await errorMiddleware(err, req as any, rep as any)

    expect(rep.status).toHaveBeenCalledWith(500)
    expect(rep.send).toHaveBeenCalledWith(
      fail('COMMON_ERROR', '服务器内部错误，请稍后重试')
    )
    expect(req.log.error).toHaveBeenCalled()
  })
})
