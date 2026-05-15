/**
 * 权限校验守卫中间件
 *
 * 校验当前用户是否拥有指定的权限码。
 * 需要配合 authGuard 先确保用户已登录。
 * 用法：{ preHandler: [authGuard, requirePermission('user:delete')] }
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { fail } from '../lib/response.js';
import { prisma } from '../../database/prisma.js';

export function requirePermission(permissionCode: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.session?.userId as string | undefined;
    if (!userId) {
      return reply.status(401).send(fail('AUTH_UNAUTHORIZED', '未登录或已过期'));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (!user?.roleId) {
      return reply.status(403).send(fail('AUTH_PERMISSION_DENIED', '权限不足'));
    }

    const permission = await prisma.rolePermission.findFirst({
      where: {
        roleId: user.roleId,
        permissionCode,
        deletedAt: null,
      },
    });

    if (!permission) {
      return reply.status(403).send(fail('AUTH_PERMISSION_DENIED', '权限不足'));
    }
  };
}
