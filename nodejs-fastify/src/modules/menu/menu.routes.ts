import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { zodSchema, successResponseSchema } from '../../shared/lib/zod-schema.js';
import { menuService } from './menu.service.js';
import { createMenuSchema, updateMenuSchema, batchUpdateMenuSchema } from './menu.schema.js';

const menuTreeItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    parentId: { type: 'string', nullable: true },
    name: { type: 'string' },
    icon: { type: 'string', nullable: true },
    path: { type: 'string', nullable: true },
    component: { type: 'string', nullable: true },
    type: { type: 'string' },
    permissionCode: { type: 'string', nullable: true },
    sortOrder: { type: 'integer' },
    isVisible: { type: 'boolean' },
    status: { type: 'boolean' },
    children: {
      type: 'array',
      items: { type: 'object' },
    },
  },
};

export async function menuRoutes(app: FastifyInstance) {
  app.post(
    '/menu/create',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Menu'],
        summary: '创建菜单',
        body: zodSchema(createMenuSchema),
        response: { 200: successResponseSchema(menuTreeItemSchema) },
      },
    },
    async (request, reply) => {
      const input = createMenuSchema.parse(request.body);
      const result = await menuService.create(input);
      return reply.send(ok(result.data, '创建成功'));
    },
  );

  app.post(
    '/menu/delete',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Menu'],
        summary: '删除菜单',
        body: { type: 'object', required: ['id'], properties: { id: { type: 'string', description: '菜单ID' } } },
        response: { 200: successResponseSchema({ type: 'null' }) },
      },
    },
    async (request, reply) => {
      const { id } = request.body as { id: string };
      await menuService.delete(id);
      return reply.send(ok(null, '删除成功'));
    },
  );

  app.post(
    '/menu/update',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Menu'],
        summary: '更新菜单',
        body: zodSchema(updateMenuSchema),
        response: { 200: successResponseSchema(menuTreeItemSchema) },
      },
    },
    async (request, reply) => {
      const input = updateMenuSchema.parse(request.body);
      const result = await menuService.update(input);
      return reply.send(ok(result.data, '更新成功'));
    },
  );

  app.get(
    '/menu/detail',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Menu'],
        summary: '菜单详情',
        querystring: {
          type: 'object', required: ['id'],
          properties: { id: { type: 'string', description: '菜单ID' } },
        },
        response: { 200: successResponseSchema(menuTreeItemSchema) },
      },
    },
    async (request, reply) => {
      const { id } = request.query as { id: string };
      const result = await menuService.detail(id);
      return reply.send(ok(result.data));
    },
  );

  app.get(
    '/menu/tree',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Menu'],
        summary: '菜单树形结构',
        response: { 200: successResponseSchema({ type: 'array', items: menuTreeItemSchema }) },
      },
    },
    async (_request, reply) => {
      const result = await menuService.tree();
      return reply.send(ok(result.data));
    },
  );

  app.get(
    '/menu/get-user-menus',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Menu'],
        summary: '获取当前用户菜单',
        response: { 200: successResponseSchema({ type: 'array', items: menuTreeItemSchema }) },
      },
    },
    async (request, reply) => {
      const result = await menuService.getUserMenus(request.session.userId);
      return reply.send(ok(result.data));
    },
  );

  app.post(
    '/menu/batch-update',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Menu'],
        summary: '批量更新菜单',
        body: zodSchema(batchUpdateMenuSchema),
        response: { 200: successResponseSchema({ type: 'null' }) },
      },
    },
    async (request, reply) => {
      const input = batchUpdateMenuSchema.parse(request.body);
      await menuService.batchUpdate(input);
      return reply.send(ok(null, '批量更新成功'));
    },
  );
}
