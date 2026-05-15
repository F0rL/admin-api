/**
 * 认证模块 - 业务逻辑层
 *
 * 处理登录认证与用户信息查询的核心逻辑。
 * login()       - 校验用户名密码、锁定检查、登录日志、返回用户+菜单+权限
 * getMe()       - 根据 Session 中的 userId 查询当前用户信息
 * changePassword() - 修改当前用户密码（需原密码验证）
 * resetPassword()  - 管理员重置指定用户密码（无需原密码）
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { generateId } from '../../shared/lib/id.js';
import type { LoginInput, UserLoginResponse, MenuTreeItem } from './auth.schema.js';

function buildMenuTree(parentId: string | null, allMenus: any[]): MenuTreeItem[] {
  return allMenus
    .filter((m) => m.parentId === parentId && m.type !== 'button')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      id: m.id,
      name: m.name,
      path: m.path,
      icon: m.icon,
      type: m.type,
      children: buildMenuTree(m.id, allMenus),
    }));
}

async function getUserPermissions(roleId: string) {
  const [rolePermissions, roleMenus] = await Promise.all([
    prisma.rolePermission.findMany({
      where: { roleId, deletedAt: null },
      select: { permissionCode: true },
    }),
    prisma.menu.findMany({
      where: {
        roleMenus: { some: { roleId, deletedAt: null } },
        deletedAt: null,
        status: true,
      },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return {
    permissions: rolePermissions.map((rp) => rp.permissionCode),
    menus: buildMenuTree(null, roleMenus),
  };
}

export class AuthService {
  async login(input: LoginInput): Promise<{ data: UserLoginResponse }> {
    const user = await prisma.user.findUnique({
      where: { username: input.username },
      include: { role: true },
    });

    if (!user || user.deletedAt) {
      throw new AppError(401, 1002, '用户名或密码错误');
    }

    if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(403, 1004, '账号已被锁定');
    }

    if (!user.isActive) {
      throw new AppError(403, 1003, '账号已被禁用');
    }

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      const failCount = user.loginFailCount + 1;
      const updates: Record<string, unknown> = { loginFailCount: failCount };
      if (failCount >= 5) {
        updates.isLocked = true;
        updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await prisma.user.update({ where: { id: user.id }, data: updates });

      await prisma.loginLog.create({
        data: { id: generateId(), userId: user.id, username: input.username, ip: '', status: 'failure', failReason: '密码错误' },
      });

      throw new AppError(401, 1002, '用户名或密码错误');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginFailCount: 0, isLocked: false, lockedUntil: null },
    });

    const { permissions, menus } = user.roleId
      ? await getUserPermissions(user.roleId)
      : { permissions: [], menus: [] };

    return {
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role ? { id: user.role.id, name: user.role.name, code: user.role.code } : null,
        menus,
        permissions,
      },
    };
  }

  async getMe(userId: string): Promise<{ data: UserLoginResponse }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.deletedAt) {
      throw new AppError(404, 2001, '用户不存在');
    }

    const { permissions, menus } = user.roleId
      ? await getUserPermissions(user.roleId)
      : { permissions: [], menus: [] };

    return {
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role ? { id: user.role.id, name: user.role.name, code: user.role.code } : null,
        menus,
        permissions,
      },
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 2001, '用户不存在');

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) throw new AppError(400, 1005, '原密码错误');

    await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 10) } });
  }

  async resetPassword(targetUserId: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new AppError(404, 2001, '用户不存在');

    await prisma.user.update({ where: { id: targetUserId }, data: { password: await bcrypt.hash(newPassword, 10) } });
  }
}

export const authService = new AuthService();
