import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  status: z.boolean().default(true),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(100).optional(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  status: z.boolean().optional(),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const batchUpdateDepartmentSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int().optional(),
      status: z.boolean().optional(),
      parentId: z.string().optional().nullable(),
    })
  ).min(1).max(100),
});

export type BatchUpdateDepartmentInput = z.infer<typeof batchUpdateDepartmentSchema>;

export interface DepartmentTreeItem {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  status: boolean;
  children: DepartmentTreeItem[];
}

import { registerLabels } from '../../shared/lib/zod-labels.js';

registerLabels(createDepartmentSchema, {
  name: '部门名称',
  parentId: '上级部门',
  sortOrder: '排序号',
  status: '状态',
});

registerLabels(updateDepartmentSchema, {
  id: '部门 ID',
  name: '部门名称',
  parentId: '上级部门',
  sortOrder: '排序号',
  status: '状态',
});

registerLabels(batchUpdateDepartmentSchema, {
  updates: '批量更新列表',
  id: '部门 ID',
  sortOrder: '排序号',
  status: '状态',
  parentId: '上级部门',
});
