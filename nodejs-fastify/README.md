
> 本项目是 **admin-api** 多语言后端骨架仓库的 Node.js/Fastify 实现。其他语言（Java 等）位于同级目录。

## 项目概述

基于 **Fastify + Prisma + MySQL + Redis + BullMQ** 的管理系统 Node.js 后端骨架。

### 技术栈

| 层级 | 技术 |
| --- | --- |
| 框架 | Fastify |
| ORM | Prisma（MySQL 8） |
| 校验 | Zod |
| 日志 | Pino（Fastify 内置） |
| 认证 | Session + Redis（@fastify/session） |
| 队列 | BullMQ（Redis） |
| HTTP 客户端 | Axios |
| 测试 | Vitest |

### 项目结构

```
nodejs-fastify/
├── prisma/                  # Prisma schema 与数据迁移
├── scripts/                 # 开发工具脚本
│   └── init-dev.ts          # 开发环境初始化
├── src/
│   ├── config/              # 配置加载（dotenv + env 校验）
│   ├── database/            # Prisma 客户端单例
│   ├── modules/             # 业务模块（领域驱动）
│   │   ├── auth/            # 认证（登录/登出/会话）
│   │   ├── user/            # 用户管理
│   │   ├── role/            # 角色管理
│   │   ├── menu/            # 菜单管理
│   │   ├── department/      # 部门管理
│   │   └── health/          # 健康检查端点
│   ├── shared/              # 共享基础设施
│   │   ├── lib/             # 工具类（响应格式、异常）
│   │   ├── middleware/       # 全局中间件（认证、会话、异常处理）
│   │   └── queue/           # BullMQ 队列与 Worker
│   └── app.ts               # Fastify 应用入口
├── tests/                   # Vitest 测试文件
├── .env.example
└── package.json
```

### 架构原则

1. **按领域模块化** —— 业务逻辑按 `modules/<domain>/` 组织，各自包含路由、服务、处理器
2. **共享基础设施分层** —— 横切关注点（配置、中间件、队列）集中在 `shared/`
3. **统一响应格式** —— 所有 API 响应使用 `{ success, data, message }` 或 `{ success, error }` 结构
4. **类型安全** —— 全 TypeScript，Zod 运行时校验，Prisma 数据库类型生成
5. **基于 Session 的认证** —— 服务端会话存储在 Redis，HTTP-only Cookie

### 模块模板

新增业务模块时，按以下结构创建文件：

```
src/modules/<name>/
├── <name>.routes.ts      # Fastify 路由定义
├── <name>.service.ts     # 业务逻辑
├── <name>.schema.ts      # Zod 校验 schema
├── <name>.types.ts       # TypeScript 类型定义（按需）
└── <name>.test.ts        # 测试
```

然后在 `src/app.ts` 中注册路由。

## 快速开始

### 前置条件

- Node.js >= 20
- pnpm >= 8
- Docker（用于运行 MySQL 8 + Redis 7）

### 初始化步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 在 WSL2 或本地启动 MySQL 和 Redis
#    （docker-compose.yml 在项目根目录）
docker compose -f ../docker-compose.yml up -d

# 3. 初始化数据库（创建表、填充种子数据）
pnpm dev:init

# 4. 启动开发服务器（热重载）
pnpm dev
```

初始化完成后，默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

### 可用脚本

#### 开发

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（nodemon + tsx，热重载） |
| `pnpm dev:init` | 初始化开发环境（自动创建 .env、检查服务、数据库迁移、填充种子数据） |
| `pnpm build` | TypeScript 生产构建（`tsc`） |
| `pnpm start` | 启动生产服务器（从 `dist/` 运行） |

#### 测试

| 命令 | 说明 |
| --- | --- |
| `pnpm test` | 运行测试（Vitest） |
| `pnpm test:watch` | 监视模式运行测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |

#### 代码检查

| 命令 | 说明 |
| --- | --- |
| `pnpm lint` | 类型检查所有文件（`tsc --noEmit`） |

#### 数据库

| 命令 | 说明 |
| --- | --- |
| `pnpm db:migrate` | 创建并执行数据库迁移 |
| `pnpm db:seed` | 填充种子数据 |
| `pnpm db:reset` | 重置数据库 —— 删除所有表，重新迁移+填充种子 |
| `pnpm db:studio` | 打开 Prisma Studio（浏览器数据管理工具） |

#### Docker

| 命令 | 说明 |
| --- | --- |
| `pnpm docker:up` | 后台启动 MySQL + Redis 容器 |
| `pnpm docker:down` | 停止并移除容器 |
| `pnpm docker:logs` | 实时查看容器日志 |

### 相关实现

- [Java（Spring Boot） - 计划中](../java-spring/)
