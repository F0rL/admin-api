/**
 * Fastify Session 类型扩展
 *
 * 将登录后存入 Session 的用户信息声明为类型安全的接口，
 * 使 request.session.userId / username / role 具有完整的类型推导。
 */

import 'fastify';

declare module 'fastify' {
  interface Session {
    userId: string;
    username: string;
    role: string;
  }
}
