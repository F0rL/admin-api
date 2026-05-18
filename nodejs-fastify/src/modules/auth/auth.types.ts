/**
 * Fastify Request 类型扩展
 *
 * authGuard 中间件验证通过后，将 session 数据注入到 request 对象，
 * 使 request.sessionId / userId / username / role 具有完整的类型推导。
 */

import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    sessionId: string;
    userId: string;
    username: string;
    role: string;
  }
}
