import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { roleService } from './role.service.js';
import { createRoleSchema, updateRoleSchema, batchUpdateRoleSchema } from './role.schema.js';

export async function roleRoutes(app: FastifyInstance) {
  app.post('/role/create', { preHandler: authGuard }, async (request, reply) => {
    const input = createRoleSchema.parse(request.body);
    const result = await roleService.create(input);
    return reply.send(ok(result.data, '创建成功'));
  });

  app.post('/role/delete', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.body as { id: string };
    await roleService.delete(id);
    return reply.send(ok(null, '删除成功'));
  });

  app.post('/role/update', { preHandler: authGuard }, async (request, reply) => {
    const input = updateRoleSchema.parse(request.body);
    const result = await roleService.update(input);
    return reply.send(ok(result.data, '更新成功'));
  });

  app.get('/role/detail', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.query as { id: string };
    const result = await roleService.detail(id);
    return reply.send(ok(result.data));
  });

  app.get('/role/list', { preHandler: authGuard }, async (_request, reply) => {
    const result = await roleService.list();
    return reply.send(ok(result.data));
  });

  app.post('/role/batch-update', { preHandler: authGuard }, async (request, reply) => {
    const input = batchUpdateRoleSchema.parse(request.body);
    await roleService.batchUpdate(input);
    return reply.send(ok(null, '批量更新成功'));
  });
}
