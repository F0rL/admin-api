import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { userService } from './user.service.js';
import { createUserSchema, updateUserSchema, batchUpdateUserSchema, userListQuerySchema } from './user.schema.js';

export async function userRoutes(app: FastifyInstance) {
  app.post('/user/create', { preHandler: authGuard }, async (request, reply) => {
    const input = createUserSchema.parse(request.body);
    const result = await userService.create(input);
    return reply.send(ok(result.data, '创建成功'));
  });

  app.post('/user/delete', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.body as { id: string };
    if (!id) throw new Error('id is required');
    await userService.delete(id);
    return reply.send(ok(null, '删除成功'));
  });

  app.post('/user/update', { preHandler: authGuard }, async (request, reply) => {
    const input = updateUserSchema.parse(request.body);
    const result = await userService.update(input);
    return reply.send(ok(result.data, '更新成功'));
  });

  app.get('/user/detail', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.query as { id: string };
    if (!id) throw new Error('id is required');
    const result = await userService.detail(id);
    return reply.send(ok(result.data));
  });

  app.get('/user/list', { preHandler: authGuard }, async (request, reply) => {
    const query = userListQuerySchema.parse(request.query);
    const result = await userService.list(query);
    return reply.send(ok(result.data));
  });

  app.post('/user/batch-update', { preHandler: authGuard }, async (request, reply) => {
    const input = batchUpdateUserSchema.parse(request.body);
    await userService.batchUpdate(input);
    return reply.send(ok(null, '批量更新成功'));
  });
}
