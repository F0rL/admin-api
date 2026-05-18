/**
 * 身份认证守卫中间件
 *
 * 从请求头中提取 sessionId 并验证：
 *   1. Authorization: Bearer <sessionId>
 *   2. X-Session-Id: <sessionId>
 *
 * 验证通过后将 session 数据注入 request，无需在路由中重复查询。
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { getSession } from '../lib/session.js';
import { fail } from '../lib/response.js';

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  // 1. Extract sessionId from headers
  const authHeader = request.headers.authorization;
  const sessionId =
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined) ??
    (request.headers['x-session-id'] as string | undefined);

  if (!sessionId) {
    return reply.status(401).send(fail('AUTH_UNAUTHORIZED', '未登录或已过期'));
  }

  // 2. Validate session
  const session = await getSession(sessionId);
  if (!session) {
    return reply.status(401).send(fail('AUTH_UNAUTHORIZED', '未登录或已过期'));
  }

  // 3. Inject session data into request
  request.sessionId = sessionId;
  request.userId = session.userId;
  request.username = session.username;
  request.role = session.role;
}
