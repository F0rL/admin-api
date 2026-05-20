import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { zodSchema, successResponseSchema } from '../../shared/lib/zod-schema.js';
import { validate } from '../../shared/lib/validation.js';
import { roleService } from './role.service.js';
import { createRoleSchema, updateRoleSchema, batchUpdateRoleSchema } from './role.schema.js';

const roleListItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    code: { type: 'string' },
    description: { type: 'string', nullable: true },
    isSystem: { type: 'boolean' },
    status: { type: 'boolean' },
    sortOrder: { type: 'integer' },
    userCount: { type: 'integer' },
    createdAt: { type: 'string' },
  },
};

const roleDetailSchema = {
  allOf: [
    roleListItemSchema,
    {
      type: 'object',
      properties: {
        menuIds: { type: 'array', items: { type: 'string' } },
        permissionCodes: { type: 'array', items: { type: 'string' } },
      },
    },
  ],
};

export async function roleRoutes(app: FastifyInstance) {
  app.post(
    '/role/create',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Role'],
        summary: '创建角色',
        body: zodSchema(createRoleSchema),
        response: { 200: successResponseSchema(roleDetailSchema) },
      },
    },
    async (request, reply) => {
      const input = validate(createRoleSchema, request.body, { pathPrefix: 'body' });
      const result = await roleService.create(input);
      return reply.send(ok(result.data, '创建成功'));
    },
  );

  app.post(
    '/role/delete',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Role'],
        summary: '删除角色',
        body: { type: 'object', required: ['id'], properties: { id: { type: 'string', description: '角色ID' } } },
        response: { 200: successResponseSchema({ type: 'null' }) },
      },
    },
    async (request, reply) => {
      const { id } = request.body as { id: string };
      await roleService.delete(id);
      return reply.send(ok(null, '删除成功'));
    },
  );

  app.post(
    '/role/update',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Role'],
        summary: '更新角色',
        body: zodSchema(updateRoleSchema),
        response: { 200: successResponseSchema(roleDetailSchema) },
      },
    },
    async (request, reply) => {
      const input = validate(updateRoleSchema, request.body, { pathPrefix: 'body' });
      const result = await roleService.update(input);
      return reply.send(ok(result.data, '更新成功'));
    },
  );

  app.get(
    '/role/detail',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Role'],
        summary: '角色详情',
        querystring: {
          type: 'object', required: ['id'],
          properties: { id: { type: 'string', description: '角色ID' } },
        },
        response: { 200: successResponseSchema(roleDetailSchema) },
      },
    },
    async (request, reply) => {
      const { id } = request.query as { id: string };
      const result = await roleService.detail(id);
      return reply.send(ok(result.data));
    },
  );

  app.get(
    '/role/list',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Role'],
        summary: '角色列表',
        response: { 200: successResponseSchema({ type: 'array', items: roleListItemSchema }) },
      },
    },
    async (_request, reply) => {
      const result = await roleService.list();
      return reply.send(ok(result.data));
    },
  );

  app.post(
    '/role/batch-update',
    {
      preHandler: authGuard,
      schema: {
        tags: ['Role'],
        summary: '批量更新角色',
        body: zodSchema(batchUpdateRoleSchema),
        response: { 200: successResponseSchema({ type: 'null' }) },
      },
    },
    async (request, reply) => {
      const input = validate(batchUpdateRoleSchema, request.body, { pathPrefix: 'body' });
      await roleService.batchUpdate(input);
      return reply.send(ok(null, '批量更新成功'));
    },
  );
}
