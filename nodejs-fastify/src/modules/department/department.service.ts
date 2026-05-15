import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { generateId } from '../../shared/lib/id.js';
import type { CreateDepartmentInput, UpdateDepartmentInput, BatchUpdateDepartmentInput, DepartmentTreeItem } from './department.schema.js';

function buildTree(parentId: string | null, depts: any[]): DepartmentTreeItem[] {
  return depts
    .filter((d) => d.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => ({
      id: d.id,
      parentId: d.parentId,
      name: d.name,
      sortOrder: d.sortOrder,
      status: d.status,
      children: buildTree(d.id, depts),
    }));
}

export class DepartmentService {
  async create(input: CreateDepartmentInput): Promise<{ data: DepartmentTreeItem }> {
    if (input.parentId) {
      const parent = await prisma.department.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.deletedAt) throw new AppError(404, 'DEPT_PARENT_NOT_FOUND', '父部门不存在');
    }

    const dept = await prisma.department.create({
      data: {
        id: generateId(),
        name: input.name,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder,
        status: input.status,
      },
    });

    return { data: { ...dept, children: [] } };
  }

  async delete(id: string): Promise<void> {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.deletedAt) throw new AppError(404, 'DEPT_NOT_FOUND', '部门不存在');

    const childCount = await prisma.department.count({ where: { parentId: id, deletedAt: null } });
    if (childCount > 0) throw new AppError(400, 'DEPT_HAS_CHILDREN', '存在子部门不可删除');

    const userCount = await prisma.user.count({ where: { departmentId: id, deletedAt: null } });
    if (userCount > 0) throw new AppError(400, 'DEPT_HAS_USERS', '部门下有用户不可删除');

    await prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async update(input: UpdateDepartmentInput): Promise<{ data: DepartmentTreeItem }> {
    const dept = await prisma.department.findUnique({ where: { id: input.id } });
    if (!dept || dept.deletedAt) throw new AppError(404, 'DEPT_NOT_FOUND', '部门不存在');

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.parentId !== undefined) data.parentId = input.parentId || null;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.status !== undefined) data.status = input.status;

    const updated = await prisma.department.update({ where: { id: input.id }, data });
    return { data: { ...updated, children: [] } };
  }

  async detail(id: string): Promise<{ data: DepartmentTreeItem }> {
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept || dept.deletedAt) throw new AppError(404, 'DEPT_NOT_FOUND', '部门不存在');

    return { data: { ...dept, children: [] } };
  }

  async tree(): Promise<{ data: DepartmentTreeItem[] }> {
    const depts = await prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });

    return { data: buildTree(null, depts) };
  }

  async listUsers(departmentId: string): Promise<{ data: { id: string; username: string; nickname: string }[] }> {
    const users = await prisma.user.findMany({
      where: { departmentId, deletedAt: null },
      select: { id: true, username: true, nickname: true },
    });

    return { data: users };
  }

  async batchUpdate(input: BatchUpdateDepartmentInput): Promise<void> {
    for (const item of input.updates) {
      const data: Record<string, unknown> = {};
      if (item.sortOrder !== undefined) data.sortOrder = item.sortOrder;
      if (item.status !== undefined) data.status = item.status;
      if (item.parentId !== undefined) data.parentId = item.parentId || null;
      await prisma.department.updateMany({ where: { id: item.id, deletedAt: null }, data });
    }
  }
}

export const departmentService = new DepartmentService();
