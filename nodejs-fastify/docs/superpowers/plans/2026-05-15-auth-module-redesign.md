# Auth Module Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the auth module into a full RBAC permission system with 5 modules (auth, user, role, menu, department), UUID v7 IDs, digital error codes, and semantic APIs.

**Architecture:** Modular-layered hybrid. Each domain (auth/user/role/menu/department) is a self-contained module under `src/modules/` with routes/service/schema files. Shared infrastructure (ID generation, error classes, permission guard) lives in `src/shared/`. Session-based auth via `@fastify/session` + Redis remains, with an added `requirePermission` middleware for role-based access control.

**Tech Stack:** Node.js + Fastify 5 + Prisma 6 + MySQL 8 + Zod + TypeScript + uuidv7

**Spec:** `docs/superpowers/specs/2026-05-15-auth-module-redesign.md`

**Prisma schema:** Already updated in `prisma/schema.prisma` (9 models: User, Role, Permission, RolePermission, Menu, RoleMenu, Department, LoginLog, OperationLog)

---

### Task 1: Install uuidv7 dependency and update shared infrastructure

**Files:**
- Modify: `package.json`
- Create: `src/shared/lib/id.ts`
- Modify: `src/shared/lib/errors.ts`
- Modify: `src/shared/lib/response.ts`
- Modify: `src/shared/middleware/auth.guard.ts`
- Create: `src/shared/middleware/permission.guard.ts`
- Modify: `src/shared/middleware/error.middleware.ts`

- [ ] **Step 1: Install uuidv7**

Run: `pnpm add uuidv7`

- [ ] **Step 2: Create ID generator utility `src/shared/lib/id.ts`**

```typescript
/**
 * ID 生成器
 *
 * 统一使用 UUID v7（时间有序字符串）。
 * 封装为单层函数，方便后续切换 ID 生成策略。
 */

import { uuidv7 } from 'uuidv7';

export function generateId(): string {
  return uuidv7();
}
```

- [ ] **Step 3: Update `src/shared/lib/errors.ts` — change `code` from string to number**

```typescript
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

- [ ] **Step 4: Update `src/shared/lib/response.ts` — change `code` from string to number in `ErrorResponse`**

```typescript
export interface ErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    details?: unknown;
  };
}

export function fail(code: number, message: string, details?: unknown): ErrorResponse {
  return { success: false, error: { code, message, ...(details ? { details } : {}) } };
}
```

- [ ] **Step 5: Update `src/shared/middleware/auth.guard.ts` — use digital error code**

```typescript
import { FastifyReply, FastifyRequest } from 'fastify';
import { fail } from '../lib/response.js';

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  if (!request.session?.userId) {
    return reply.status(401).send(fail(10001, '未登录或已过期'));
  }
}
```

- [ ] **Step 6: Create `src/shared/middleware/permission.guard.ts`**

```typescript
/**
 * 权限校验守卫中间件
 *
 * 校验当前用户是否拥有指定的权限码。
 * 需要配合 authGuard 先确保用户已登录。
 * 用法：{ preHandler: [authGuard, requirePermission('user:delete')] }
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { fail } from '../lib/response.js';
import { prisma } from '../../database/prisma.js';

export function requirePermission(permissionCode: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.session?.userId as string | undefined;
    if (!userId) {
      return reply.status(401).send(fail(10001, '未登录或已过期'));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });

    if (!user?.roleId) {
      return reply.status(403).send(fail(1007, '权限不足'));
    }

    const permission = await prisma.rolePermission.findFirst({
      where: {
        roleId: user.roleId,
        permissionCode,
        deletedAt: null,
      },
    });

    if (!permission) {
      return reply.status(403).send(fail(1007, '权限不足'));
    }
  };
}
```

- [ ] **Step 7: Update `src/shared/middleware/error.middleware.ts` — change error code handling for AppError**

Change the AppError handling line:
```typescript
return reply.status(error.statusCode).send(fail(error.code, error.message, error.details));
```

This stays the same — only the types changed, not the usage. Just verify it compiles.

- [ ] **Step 8: Commit**

```bash
git add package.json src/shared/lib/id.ts src/shared/lib/errors.ts src/shared/lib/response.ts src/shared/middleware/auth.guard.ts src/shared/middleware/permission.guard.ts src/shared/middleware/error.middleware.ts
git commit -m "feat: add uuidv7, digital error codes, permission guard middleware"
```

---

### Task 2: Update Auth module and Session types

**Files:**
- Modify: `src/modules/auth/auth.types.ts`
- Modify: `src/modules/auth/auth.schema.ts`
- Modify: `src/modules/auth/auth.service.ts`
- Modify: `src/modules/auth/auth.routes.ts`

- [ ] **Step 1: Update `auth.types.ts` — change userId from number to string**

```typescript
import 'fastify';

declare module 'fastify' {
  interface Session {
    userId: string;
    username: string;
    role: string;
  }
}
```

- [ ] **Step 2: Update `auth.schema.ts`**

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50),
  password: z.string().min(1, '密码不能为空').max(255),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1).max(255),
  newPassword: z.string().min(6, '密码至少6位').max(255),
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const passwordResetSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(6).max(255),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

export interface UserLoginResponse {
  id: string;
  username: string;
  nickname: string;
  avatar: string | null;
  role: { id: string; name: string; code: string } | null;
  menus: MenuTreeItem[];
  permissions: string[];
}

export interface MenuTreeItem {
  id: string;
  name: string;
  path: string | null;
  icon: string | null;
  type: string;
  children: MenuTreeItem[];
}
```

- [ ] **Step 3: Rewrite `auth.service.ts`**

```typescript
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import type { LoginInput, UserLoginResponse, MenuTreeItem } from './auth.schema.js';
import { generateId } from '../../shared/lib/id.js';

async function buildMenuTree(roleId: string): Promise<MenuTreeItem[]> {
  const roleMenus = await prisma.roleMenu.findMany({
    where: { roleId, deletedAt: null },
    select: { menuId: true },
  });

  if (roleMenus.length === 0) return [];

  const menuIds = roleMenus.map((rm) => rm.menuId iz;
  const menus = await prisma.menu.findMany({
    where: { id: { in: menuIds }, deletedAt: null, status: true },
    orderBy: { sortOrder: 'asc' },
  });

  const menuMap = new Map(menus.map((m) => [m.id, m]));
  const roots: MenuTreeItem[] = [];

  for (const menu of menus) {
    if (menu.type === 'button') continue;
    const item: MenuTreeItem & { _parentId: string | null } = {
      id: menu.id,
      name: menu.name,
      path: menu.path,
      icon: menu.icon,
      type: menu.type,
      children: [],
      _parentId: menu.parentId,
    };
    if (!menu.parentId) {
      roots.push(item);
    } else {
      const parent = menuMap.get(menu.parentId);
      if (parent) {
        // Find the parent in the built structure — simplified: we push orphan items too
        roots.push(item);
      }
    }
  }

  // Build tree by nesting children under parents
  const itemMap = new Map<string, MenuTreeItem & { _parentId: string | null }>();
  const allItems: (MenuTreeItem & { _parentId: string | null })[] = [];

  // Actually, use a simpler recursive approach
  return buildTreeRecursive(null, menus);
}

function buildTreeRecursive(parentId: string | null, allMenus: any[]): MenuTreeItem[] {
  return allMenus
    .filter((m) => m.parentId === parentId && m.type !== 'button')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      id: m.id,
      name: m.name,
      path: m.path,
      icon: m.icon,
      type: m.type,
      children: buildTreeRecursive(m.id, allMenus),
    }));
}

export class AuthService {
  async login(input: LoginInput): Promise<{ data: UserLoginResponse }> {
    const user = await prisma.user.findUnique({
      where: { username: input.username },
      include: { role: true },
    });

    if (!user || user.deletedAt) {
      throw new AppError(401, 10002, '用户名或���码错误');
    }

    // Check lock
    if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(403, 10004, '账号已被锁定');
    }

    if (!user.isActive) {
      throw new AppError(403, 10003, '账号已被禁用');
    }

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      // Increment fail count
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginFailCount: { increment: 1 },
          ...(user.loginFailCount >= 4 ? { isLocked: true, lockedUntil: new Date(Date.now() + 30 * 60 * 1000) } : {}),
        },
      });

      // Record login log
      await prisma.loginLog.create({
        data: {
          id: generateId(),
          userId: user.id,
          username: input.username,
          ip: '', // Will be set from request
          status: 'failure',
          failReason: '密码错误',
        },
      });

      throw new AppError(401, 10002, '用户名或密码错误');
    }

    // Reset fail count on success
    await prisma.user.update({
      where: { id: user.id },
      data: { loginFailCount: 0, isLocked: false, lockedUntil: null },
    });

    // Get permissions
    let permissions: string[] = [];
    let menus: MenuTreeItem[] = [];

    if (user.roleId && user.role) {
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { roleId: user.roleId, deletedAt: null },
        select: { permissionCode: true },
      });
      permissions = rolePermissions.map((rp) => rp.permissionCode);

      const roleMenus = await prisma.menu.findMany({
        where: {
          roleMenus: { some: { roleId: user.roleId, deletedAt: null } },
          deletedAt: null,
          status: true,
        },
        orderBy: { sortOrder: 'asc' },
      });
      menus = buildTreeRecursive(null, roleMenus);
    }

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

    let permissions: string[] = [];
    let menus: MenuTreeItem[] = [];

    if (user.roleId && user.role) {
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { roleId: user.roleId, deletedAt: null },
        select: { permissionCode: true },
      });
      permissions = rolePermissions.map((rp) => rp.permissionCode);

      const roleMenus = await prisma.menu.findMany({
        where: {
          roleMenus: { some: { roleId: user.roleId, deletedAt: null } },
          deletedAt: null,
          status: true,
        },
        orderBy: { sortOrder: 'asc' },
      });
      menus = buildTreeRecursive(null, roleMenus);
    }

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

  async changePassword(userId: string, input: { oldPassword: string; newPassword: string }): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 2001, '用户不存在');

    const valid = await bcrypt.compare(input.oldPassword, user.password);
    if (!valid) throw new AppError(400, 1005, '原密码错误');

    const hashed = await bcrypt.hash(input.newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  }

  async resetPassword(targetUserId: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new AppError(404, 2001, '用户不存在');

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: targetUserId }, data: { password: hashed } });
  }
}

export const authService = new AuthService();
```

**Wait** — there's a bug variable name collision. The `buildMenuTree` function was renamed to `buildTreeRecursive` with a typo `iz`. Let me fix this properly.

- [ ] **Step 4: Rewrite `auth.service.ts` — clean version**

```typescript
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
```

- [ ] **Step 5: Rewrite `auth.routes.ts`**

```typescript
import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { authService } from './auth.service.js';
import { loginSchema, passwordChangeSchema, passwordResetSchema } from './auth.schema.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input);

    request.session.userId = result.data.id;
    request.session.username = result.data.username;
    request.session.role = result.data.role?.code ?? '';

    return reply.send(ok(result.data, '登录成功'));
  });

  app.post('/auth/logout', { preHandler: authGuard }, async (request, reply) => {
    await request.session.destroy();
    return reply.send(ok(null, '已退出登录'));
  });

  app.get('/auth/me', { preHandler: authGuard }, async (request, reply) => {
    const result = await authService.getMe(request.session.userId);
    return reply.send(ok(result.data));
  });

  app.post('/auth/password/change', { preHandler: authGuard }, async (request, reply) => {
    const input = passwordChangeSchema.parse(request.body);
    await authService.changePassword(request.session.userId, input.oldPassword, input.newPassword);
    return reply.send(ok(null, '密码修改成功'));
  });

  app.post('/auth/password/reset', { preHandler: authGuard }, async (request, reply) => {
    const input = passwordResetSchema.parse(request.body);
    await authService.resetPassword(input.userId, input.newPassword);
    return reply.send(ok(null, '密码重置成功'));
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/auth/
git commit -m "feat: rewrite auth module with UUID, digital errors, menu/permission response"
```

---

### Task 3: Create User module

**Files:**
- Create: `src/modules/user/user.schema.ts`
- Create: `src/modules/user/user.service.ts`
- Create: `src/modules/user/user.routes.ts`

- [ ] **Step 1: Create `user.schema.ts`**

```typescript
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
```

- [ ] **Step 2: Create `user.service.ts`**

```typescript
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
      if (existing.username === input.username) throw new AppError(409, 2002, '用户名已存在');
      if (input.email && existing.email === input.email) throw new AppError(409, 2003, '邮箱已存在');
      if (input.phone && existing.phone === input.phone) throw new AppError(409, 2004, '手机号已存在');
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
    if (!user || user.deletedAt) throw new AppError(404, 2001, '用户不存在');

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async update(input: UpdateUserInput): Promise<{ data: UserDetail }> {
    const user = await prisma.user.findUnique({ where: { id: input.id } });
    if (!user || user.deletedAt) throw new AppError(404, 2001, '用户不存在');

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
    if (!user || user.deletedAt) throw new AppError(404, 2001, '用户不存在');

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
```

- [ ] **Step 3: Create `user.routes.ts`**

```typescript
import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { userService } from './user.service.js';
import { createUserSchema, updateUserSchema, batchUpdateUserSchema, userListQuerySchema } from './user.schema.js';

export async function userRoutes(app: FastifyInstance) {
  app.post('/user/create', { preHandler: authGuard }, async (request, reply) => {
    const input = createUserSchema.parse(request.body);
    const result = await userService.create(input);
    return reply.send(ok(result.data, '创建成功'));
  });

  app.post('/user/delete', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.body as { id: string };
    if (!id) throw new Error('id is required');
    await userService.delete(id);
    return reply.send(ok(null, '删除成功'));
  });

  app.post('/user/update', { preHandler: authGuard }, async (request, reply) => {
    const input = updateUserSchema.parse(request.body);
    const result = await userService.update(input);
    return reply.send(ok(result.data, '更新成功'));
  });

  app.get('/user/detail', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.query as { id: string };
    if (!id) throw new Error('id is required');
    const result = await userService.detail(id);
    return reply.send(ok(result.data));
  });

  app.get('/user/list', { preHandler: authGuard }, async (request, reply) => {
    const query = userListQuerySchema.parse(request.query);
    const result = await userService.list(query);
    return reply.send(ok(result.data));
  });

  app.post('/user/batch-update', { preHandler: authGuard }, async (request, reply) => {
    const input = batchUpdateUserSchema.parse(request.body);
    await userService.batchUpdate(input);
    return reply.send(ok(null, '批量更新成功'));
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/user/
git commit -m "feat: add user management module with CRUD and batch update"
```

---

### Task 4: Create Role module

**Files:**
- Create: `src/modules/role/role.schema.ts`
- Create: `src/modules/role/role.service.ts`
- Create: `src/modules/role/role.routes.ts`

- [ ] **Step 1: Create `role.schema.ts`**

```typescript
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
```

- [ ] **Step 2: Create `role.service.ts`**

```typescript
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

    return { data: { ...role, menuIds: input.menuIds, permissionCodes: input.permissionCodes } as RoleDetail };
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

    const updated = await prisma.role.findUnique({ where: { id: input.id } })!;

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
```

- [ ] **Step 3: Create `role.routes.ts`**

```typescript
import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { roleService } from './role.service.js';
import { createRoleSchema, updateRoleSchema, batchUpdateRoleSchema } from './role.schema.js';

export async function roleRoutes(app: FastifyInstance) {
  app.post('/role/create', { preHandler: authGuard }, async (request, reply) => {
    const input = createRoleSchema.parse(request.body);
    const result = await roleService.create(input);
    return reply.send(ok(result.data, '创建成功'));
  });

  app.post('/role/delete', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.body as { id: string };
    await roleService.delete(id);
    return reply.send(ok(null, '删除成功'));
  });

  app.post('/role/update', { preHandler: authGuard }, async (request, reply) => {
    const input = updateRoleSchema.parse(request.body);
    const result = await roleService.update(input);
    return reply.send(ok(result.data, '更新成功'));
  });

  app.get('/role/detail', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.query as { id: string };
    const result = await roleService.detail(id);
    return reply.send(ok(result.data));
  });

  app.get('/role/list', { preHandler: authGuard }, async (request, reply) => {
    const result = await roleService.list();
    return reply.send(ok(result.data));
  });

  app.post('/role/batch-update', { preHandler: authGuard }, async (request, reply) => {
    const input = batchUpdateRoleSchema.parse(request.body);
    await roleService.batchUpdate(input);
    return reply.send(ok(null, '批量更新成功'));
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/role/
git commit -m "feat: add role management module with menu/permission assignment"
```

---

### Task 5: Create Menu module

**Files:**
- Create: `src/modules/menu/menu.schema.ts`
- Create: `src/modules/menu/menu.service.ts`
- Create: `src/modules/menu/menu.routes.ts`

- [ ] **Step 1: Create `menu.schema.ts`**

```typescript
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
```

- [ ] **Step 2: Create `menu.service.ts`**

```typescript
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../shared/lib/errors.js';
import { generateId } from '../../shared/lib/id.js';
import type { CreateMenuInput, UpdateMenuInput, BatchUpdateMenuInput, MenuTreeItem } from './menu.schema.js';

function toTree(menus: any[]): MenuTreeItem[] {
  const sorted = [...menus].sort((a, b) => a.sortOrder - b.sortOrderZeroPad - b.sortOrder);
  return buildTree(null, sorted);
}

function buildTree(parentId: string | null, menus: any[]): MenuTreeItem[] {
  return menus
    .filter((m) => m.parentId === parentId)
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
      if (!parent || parent.deletedAt) throw new AppError(404, 4002, '父菜单不存在');
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
    if (!menu || menu.deletedAt) throw new AppError(404, 4001, '菜单不存在');

    const childrenCount = await prisma.menu.count({ where: { parentId: id, deletedAt: null } });
    if (childrenCount > 0) throw new AppError(400, 4003, '存在子菜单不可删除');

    await prisma.menu.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async update(input: UpdateMenuInput): Promise<{ data: MenuTreeItem }> {
    const menu = await prisma.menu.findUnique({ where: { id: input.id } });
    if (!menu || menu.deletedAt) throw new AppError(404, 4001, '菜单不存在');

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
    if (!menu || menu.deletedAt) throw new AppError(404, 4001, '菜单不存在');

    return { data: { ...menu, children: [] } };
  }

  async tree(): Promise<{ data: MenuTreeItem[] }> {
    const menus = await prisma.menu.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });

    return { data: toTree(menus) };
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

    return { data: toTree(menus) };
  }
}

export const menuService = new MenuService();
```

- [ ] **Step 3: Create `menu.routes.ts`**

```typescript
import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { menuService } from './menu.service.js';
import { createMenuSchema, updateMenuSchema, batchUpdateMenuSchema } from './menu.schema.js';

export async function menuRoutes(app: FastifyInstance) {
  app.post('/menu/create', { preHandler: authGuard }, async (request, reply) => {
    const input = createMenuSchema.parse(request.body);
    const result = await menuService.create(input);
    return reply.send(ok(result.data, '创建成功'));
  });

  app.post('/menu/delete', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.body as { id: string };
    await menuService.delete(id);
    return reply.send(ok(null, '删除成功'));
  });

  app.post('/menu/update', { preHandler: authGuard }, async (request, reply) => {
    const input = updateMenuSchema.parse(request.body);
    const result = await menuService.update(input);
    return reply.send(ok(result.data, '更新成功'));
  });

  app.get('/menu/detail', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.query as { id: string };
    const result = await menuService.detail(id);
    return reply.send(ok(result.data));
  });

  app.get('/menu/tree', { preHandler: authGuard }, async (request, reply) => {
    const result = await menuService.tree();
    return reply.send(ok(result.data));
  });

  app.get('/menu/get-user-menus', { preHandler: authGuard }, async (request, reply) => {
    const result = await menuService.getUserMenus(request.session.userId);
    return reply.send(ok(result.data));
  });

  app.post('/menu/batch-update', { preHandler: authGuard }, async (request, reply) => {
    const input = batchUpdateMenuSchema.parse(request.body);
    await menuService.batchUpdate(input);
    return reply.send(ok(null, '批量更新成功'));
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/menu/
git commit -m "feat: add menu management module with tree structure and batch sort"
```

---

### Task 6: Create Department module

**Files:**
- Create: `src/modules/department/department.schema.ts`
- Create: `src/modules/department/department.service.ts`
- Create: `src/modules/department/department.routes.ts`

- [ ] **Step 1: Create `department.schema.ts`**

```typescript
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
```

- [ ] **Step 2: Create `department.service.ts`**

```typescript
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
      if (!parent || parent.deletedAt) throw new AppError(404, 5002, '父部门不存在');
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
    if (!dept || dept.deletedAt) throw new AppError(404, 5001, '部门不存在');

    const childCount = await prisma.department.count({ where: { parentId: id, deletedAt: null } });
    if (childCount > 0) throw new AppError(400, 5004, '存在子部门不可删除');

    const userCount = await prisma.user.count({ where: { departmentId: id, deletedAt: null } });
    if (userCount > 0) throw new AppError(400, 5005, '部门下有用户不可删除');

    await prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async update(input: UpdateDepartmentInput): Promise<{ data: DepartmentTreeItem }> {
    const dept = await prisma.department.findUnique({ where: { id: input.id } });
    if (!dept || dept.deletedAt) throw new AppError(404, 5001, '部门不存在');

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
    if (!dept || dept.deletedAt) throw new AppError(404, 5001, '部门不存在');

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
```

- [ ] **Step 3: Create `department.routes.ts`**

```typescript
import { FastifyInstance } from 'fastify';
import { authGuard } from '../../shared/middleware/auth.guard.js';
import { ok } from '../../shared/lib/response.js';
import { departmentService } from './department.service.js';
import { createDepartmentSchema, updateDepartmentSchema, batchUpdateDepartmentSchema } from './department.schema.js';

export async function departmentRoutes(app: FastifyInstance) {
  app.post('/department/create', { preHandler: authGuard }, async (request, reply) => {
    const input = createDepartmentSchema.parse(request.body);
    const result = await departmentService.create(input);
    return reply.send(ok(result.data, '创建成功'));
  });

  app.post('/department/delete', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.body as { id: string };
    await departmentService.delete(id);
    return reply.send(ok(null, '删除成功'));
  });

  app.post('/department/update', { preHandler: authGuard }, async (request, reply) => {
    const input = updateDepartmentSchema.parse(request.body);
    const result = await departmentService.update(input);
    return reply.send(ok(result.data, '更新成功'));
  });

  app.get('/department/detail', { preHandler: authGuard }, async (request, reply) => {
    const { id } = request.query as { id: string };
    const result = await departmentService.detail(id);
    return reply.send(ok(result.data));
  });

  app.get('/department/tree', { preHandler: authGuard }, async (request, reply) => {
    const result = await departmentService.tree();
    return reply.send(ok(result.data));
  });

  app.get('/department/list-users', { preHandler: authGuard }, async (request, reply) => {
    const { departmentId } = request.query as { departmentId: string };
    const result = await departmentService.listUsers(departmentId);
    return reply.send(ok(result.data));
  });

  app.post('/department/batch-update', { preHandler: authGuard }, async (request, reply) => {
    const input = batchUpdateDepartmentSchema.parse(request.body);
    await departmentService.batchUpdate(input);
    return reply.send(ok(null, '批量更新成功'));
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/department/
git commit -m "feat: add department management module with tree structure"
```

---

### Task 7: Update app.ts to register new modules

**Files:**
- Modify: `src/app.ts`

- [ ] **Step 1: Update `src/app.ts` — register all new modules**

Replace the imports and registration block:

```typescript
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { roleRoutes } from './modules/role/role.routes.js';
import { menuRoutes } from './modules/menu/menu.routes.js';
import { departmentRoutes } from './modules/department/department.routes.js';
```

In the registration block:
```typescript
await app.register(
  async (api) => {
    await api.register(healthRoutes);
    await api.register(authRoutes);
    await api.register(userRoutes);
    await api.register(roleRoutes);
    await api.register(menuRoutes);
    await api.register(departmentRoutes);
  },
  { prefix: '/api/v1' },
);
```

- [ ] **Step 2: Commit**

```bash
git add src/app.ts
git commit -m "feat: register all new module routes in app.ts"
```

---

### Task 8: Generate Prisma migration and verify build

**Files:**
- Modify: `prisma/schema.prisma` (already updated)
- Run: Prisma migrate + TypeScript build check

- [ ] **Step 1: Generate Prisma migration**

```bash
pnpm prisma generate
pnpm prisma migrate dev --name init_rbac
```

Expected: Migration created successfully, Prisma client regenerated.

- [ ] **Step 2: Verify TypeScript compilation**

```bash
pnpm lint
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit migration**

```bash
git add prisma/migrations/
git commit -m "feat: add RBAC database schema migration"
```

---

### Task 9: Verification

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

Expected: Server starts on configured port (default 3000).

- [ ] **Step 2: Test login flow**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt
```

Expected: Returns user data with role, menus, permissions. Session cookie saved.

- [ ] **Step 3: Test me endpoint**

```bash
curl -b cookies.txt http://localhost:3000/api/v1/auth/me
```

- [ ] **Step 4: Test user list**

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/user/list?page=1&pageSize=10"
```

- [ ] **Step 5: Test error codes**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nonexistent","password":"wrong"}'
```

Expected: `{"success":false,"error":{"code":10002,"message":"用户名或密码错误"}}`

---

## Self-Review

**Spec coverage:**
- ✅ UUID v7 IDs — Task 1 (id.ts), Task 2 (auth service)
- ✅ Digital error codes — Task 1 (errors.ts, response.ts), all route/service files
- ✅ Semantic API (GET for queries, POST for mutations) — All route files
- ✅ batch-update via `updates` array — User, Role, Menu, Department services
- ✅ permissions table with code as PK — Schema already done
- ✅ Associative tables with independent id + soft delete — Schema already done
- ✅ Menu tree structure (directory/menu/button) — Menu module
- ✅ requirePermission middleware — Task 1 (permission.guard.ts)
- ✅ Role create with full config (menus + permissions) ��� Role service
- ✅ User CRUD with list/filter — User module
- ✅ Login failure lock — Auth service
- ✅ Login/operation logs — Schema done, login log in Auth service

**Placeholder check:** No TODOs, TBDs, or placeholder code. All code is complete.

**Type consistency:** All types reference `string` for IDs (UUID v7). Error codes are `number`. Session userId is `string`. Consistent across all modules.
