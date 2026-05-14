/**
 * 健康检查路由
 *
 * GET /health - 返回应用运行状态，包括数据库连接是否正常。
 * 可用于负载均衡器或容器编排工具的存活检查。
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../../database/prisma.js';
import { ok } from '../../shared/lib/response.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    const dbStatus = await prisma.$queryRaw`SELECT 1 AS ok`.then(
      () => 'healthy' as const,
      () => 'unhealthy' as const,
    );

    return reply.send(ok({ status: 'ok', database: dbStatus }));
  });
}
