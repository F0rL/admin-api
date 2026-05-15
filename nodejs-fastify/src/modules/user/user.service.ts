import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { generateId } from '../../shared/lib/id.js';
import type { CreateUserInput, UpdateUserInput, BatchUpdateUserInput, UserListQuery, UserListItem, UserDetail } from './user.schema.js';

function toUserListItem(user: any): UserListItem {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role ? { id: user.role.id, name: user.role.name } : null,
    department: user.department ? { id: user.department.id, name: user.department.name } : null,
    isActive: user.isActive,
    isLocked: user.isLocked,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function toUserDetail(user: any): UserDetail {
  return {
    ...toUserListItem(user),
    loginFailCount: user.loginFailCount,
    createdBy: user.createdBy,
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class UserService {
  async create(input: CreateUserInput): Promise<{ data: UserDetail }> {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: input.username },
          ...(input.email ? [{ email: input.email }] : []),
          ...(input.phone ? [{ phone: input.phone }] : []),
        ],
        deletedAt: null,
      },
    });

    if (existing) {
      if (existing.username === input.username) throw new AppError(409, 'USER_DUPLICATE_USERNAME', '用户名已存在');
      if (input.email && existing.email === input.email) throw new AppError(409, 'USER_DUPLICATE_EMAIL', '邮箱已存在');
      if (input.phone && existing.phone === input.phone) throw new AppError(409, 'USER_DUPLICATE_PHONE', '手机号已存在');
    }

    const user = await prisma.user.create({
      data: {
        id: generateId(),
        username: input.username,
        password: await bcrypt.hash(input.password, 10),
        nickname: input.nickname,
        email: input.email ?? null,
        phone: input.phone ?? null,
        avatar: input.avatar ?? null,
        roleId: input.roleId ?? null,
        departmentId: input.departmentId ?? null,
      },
      include: { role: true, department: true },
    });

    return { data: toUserDetail(user) };
  }

  async delete(id: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async update(input: UpdateUserInput): Promise<{ data: UserDetail }> {
    const user = await prisma.user.findUnique({ where: { id: input.id } });
    if (!user || user.deletedAt) throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');

    const data: Record<string, unknown> = {};
    if (input.nickname !== undefined) data.nickname = input.nickname;
    if (input.email !== undefined) data.email = input.email || null;
    if (input.phone !== undefined) data.phone = input.phone || null;
    if (input.avatar !== undefined) data.avatar = input.avatar || null;
    if (input.roleId !== undefined) data.roleId = input.roleId || null;
    if (input.departmentId !== undefined) data.departmentId = input.departmentId || null;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.isLocked !== undefined) data.isLocked = input.isLocked;
    if (input.password) data.password = await bcrypt.hash(input.password, 10);

    const updated = await prisma.user.update({
      where: { id: input.id },
      data,
      include: { role: true, department: true },
    });

    return { data: toUserDetail(updated) };
  }

  async detail(id: string): Promise<{ data: UserDetail }> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true, department: true },
    });
    if (!user || user.deletedAt) throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');

    return { data: toUserDetail(user) };
  }

  async list(query: UserListQuery): Promise<{ data: { list: UserListItem[]; total: number; page: number; pageSize: number } }> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword } },
        { nickname: { contains: query.keyword } },
        { email: { contains: query.keyword } },
        { phone: { contains: query.keyword } },
      ];
    }
    if (query.status !== undefined) where.isActive = query.status;
    if (query.roleId) where.roleId = query.roleId;
    if (query.departmentId) where.departmentId = query.departmentId;

    const [list, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        include: { role: { select: { id: true, name: true } }, department: { select: { id: true, name: true } } },
        orderBy: { [query.sortField]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.user.count({ where: where as any }),
    ]);

    return { data: { list: list.map(toUserListItem), total, page: query.page, pageSize: query.pageSize } };
  }

  async batchUpdate(input: BatchUpdateUserInput): Promise<void> {
    for (const item of input.updates) {
      const data: Record<string, unknown> = {};
      if (item.roleId !== undefined) data.roleId = item.roleId || null;
      if (item.departmentId !== undefined) data.departmentId = item.departmentId || null;
      if (item.isActive !== undefined) data.isActive = item.isActive;
      if (item.isLocked !== undefined) data.isLocked = item.isLocked;

      await prisma.user.updateMany({
        where: { id: item.id, deletedAt: null },
        data,
      });
    }
  }
}

export const userService = new UserService();
