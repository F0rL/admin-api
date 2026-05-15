import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  code: z.string().min(1).max(50),
  description: z.string().max(255).optional().nullable(),
  status: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  menuIds: z.array(z.string()).default([]),
  permissionCodes: z.array(z.string()).default([]),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(50).optional(),
  code: z.string().max(50).optional(),
  description: z.string().max(255).optional().nullable(),
  status: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  menuIds: z.array(z.string()).optional(),
  permissionCodes: z.array(z.string()).optional(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const batchUpdateRoleSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      status: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    })
  ).min(1).max(100),
});

export type BatchUpdateRoleInput = z.infer<typeof batchUpdateRoleSchema>;

export interface RoleListItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  status: boolean;
  sortOrder: number;
  userCount: number;
  createdAt: string;
}

export interface RoleDetail extends RoleListItem {
  menuIds: string[];
  permissionCodes: string[];
}
