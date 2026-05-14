/**
 * 全局错误处理中间件
 *
 * 统一处理 AppError（业务异常）、ZodError（校验异常）、
 * FastifyError（框架异常）及其他未知异常，始终返回统一的 JSON 错误格式。
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { fail } from '../lib/response.js';

export async function errorMiddleware(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(fail(error.code, error.message, error.details));
  }

  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return reply.status(400).send(fail('VALIDATION_ERROR', 'Request validation failed', details));
  }

  if ('statusCode' in error && typeof (error as FastifyError).statusCode === 'number') {
    const fe = error as FastifyError;
    return reply.status(fe.statusCode!).send(fail(fe.code || 'INTERNAL_ERROR', fe.message));
  }

  request.log.error(error, 'Unhandled error');
  return reply.status(500).send(fail('INTERNAL_ERROR', 'An unexpected error occurred'));
}
