import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { departmentService } from './department.service.js';
import { createDepartmentSchema, updateDepartmentSchema, batchUpdateDepartmentSchema } from './department.schema.js';

export async function departmentRoutes(app: FastifyInstance) {
  app.post('/department/create', { preHandler: authGuard }, async (request, reply) => {
    const input = createDepartmentSchema.parse(request.body);
    const result = await departmentService.create(input);
    return reply.send(ok(result.data, '创建成功'));
  });

  app.post('/department/delete', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.body as { id: string };
    await departmentService.delete(id);
    return reply.send(ok(null, '删除成功'));
  });

  app.post('/department/update', { preHandler: authGuard }, async (request, reply) => {
    const input = updateDepartmentSchema.parse(request.body);
    const result = await departmentService.update(input);
    return reply.send(ok(result.data, '更新成功'));
  });

  app.get('/department/detail', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.query as { id: string };
    const result = await departmentService.detail(id);
    return reply.send(ok(result.data));
  });

  app.get('/department/tree', { preHandler: authGuard }, async (_request, reply) => {
    const result = await departmentService.tree();
    return reply.send(ok(result.data));
  });

  app.get('/department/list-users', { preHandler: authGuard }, async (request, reply) => {
    const { departmentId } = request.query as { departmentId: string };
    const result = await departmentService.listUsers(departmentId);
    return reply.send(ok(result.data));
  });

  app.post('/department/batch-update', { preHandler: authGuard }, async (request, reply) => {
    const input = batchUpdateDepartmentSchema.parse(request.body);
    await departmentService.batchUpdate(input);
    return reply.send(ok(null, '批量更新成功'));
  });
}
