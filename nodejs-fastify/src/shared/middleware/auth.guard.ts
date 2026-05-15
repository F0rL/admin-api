/**
 * 身份认证守卫中间件
 *
 * 校验请求会话中是否存在 userId，若无则返回 401 未认证错误。
 * 可作为路由的 preHandler 使用，保护需要登录才能访问的接口。
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { fail } from '../lib/response.js';

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  if (!request.session?.userId) {
    return reply.status(401).send(fail(10001, '未登录或已过期'));
  }
}
