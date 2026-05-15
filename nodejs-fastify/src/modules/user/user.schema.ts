import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(6).max(255),
  nickname: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  avatar: z.string().max(500).optional().nullable(),
  roleId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string().min(1),
  nickname: z.string().max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  avatar: z.string().max(500).optional().nullable(),
  roleId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  password: z.string().min(6).max(255).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const batchUpdateUserSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      roleId: z.string().optional().nullable(),
      departmentId: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
      isLocked: z.boolean().optional(),
    })
  ).min(1).max(100),
});

export type BatchUpdateUserInput = z.infer<typeof batchUpdateUserSchema>;

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  status: z.coerce.boolean().optional(),
  roleId: z.string().optional(),
  departmentId: z.string().optional(),
  sortField: z.enum(['createdAt', 'username', 'lastLoginAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export interface UserListItem {
  id: string;
  username: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserDetail extends UserListItem {
  loginFailCount: number;
  createdBy: string | null;
  updatedAt: string;
}
