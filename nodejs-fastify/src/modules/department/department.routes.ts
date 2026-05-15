import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { zodSchema, successResponseSchema } from '../../shared/lib/zod-schema.js';
import { departmentService } from './department.service.js';
import { createDepartmentSchema, updateDepartmentSchema, batchUpdateDepartmentSchema } from './department.schema.js';

const departmentTreeItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    parentId: { type: 'string', nullable: true },
    name: { type: 'string' },
    sortOrder: { type: 'integer' },
    status: { type: 'boolean' },
    children: {
      type: 'array',
      items: { type: 'object' },
    },
  },
};

export async function departmentRoutes(app: FastifyInstance) {
  app.post(
    '/department/create',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Department'],
        summary: '创建部门',
        body: zodSchema(createDepartmentSchema),
        response: { 200: successResponseSchema(departmentTreeItemSchema) },
      },
    },
    async (request, reply) => {
      const input = createDepartmentSchema.parse(request.body);
      const result = await departmentService.create(input);
      return reply.send(ok(result.data, '创建成功'));
    },
  );

  app.post(
    '/department/delete',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Department'],
        summary: '删除部门',
        body: { type: 'object', required: ['id'], properties: { id: { type: 'string', description: '部门ID' } } },
        response: { 200: successResponseSchema({ type: 'null' }) },
      },
    },
    async (request, reply) => {
      const { id } = request.body as { id: string };
      await departmentService.delete(id);
      return reply.send(ok(null, '删除成功'));
    },
  );

  app.post(
    '/department/update',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Department'],
        summary: '更新部门',
        body: zodSchema(updateDepartmentSchema),
        response: { 200: successResponseSchema(departmentTreeItemSchema) },
      },
    },
    async (request, reply) => {
      const input = updateDepartmentSchema.parse(request.body);
      const result = await departmentService.update(input);
      return reply.send(ok(result.data, '更新成功'));
    },
  );

  app.get(
    '/department/detail',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Department'],
        summary: '部门详情',
        querystring: {
          type: 'object', required: ['id'],
          properties: { id: { type: 'string', description: '部门ID' } },
        },
        response: { 200: successResponseSchema(departmentTreeItemSchema) },
      },
    },
    async (request, reply) => {
      const { id } = request.query as { id: string };
      const result = await departmentService.detail(id);
      return reply.send(ok(result.data));
    },
  );

  app.get(
    '/department/tree',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Department'],
        summary: '部门树形结构',
        response: { 200: successResponseSchema({ type: 'array', items: departmentTreeItemSchema }) },
      },
    },
    async (_request, reply) => {
      const result = await departmentService.tree();
      return reply.send(ok(result.data));
    },
  );

  app.get(
    '/department/list-users',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Department'],
        summary: '部门下的用户列表',
        querystring: {
          type: 'object', required: ['departmentId'],
          properties: { departmentId: { type: 'string', description: '部门ID' } },
        },
        response: {
          200: successResponseSchema({
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                nickname: { type: 'string' },
              },
            },
          }),
        },
      },
    },
    async (request, reply) => {
      const { departmentId } = request.query as { departmentId: string };
      const result = await departmentService.listUsers(departmentId);
      return reply.send(ok(result.data));
    },
  );

  app.post(
    '/department/batch-update',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Department'],
        summary: '批量更新部门',
        body: zodSchema(batchUpdateDepartmentSchema),
        response: { 200: successResponseSchema({ type: 'null' }) },
      },
    },
    async (request, reply) => {
      const input = batchUpdateDepartmentSchema.parse(request.body);
      await departmentService.batchUpdate(input);
      return reply.send(ok(null, '批量更新成功'));
    },
  );
}
