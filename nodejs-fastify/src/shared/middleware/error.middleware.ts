/**
 * 全局错误处理中间件
 *
 * 统一处理 AppError（业务异常）、FastifyError（框架异常）、
 * Prisma 错误及其他未知异常，始终返回统一的 JSON 错误格式。
 *
 * ZodError 已在路由层由 validate() 转为 AppError，此处不再单独处理。
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { AppError } from '../lib/errors.js'
import { fail } from '../lib/response.js'

export async function errorMiddleware(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof AppError) {
    return reply
      .status(error.statusCode)
      .send(fail(error.code, error.message, error.details))
  }

  if (
    'statusCode' in error &&
    typeof (error as FastifyError).statusCode === 'number'
  ) {
    const fe = error as FastifyError
    return reply.status(fe.statusCode!).send(fail('COMMON_ERROR', fe.message))
  }

  // Prisma 已知错误 → 友好提示 + 完整日志
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    request.log.error({ err: error, url: request.url, method: request.method }, 'Database error')
    const message = dbErrorHint(error.code)
    return reply.status(500).send(fail('DB_ERROR', message))
  }

  // 未知错误 → 完整日志 + 通用提示
  request.log.error({ err: error, url: request.url, method: request.method }, 'Unhandled error')
  return reply
    .status(500)
    .send(fail('COMMON_ERROR', '服务器内部错误，请稍后重试'))
}

/** Prisma 错误码 → 用户友好的中文提示 */
function dbErrorHint(code: string): string {
  const hints: Record<string, string> = {
    P2000: '提供的值超出数据库字段长度限制',
    P2002: '数据已存在，请检查唯一字段',
    P2003: '关联数据不存在',
    P2005: '存储的数据类型不合法',
    P2014: '违反关联约束，请检查关联数据',
    P2021: '数据库表不存在，请先执行数据库迁移',
    P2023: '查询条件中使用了无效的 ID 格式',
    P2025: '操作的数据不存在',
  }
  return hints[code] ?? '数据库操作异常，请稍后重试'
}
