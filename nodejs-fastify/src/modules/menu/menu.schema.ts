import { z } from 'zod';

export const createMenuSchema = z.object({
  parentId: z.string().optional().nullable(),
  name: z.string().min(1).max(100),
  icon: z.string().max(100).optional().nullable(),
  path: z.string().max(255).optional().nullable(),
  component: z.string().max(255).optional().nullable(),
  type: z.enum(['directory', 'menu', 'button']),
  permissionCode: z.string().max(100).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  status: z.boolean().default(true),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;

export const updateMenuSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().optional().nullable(),
  name: z.string().max(100).optional(),
  icon: z.string().max(100).optional().nullable(),
  path: z.string().max(255).optional().nullable(),
  component: z.string().max(255).optional().nullable(),
  type: z.enum(['directory', 'menu', 'button']).optional(),
  permissionCode: z.string().max(100).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
  status: z.boolean().optional(),
});

export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;

export const batchUpdateMenuSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int().optional(),
      isVisible: z.boolean().optional(),
      status: z.boolean().optional(),
      parentId: z.string().optional().nullable(),
    })
  ).min(1).max(100),
});

export type BatchUpdateMenuInput = z.infer<typeof batchUpdateMenuSchema>;

export interface MenuTreeItem {
  id: string;
  parentId: string | null;
  name: string;
  icon: string | null;
  path: string | null;
  component: string | null;
  type: string;
  permissionCode: string | null;
  sortOrder: number;
  isVisible: boolean;
  status: boolean;
  children: MenuTreeItem[];
}

import { registerLabels } from '../../shared/lib/zod-labels.js';

registerLabels(createMenuSchema, {
  parentId: '上级菜单',
  name: '菜单名称',
  icon: '图标',
  path: '路由路径',
  component: '组件路径',
  type: '菜单类型',
  permissionCode: '权限编码',
  sortOrder: '排序号',
  isVisible: '是否可见',
  status: '状态',
});

registerLabels(updateMenuSchema, {
  id: '菜单 ID',
  parentId: '上级菜单',
  name: '菜单名称',
  icon: '图标',
  path: '路由路径',
  component: '组件路径',
  type: '菜单类型',
  permissionCode: '权限编码',
  sortOrder: '排序号',
  isVisible: '是否可见',
  status: '状态',
});

registerLabels(batchUpdateMenuSchema, {
  updates: '批量更新列表',
  id: '菜单 ID',
  sortOrder: '排序号',
  isVisible: '是否可见',
  status: '状态',
  parentId: '上级菜单',
});
