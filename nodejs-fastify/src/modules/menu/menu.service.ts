import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { generateId } from '../../shared/lib/id.js';
import type { CreateMenuInput, UpdateMenuInput, BatchUpdateMenuInput, MenuTreeItem } from './menu.schema.js';

function buildTree(parentId: string | null, menus: any[]): MenuTreeItem[] {
  return menus
    .filter((m) => m.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      id: m.id,
      parentId: m.parentId,
      name: m.name,
      icon: m.icon,
      path: m.path,
      component: m.component,
      type: m.type,
      permissionCode: m.permissionCode,
      sortOrder: m.sortOrder,
      isVisible: m.isVisible,
      status: m.status,
      children: buildTree(m.id, menus),
    }));
}

export class MenuService {
  async create(input: CreateMenuInput): Promise<{ data: MenuTreeItem }> {
    if (input.parentId) {
      const parent = await prisma.menu.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.deletedAt) throw new AppError(404, 'MENU_PARENT_NOT_FOUND', '父菜单不存在');
    }

    const menu = await prisma.menu.create({
      data: {
        id: generateId(),
        parentId: input.parentId ?? null,
        name: input.name,
        icon: input.icon ?? null,
        path: input.path ?? null,
        component: input.component ?? null,
        type: input.type,
        permissionCode: input.permissionCode ?? null,
        sortOrder: input.sortOrder,
        isVisible: input.isVisible,
        status: input.status,
      },
    });

    return { data: { ...menu, children: [] } };
  }

  async delete(id: string): Promise<void> {
    const menu = await prisma.menu.findUnique({ where: { id } });
    if (!menu || menu.deletedAt) throw new AppError(404, 'MENU_NOT_FOUND', '菜单不存在');

    const childrenCount = await prisma.menu.count({ where: { parentId: id, deletedAt: null } });
    if (childrenCount > 0) throw new AppError(400, 'MENU_HAS_CHILDREN', '存在子菜单不可删除');

    await prisma.menu.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async update(input: UpdateMenuInput): Promise<{ data: MenuTreeItem }> {
    const menu = await prisma.menu.findUnique({ where: { id: input.id } });
    if (!menu || menu.deletedAt) throw new AppError(404, 'MENU_NOT_FOUND', '菜单不存在');

    const data: Record<string, unknown> = {};
    if (input.parentId !== undefined) data.parentId = input.parentId || null;
    if (input.name !== undefined) data.name = input.name;
    if (input.icon !== undefined) data.icon = input.icon || null;
    if (input.path !== undefined) data.path = input.path || null;
    if (input.component !== undefined) data.component = input.component || null;
    if (input.type !== undefined) data.type = input.type;
    if (input.permissionCode !== undefined) data.permissionCode = input.permissionCode || null;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.isVisible !== undefined) data.isVisible = input.isVisible;
    if (input.status !== undefined) data.status = input.status;

    const updated = await prisma.menu.update({ where: { id: input.id }, data });
    return { data: { ...updated, children: [] } };
  }

  async detail(id: string): Promise<{ data: MenuTreeItem }> {
    const menu = await prisma.menu.findUnique({ where: { id } });
    if (!menu || menu.deletedAt) throw new AppError(404, 'MENU_NOT_FOUND', '菜单不存在');

    return { data: { ...menu, children: [] } };
  }

  async tree(): Promise<{ data: MenuTreeItem[] }> {
    const menus = await prisma.menu.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });

    return { data: buildTree(null, menus) };
  }

  async batchUpdate(input: BatchUpdateMenuInput): Promise<void> {
    for (const item of input.updates) {
      const data: Record<string, unknown> = {};
      if (item.sortOrder !== undefined) data.sortOrder = item.sortOrder;
      if (item.isVisible !== undefined) data.isVisible = item.isVisible;
      if (item.status !== undefined) data.status = item.status;
      if (item.parentId !== undefined) data.parentId = item.parentId || null;

      await prisma.menu.updateMany({ where: { id: item.id, deletedAt: null }, data });
    }
  }

  async getUserMenus(userId: string): Promise<{ data: MenuTreeItem[] }> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { roleId: true } });
    if (!user || !user.roleId) return { data: [] };

    const menus = await prisma.menu.findMany({
      where: {
        roleMenus: { some: { roleId: user.roleId, deletedAt: null } },
        deletedAt: null,
        status: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return { data: buildTree(null, menus) };
  }
}

export const menuService = new MenuService();
