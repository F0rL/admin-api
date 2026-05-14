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
