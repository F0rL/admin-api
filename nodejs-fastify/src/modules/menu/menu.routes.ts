import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { menuService } from './menu.service.js';
import { createMenuSchema, updateMenuSchema, batchUpdateMenuSchema } from './menu.schema.js';

export async function menuRoutes(app: FastifyInstance) {
  app.post('/menu/create', { preHandler: authGuard }, async (request, reply) => {
    const input = createMenuSchema.parse(request.body);
    const result = await menuService.create(input);
    return reply.send(ok(result.data, '创建成功'));
  });

  app.post('/menu/delete', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.body as { id: string };
    await menuService.delete(id);
    return reply.send(ok(null, '删除成功'));
  });

  app.post('/menu/update', { preHandler: authGuard }, async (request, reply) => {
    const input = updateMenuSchema.parse(request.body);
    const result = await menuService.update(input);
    return reply.send(ok(result.data, '更新成功'));
  });

  app.get('/menu/detail', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.query as { id: string };
    const result = await menuService.detail(id);
    return reply.send(ok(result.data));
  });

  app.get('/menu/tree', { preHandler: authGuard }, async (request, reply) => {
    const result = await menuService.tree();
    return reply.send(ok(result.data));
  });

  app.get('/menu/get-user-menus', { preHandler: authGuard }, async (request, reply) => {
    const result = await menuService.getUserMenus(request.session.userId);
    return reply.send(ok(result.data));
  });

  app.post('/menu/batch-update', { preHandler: authGuard }, async (request, reply) => {
    const input = batchUpdateMenuSchema.parse(request.body);
    await menuService.batchUpdate(input);
    return reply.send(ok(null, '批量更新成功'));
  });
}
