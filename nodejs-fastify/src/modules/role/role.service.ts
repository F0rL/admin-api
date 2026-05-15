import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { generateId } from '../../shared/lib/id.js';
import type { CreateRoleInput, UpdateRoleInput, BatchUpdateRoleInput, RoleListItem, RoleDetail } from './role.schema.js';

function toRoleListItem(role: any, userCount: number): RoleListItem {
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    isSystem: role.isSystem,
    status: role.status,
    sortOrder: role.sortOrder,
    userCount,
    createdAt: role.createdAt.toISOString(),
  };
}

export class RoleService {
  async create(input: CreateRoleInput): Promise<{ data: RoleDetail }> {
    const existing = await prisma.role.findFirst({
      where: {
        OR: [{ name: input.name }, { code: input.code }],
        deletedAt: null,
      },
    });
    if (existing) {
      if (existing.name === input.name) throw new AppError(409, 3003, '角色名称已存在');
      if (existing.code === input.code) throw new AppError(409, 3002, '角色编码已存在');
    }

    const role = await prisma.role.create({
      data: {
        id: generateId(),
        name: input.name,
        code: input.code,
        description: input.description ?? null,
        status: input.status,
        sortOrder: input.sortOrder,
      },
    });

    // Assign menus
    if (input.menuIds.length > 0) {
      await prisma.roleMenu.createMany({
        data: input.menuIds.map((menuId) => ({
          id: generateId(),
          roleId: role.id,
          menuId,
        })),
      });
    }

    // Assign permissions
    if (input.permissionCodes.length > 0) {
      await prisma.rolePermission.createMany({
        data: input.permissionCodes.map((permissionCode) => ({
          id: generateId(),
          roleId: role.id,
          permissionCode,
        })),
      });
    }

    return { data: { ...role, menuIds: input.menuIds, permissionCodes: input.permissionCodes } as unknown as RoleDetail };
  }

  async delete(id: string): Promise<void> {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role || role.deletedAt) throw new AppError(404, 3001, '角色不存在');
    if (role.isSystem) throw new AppError(400, 3004, '系统角色不可删除');

    await prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async update(input: UpdateRoleInput): Promise<{ data: RoleDetail }> {
    const role = await prisma.role.findUnique({ where: { id: input.id } });
    if (!role || role.deletedAt) throw new AppError(404, 3001, '角色不存在');

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.code !== undefined) data.code = input.code;
    if (input.description !== undefined) data.description = input.description || null;
    if (input.status !== undefined) data.status = input.status;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    await prisma.role.update({ where: { id: input.id }, data });

    // Sync menus
    if (input.menuIds !== undefined) {
      await prisma.roleMenu.updateMany({ where: { roleId: input.id }, data: { deletedAt: new Date() } });
      if (input.menuIds.length > 0) {
        await prisma.roleMenu.createMany({
          data: input.menuIds.map((menuId) => ({ id: generateId(), roleId: input.id, menuId })),
        });
      }
    }

    // Sync permissions
    if (input.permissionCodes !== undefined) {
      await prisma.rolePermission.updateMany({ where: { roleId: input.id }, data: { deletedAt: new Date() } });
      if (input.permissionCodes.length > 0) {
        await prisma.rolePermission.createMany({
          data: input.permissionCodes.map((code) => ({ id: generateId(), roleId: input.id, permissionCode: code })),
        });
      }
    }

    const updated = await prisma.role.findUnique({ where: { id: input.id } });

    const roleMenus = await prisma.roleMenu.findMany({ where: { roleId: input.id, deletedAt: null }, select: { menuId: true } });
    const rolePerms = await prisma.rolePermission.findMany({ where: { roleId: input.id, deletedAt: null }, select: { permissionCode: true } });

    return {
      data: {
        ...updated!,
        menuIds: roleMenus.map((rm) => rm.menuId),
        permissionCodes: rolePerms.map((rp) => rp.permissionCode),
      } as unknown as RoleDetail,
    };
  }

  async detail(id: string): Promise<{ data: RoleDetail }> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });
    if (!role || role.deletedAt) throw new AppError(404, 3001, '角色不存在');

    const [roleMenus, rolePerms] = await Promise.all([
      prisma.roleMenu.findMany({ where: { roleId: id, deletedAt: null }, select: { menuId: true } }),
      prisma.rolePermission.findMany({ where: { roleId: id, deletedAt: null }, select: { permissionCode: true } }),
    ]);

    return {
      data: {
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description,
        isSystem: role.isSystem,
        status: role.status,
        sortOrder: role.sortOrder,
        userCount: role._count.users,
        createdAt: role.createdAt.toISOString(),
        menuIds: roleMenus.map((rm) => rm.menuId),
        permissionCodes: rolePerms.map((rp) => rp.permissionCode),
      },
    };
  }

  async list(): Promise<{ data: RoleListItem[] }> {
    const roles = await prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { users: true } } },
    });

    return {
      data: roles.map((r) => toRoleListItem(r, r._count.users)),
    };
  }

  async batchUpdate(input: BatchUpdateRoleInput): Promise<void> {
    for (const item of input.updates) {
      const data: Record<string, unknown> = {};
      if (item.status !== undefined) data.status = item.status;
      if (item.sortOrder !== undefined) data.sortOrder = item.sortOrder;
      await prisma.role.updateMany({ where: { id: item.id, deletedAt: null }, data });
    }
  }
}

export const roleService = new RoleService();
