import { FastifyInstance } from "fastify";
import { authGuard } from "../../shared/middleware/auth.guard.js";
import { ok } from "../../shared/lib/response.js";
import {
  zodSchema,
  successResponseSchema,
  paginatedResponseSchema,
} from "../../shared/lib/zod-schema.js";
import { validate } from "../../shared/lib/validation.js";
import { userService } from "./user.service.js";
import {
  createUserSchema,
  updateUserSchema,
  batchUpdateUserSchema,
  userListQuerySchema,
} from "./user.schema.js";

const userItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    username: { type: "string" },
    nickname: { type: "string" },
    email: { type: "string", nullable: true },
    phone: { type: "string", nullable: true },
    avatar: { type: "string", nullable: true },
    role: {
      type: "object",
      nullable: true,
      properties: { id: { type: "string" }, name: { type: "string" } },
    },
    department: {
      type: "object",
      nullable: true,
      properties: { id: { type: "string" }, name: { type: "string" } },
    },
    isActive: { type: "boolean" },
    isLocked: { type: "boolean" },
    lastLoginAt: { type: "string", nullable: true },
    createdAt: { type: "string" },
  },
};

export async function userRoutes(app: FastifyInstance) {
  app.post(
    "/user/create",
    {
      preHandler: authGuard,
      schema: {
        tags: ["User"],
        summary: "创建用户",
        body: zodSchema(createUserSchema),
        response: { 200: successResponseSchema(userItemSchema) },
      },
    },
    async (request, reply) => {
      const input = validate(createUserSchema, request.body, { pathPrefix: 'body' });
      const result = await userService.create(input);
      return reply.send(ok(result.data, "创建成功"));
    },
  );

  app.post(
    "/user/delete",
    {
      preHandler: authGuard,
      schema: {
        tags: ["User"],
        summary: "删除用户",
        body: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", description: "用户ID" } },
        },
        response: { 200: successResponseSchema({ type: "null" }) },
      },
    },
    async (request, reply) => {
      const { id } = request.body as { id: string };
      if (!id) throw new Error("id is required");
      await userService.delete(id);
      return reply.send(ok(null, "删除成功"));
    },
  );

  app.post(
    "/user/update",
    {
      preHandler: authGuard,
      schema: {
        tags: ["User"],
        summary: "更新用户",
        body: zodSchema(updateUserSchema),
        response: { 200: successResponseSchema(userItemSchema) },
      },
    },
    async (request, reply) => {
      const input = validate(updateUserSchema, request.body, { pathPrefix: 'body' });
      const result = await userService.update(input);
      return reply.send(ok(result.data, "更新成功"));
    },
  );

  app.get(
    "/user/detail",
    {
      preHandler: authGuard,
      schema: {
        tags: ["User"],
        summary: "用户详情",
        querystring: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", description: "用户ID" } },
        },
        response: { 200: successResponseSchema(userItemSchema) },
      },
    },
    async (request, reply) => {
      const { id } = request.query as { id: string };
      if (!id) throw new Error("id is required");
      const result = await userService.detail(id);
      return reply.send(ok(result.data));
    },
  );

  app.get(
    "/user/list",
    {
      preHandler: authGuard,
      schema: {
        tags: ["User"],
        summary: "用户列表（分页）",
        querystring: zodSchema(userListQuerySchema),
        response: { 200: paginatedResponseSchema(userItemSchema) },
      },
    },
    async (request, reply) => {
      const query = validate(userListQuerySchema, request.query, { pathPrefix: 'query' });
      const result = await userService.list(query);
      return reply.send(ok(result.data));
    },
  );

  app.post(
    "/user/batch-update",
    {
      preHandler: authGuard,
      schema: {
        tags: ["User"],
        summary: "批量更新用户",
        body: zodSchema(batchUpdateUserSchema),
        response: { 200: successResponseSchema({ type: "null" }) },
      },
    },
    async (request, reply) => {
      const input = validate(batchUpdateUserSchema, request.body, { pathPrefix: 'body' });
      await userService.batchUpdate(input);
      return reply.send(ok(null, "批量更新成功"));
    },
  );
}
