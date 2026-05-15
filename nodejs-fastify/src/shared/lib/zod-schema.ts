import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodSchema } from 'zod';

export function zodSchema(schema: ZodSchema, description?: string) {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' });
  const key = Object.keys(jsonSchema.definitions ?? {})[0];
  const result = key ? jsonSchema.definitions![key] : jsonSchema;
  return {
    ...result,
    ...(description ? { description } : {}),
  };
}

export const paginationSchema = {
  type: 'object',
  properties: {
    list: {
      type: 'array',
      items: { type: 'object' },
      description: '数据列表',
    },
    total: { type: 'integer', description: '总数' },
    page: { type: 'integer', description: '当前页码' },
    pageSize: { type: 'integer', description: '每页条数' },
  },
};

export function successResponseSchema(dataSchema: Record<string, unknown>) {
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [true] },
      data: dataSchema,
      message: { type: 'string' },
    },
  };
}

export function paginatedResponseSchema(itemSchema: Record<string, unknown>) {
  return successResponseSchema({
    type: 'object',
    properties: {
      list: {
        type: 'array',
        items: itemSchema,
      },
      total: { type: 'integer' },
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
    },
  });
}
