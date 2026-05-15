# Auth 模块重构设计文档

> 日期：2026-05-15
> 项目：admin-api / nodejs-fastify

---

## 1. 概述

对现有 Auth 模块进行重构，改造为面向中大型通用后台管理系统的完整权限体系。

### 1.1 目标

- 替换自增 ID 为 UUID v7
- 重构用户表，增加完整字段
- 实现 RBAC + 菜单按钮级权限控制
- 建立操作审计与登录日志
- 设计语义化 API 接口
- 采用数字错误码体系

### 1.2 涉及模块

- `auth` — 认证登录
- `user` — 用户管理
- `role` — 角色管理
- `menu` — 菜单管理
- `department` — 部门管理

---

## 2. 数据模型

### 2.1 ID 策略

全部主键使用 UUID v7（时间有序字符串），对前端 JS 友好（无 BigInt 精���丢失），支持排序。

```ts
import { uuidv7 } from 'uuidv7';
const id = uuidv7(); // "018f3a6b-7b3a-..."
```

### 2.2 表结构

#### users（用户表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID v7 |
| username | String(50) | UNIQUE, NOT NULL | 登录用户名 |
| password | String(255) | NOT NULL | bcrypt 加密 |
| nickname | String(100) | NOT NULL | 显示名称 |
| email | String(255) | UNIQUE | 邮箱 |
| phone | String(20) | UNIQUE | 手机号 |
| avatar | String(500) | | 头像 URL |
| roleId | String(36) | FK -> roles.id | 角色 |
| departmentId | String(36) | FK -> departments.id | 部门 |
| isActive | Boolean | default true | 启用状态 |
| isLocked | Boolean | default false | 锁定状态 |
| lockedUntil | DateTime | | 锁定截止时间 |
| lastLoginAt | DateTime | | 最后登录时间 |
| lastLoginIp | String(45) | | 最后登录 IP |
| loginFailCount | Int | default 0 | 登录失败次数 |
| createdBy | String(36) | | 创建人 |
| deletedAt | DateTime | | 软删除 |

#### roles（角色表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID v7 |
| name | String(50) | UNIQUE | 角色名称 |
| code | String(50) | UNIQUE | 角色编码 |
| description | String(255) | | 描述 |
| isSystem | Boolean | default false | 系统内置 |
| status | Boolean | default true | 启用状态 |
| sortOrder | Int | default 0 | 排序号 |
| deletedAt | DateTime | | 软删除 |

#### permissions（权限表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| code | String(100) | PK | 权限编码，如 `user:create` |
| name | String(50) | NOT NULL | 权限名称 |
| module | String(50) | NOT NULL | 所属模块 |
| description | String(255) | | 描述 |
| deletedAt | DateTime | | 软删除 |

#### role_permissions（角色-权限关联）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID v7 |
| roleId | String(36) | FK | 角色 ID |
| permissionCode | String(100) | FK | 权限编码 |
| deletedAt | DateTime | | 软删除 |

#### menus（菜单表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID v7 |
| parentId | String(36) | FK -> menus.id | 父菜单 |
| name | String(100) | NOT NULL | 菜单名称 |
| icon | String(100) | | 图标 |
| path | String(255) | | 前端路由 |
| component | String(255) | | 前端组件 |
| type | String(20) | NOT NULL | directory/menu/button |
| permissionCode | String(100) | FK -> permissions.code | 按钮级权限 |
| sortOrder | Int | default 0 | 排序号 |
| isVisible | Boolean | default true | 可见性 |
| status | Boolean | default true | 启用状态 |
| deletedAt | DateTime | | 软删除 |

#### role_menus（角色-菜单关联）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID v7 |
| roleId | String(36) | FK | 角色 ID |
| menuId | String(36) | FK | 菜单 ID |
| deletedAt | DateTime | | 软删除 |

#### departments（部门表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID v7 |
| name | String(100) | NOT NULL | 部门名称 |
| parentId | String(36) | FK -> departments.id | 父部门 |
| sortOrder | Int | default 0 | 排序号 |
| status | Boolean | default true | 启用状态 |
| deletedAt | DateTime | | 软删除 |

#### login_logs（登录日志）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID v7 |
| userId | String(36) | FK | 关联用户 |
| username | String(50) | NOT NULL | 登录名 |
| ip | String(45) | NOT NULL | 登录 IP |
| userAgent | String(500) | | UA 信息 |
| status | String(20) | NOT NULL | success/failure |
| failReason | String(255) | | 失败原因 |
| createdAt | DateTime | | 创建时间 |

#### operation_logs（操作审计日志）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID v7 |
| userId | String(36) | FK | 操作人 |
| username | String(50) | NOT NULL | 操作人用户名 |
| action | String(50) | NOT NULL | create/update/delete |
| module | String(50) | NOT NULL | 操作模块 |
| targetId | String(100) | | 操作对象 ID |
| targetType | String(50) | | 操作对象类型 |
| detail | JSON | | 变更详情 |
| ip | String(45) | | 操作 IP |
| createdAt | DateTime | | 创建时间 |

### 2.3 权限控制链路

```
用户 -> 角色(Role) -> 菜单(Menu: directory/menu/button)
                   -> 权限(Permission: 独立鉴权依据)
```

- 登录时返回用户的 menus（前端渲染菜单树）和 permissions（按钮级控制）
- 后端接口通过 `requirePermission('user:delete')` 中间件校验
- 权限管理以 `permissions` 表为核心数据源

---

## 3. 错误码

### 3.1 分段规则

```
00xxx  通用
01xxx  认证授权（Auth）
02xxx  用户管理（User）
03xxx  角色管理（Role）
04xxx  菜单管理（Menu）
05xxx  部门管理（Department）
...
```

每段 1000 码位，支持 99 个模块。

### 3.2 错误码定义

#### Common（00xxx）

| 编码 | message | 说明 |
|------|---------|------|
| 00001 | 参数校验失败 | Zod 等参数校验 |
| 00002 | 记录不存在 | 查询记录未找到 |
| 00003 | 数据已存在 | 唯一约束冲突 |
| 00004 | 系统内部错误 | 未捕获异常 |
| 00005 | 操作不允许 | 业务规则禁止 |

#### Auth（01xxx）

| 编码 | message | 说明 |
|------|---------|------|
| 01001 | 未登录或已过期 | session/token 无效 |
| 01002 | 用户名或密码错误 | 登录凭证错误 |
| 01003 | 账号已被禁用 | 管理员停用 |
| 01004 | 账号已被锁定 | 失败次数过多 |
| 01005 | 原密码错误 | 修改密码验证 |
| 01006 | 密码不匹配 | 两次密码不一致 |
| 01007 | 权限不足 | 无操作权限 |

#### User（02xxx）

| 编码 | message | 说明 |
|------|---------|------|
| 02001 | 用户不存在 | |
| 02002 | 用户名已存在 | |
| 02003 | 邮箱已存在 | |
| 02004 | 手机号已存在 | |
| 02005 | 不能操作自己 | 删除/禁用自身 |

#### Role（03xxx）

| 编码 | message | 说明 |
|------|---------|------|
| 03001 | 角色不存在 | |
| 03002 | 角色编码已存在 | |
| 03003 | 角色名称已存在 | |
| 03004 | 系统角色不可删除 | |

#### Menu（04xxx）

| 编码 | message | 说明 |
|------|---------|------|
| 04001 | 菜单不存在 | |
| 04002 | 父菜单不存在 | |
| 04003 | 存在子菜单不可删除 | |
| 04004 | 菜单编码已存在 | |

#### Department（05xxx）

| 编码 | message | 说明 |
|------|---------|------|
| 05001 | 部门不存在 | |
| 05002 | 父部门不存在 | |
| 05003 | 部门名称已存在 | |
| 05004 | 存在子部门不可删除 | |
| 05005 | 部门下有用户不可删除 | |

---

## 4. API 接口设计

### 4.1 通用约定

- 查询/详情类：`GET /api/v1/{module}/{action}`
- 变更类：`POST /api/v1/{module}/{action}`
- 统一响应格式（复用现有 `shared/lib/response.ts`）
- 查询接口支持分页：`page`, `pageSize`, `keyword`, `sortField`, `sortOrder`

### 4.2 Auth 认证

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/login` | 账号密码登录 |
| POST | `/api/v1/auth/logout` | 退出登录 |
| GET | `/api/v1/auth/me` | 获取当前用户信息 |
| POST | `/api/v1/auth/refresh` | 刷新凭证 |
| POST | `/api/v1/auth/password/change` | 修改密码 |
| POST | `/api/v1/auth/password/reset` | 管理员重置用户密码 |

### 4.3 User 用户管理

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/v1/user/create` | 创建用户 |
| POST | `/api/v1/user/delete` | 删除用户 |
| POST | `/api/v1/user/update` | 更新用户 |
| GET | `/api/v1/user/detail` | 用户详情 |
| GET | `/api/v1/user/list` | 用户列表（分页+筛选） |
| POST | `/api/v1/user/batch-update` | 批量更新 |
| POST | `/api/v1/user/export` | 导出用户数据 |

### 4.4 Role 角色管理

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/v1/role/create` | 创建角色 |
| POST | `/api/v1/role/delete` | 删除角色 |
| POST | `/api/v1/role/update` | 更新角色 |
| GET | `/api/v1/role/detail` | 角色详情 |
| GET | `/api/v1/role/list` | 角色列表 |
| POST | `/api/v1/role/batch-update` | 批量更新 |

### 4.5 Menu 菜单管理

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/v1/menu/create` | 创建菜单/按钮 |
| POST | `/api/v1/menu/delete` | 删除菜单 |
| POST | `/api/v1/menu/update` | 更新菜单 |
| GET | `/api/v1/menu/detail` | 菜单详情 |
| GET | `/api/v1/menu/tree` | 菜单树 |
| GET | `/api/v1/menu/get-user-menus` | 获取用户菜单树 |
| POST | `/api/v1/menu/batch-update` | 批量更新 |

### 4.6 Department 部门管理

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/v1/department/create` | 创建部门 |
| POST | `/api/v1/department/delete` | 删除部门 |
| POST | `/api/v1/department/update` | 更新部门 |
| GET | `/api/v1/department/detail` | 部门详情 |
| GET | `/api/v1/department/tree` | 部门树 |
| GET | `/api/v1/department/list-users` | 部门下用户 |
| POST | `/api/v1/department/batch-update` | 批量更新 |

### 4.7 关键接口 Request/Response

#### POST /api/v1/auth/login

```json
// Request
{
  "username": "admin",
  "password": "xxx"
}

// Response Success
{
  "success": true,
  "data": {
    "id": "018f3a6b-xxxx",
    "username": "admin",
    "nickname": "管理员",
    "avatar": null,
    "role": { "id": "xxx", "name": "超级管理员", "code": "superadmin" },
    "menus": [
      {
        "id": "xxx",
        "name": "用户管理",
        "path": "/system/user",
        "icon": "User",
        "type": "menu",
        "children": []
      }
    ],
    "permissions": ["user:create", "user:delete", "user:list"]
  }
}

// Response Error
{
  "success": false,
  "error": {
    "code": 10002,
    "message": "用户名或密码错误"
  }
}
```

#### GET /api/v1/user/list

```json
// Query Params
?page=1&pageSize=20&keyword=admin&status=true&roleId=xxx&departmentId=xxx&sortField=createdAt&sortOrder=desc

// Response
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "018f3a6b-xxxx",
        "username": "admin",
        "nickname": "管理员",
        "email": "admin@test.com",
        "phone": "138xxxx",
        "avatar": null,
        "role": { "id": "xxx", "name": "超级管理员" },
        "department": { "id": "xxx", "name": "技术部" },
        "isActive": true,
        "isLocked": false,
        "lastLoginAt": "2026-05-15T10:00:00Z",
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

#### POST /api/v1/role/create

```json
// Request
{
  "name": "内容编辑",
  "code": "editor",
  "description": "内容管理编辑角色",
  "status": true,
  "sortOrder": 1,
  "menuIds": ["xxx", "yyy"],
  "permissionCodes": ["user:list", "content:create", "content:edit"]
}

// Response
{
  "success": true,
  "data": {
    "id": "xxx",
    "name": "内容编辑",
    "code": "editor",
    "menuIds": ["xxx", "yyy"],
    "permissionCodes": ["user:list", "content:create", "content:edit"]
  }
}
```

---

## 5. 模块文件结构

```
src/modules/<name>/
├── <name>.routes.ts      # 路由定义
├── <name>.service.ts     # 业务逻辑
├── <name>.schema.ts      # Zod 校验 + 类型导出
└── <name>.types.ts       # 额外类型（可选）

src/shared/
├── lib/
│   ├── snowflake.ts      # ID 生成器（UUID v7 封装）
│   └── errors.ts         # 更新：code 改为数字
└── middleware/
    └── permission.guard.ts  # requirePermission 中间件
```

---

## 6. App 注册

```ts
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { roleRoutes } from './modules/role/role.routes.js';
import { menuRoutes } from './modules/menu/menu.routes.js';
import { departmentRoutes } from './modules/department/department.routes.js';

await app.register(authRoutes, { prefix: '/api/v1' });
await app.register(userRoutes, { prefix: '/api/v1' });
await app.register(roleRoutes, { prefix: '/api/v1' });
await app.register(menuRoutes, { prefix: '/api/v1' });
await app.register(departmentRoutes, { prefix: '/api/v1' });
```

---

## 7. 验证方案

1. **Prisma migrate** — 确认新 schema 能正确生成 migration
2. **启动服务** — `pnpm dev` 确认服务启动无报错
3. **接口测试** — curl/Postman 逐接口测试：
   - Auth：登录 -> 获取 me
   - User：创建/更新/列表/批量更新/删除
   - Role：创建（含菜单和权限分配）-> 详情验证
   - Menu：创建目录->菜单->按钮，获取树
   - Department：创建树形部门，排序
4. **错误码验证** — 触发各错误场景，确认返回正确的数字错误码
5. **Session 验证** — 未登录访问需鉴权接口返回 01001
6. **权限验证** — 无权限用户访问受限接口返回 01007
