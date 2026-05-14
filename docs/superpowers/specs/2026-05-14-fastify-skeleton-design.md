# Fastify + Prisma Backend Skeleton — Design Spec

- **Date**: 2026-05-14
- **Status**: Draft
- **Stack**: Node.js / Fastify / Prisma (MySQL 8) / Redis 7 / BullMQ / Zod / Pino / Axios / Vitest

## 1. Purpose

A **multi-language backend skeleton monorepo** for admin systems. This spec covers the Node.js/Fastify implementation (`nodejs-fastify/`). Other languages (Java, etc.) will follow the same API contract and module structure.

## 2. Architecture Overview

### 2.1 Module-Layered Hybrid

```
src/
├── config/          # Shared infrastructure — layered
├── database/
├── shared/
│   ├── lib/
│   ├── middleware/
│   └── queue/
├── modules/         # Business logic — modular by domain
│   ├── auth/
│   └── health/
└── app.ts           # App bootstrap
```

- **Layered**: config, database, middleware, queue — shared across all modules
- **Modular**: each business domain is self-contained with its own routes, services, schemas

### 2.2 Request Lifecycle

```
HTTP Request
  → Fastify Router
    → Global Middleware (session, auth guard if global)
      → Zod Validation (per-route schema)
        → Route Handler
          → Service Layer (business logic + DB access via Prisma)
            → Response via response helper (or AppError if failed)
```

### 2.3 Module Template

```
src/modules/<name>/
├── <name>.routes.ts   # @fastify plugin — defines routes, attaches schemas
├── <name>.service.ts  # Business logic, prisma queries
├── <name>.schema.ts   # Zod schemas + inferred TS types
└── <name>.types.ts    # Additional interfaces (optional)
```

## 3. Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Fastify | High performance, native Pino, plugin ecosystem |
| ORM | Prisma + MySQL 8 | Type-safe queries, auto-migrations, excellent DX |
| Validation | Zod | First-class TS inference, composable |
| Auth | Session + Redis | Server-managed, secure HTTP-only cookies |
| Session lib | @fastify/session + connect-redis | Mature, Fastify-native |
| Queue | BullMQ | Battle-tested, Redis-backed, supports delays/repeats |
| HTTP client | Axios | Interceptors, cancellation, broad compatibility |
| Logger | Pino (Fastify built-in) | Structured JSON logs, low overhead |
| Testing | Vitest | Fast, TS-native, compatible with Jest ecosystem |
| Config | dotenv + Zod validation | Typed config, fail-fast on missing vars |

## 4. Authentication Design

### 4.1 Login Flow

1. `POST /api/v1/auth/login` — receive `{ username, password }`
2. Validate credentials against `User` table in MySQL
3. Create Redis session via `@fastify/session` — store user id, role, username
4. Return `{ success: true, data: { user } }` — session ID in HTTP-only cookie

### 4.2 Logout Flow

1. `POST /api/v1/auth/logout` — destroy current session
2. Clear Redis session data
3. Return `{ success: true, message: "Logged out" }`

### 4.3 Auth Guard

- Middleware `shared/middleware/auth.guard.ts`
- Check `request.session.userId` exists
- If missing, return 401 with standardized error
- Applied per-route or per-route-group

### 4.4 Session Configuration

- Store: Redis via `connect-redis`
- Cookie: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`
- TTL: 24 hours (configurable via env)
- Secret: from env `SESSION_SECRET`

## 5. API Design

### 5.1 Base Path

All API routes under `/api/v1/`

### 5.2 Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/v1/health | No | Health check (DB + Redis + Queue) |
| POST | /api/v1/auth/login | No | User login |
| POST | /api/v1/auth/logout | Yes | User logout |
| GET | /api/v1/auth/me | Yes | Current user info |

### 5.3 Response Format

```jsonc
// Success
{ "success": true, "data": { ... }, "message": "..." }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "details": ... } }
```

### 5.4 Status Codes

| Code | When |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict (e.g., duplicate) |
| 500 | Internal server error |

## 6. Database Schema (Prisma)

### 6.1 User Model

```prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique @db.VarChar(50)
  password  String   @db.VarChar(255)  // bcrypt hash
  email     String?  @unique @db.VarChar(255)
  role      String   @default("admin") @db.VarChar(20)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 7. Queue Design (BullMQ)

### 7.1 Shared Infrastructure

```
src/shared/queue/
├── queue.service.ts    # QueueFactory — create queues with shared connection
├── worker.service.ts   # Worker runner
└── index.ts            # Re-exports + connection config
```

### 7.2 Built-in Example Queue: `email`

- Skeleton queue definition for email sending (demonstrates pattern)
- Consumers can add actual email provider later

### 7.3 Connection

- Redis connection via env `REDIS_URL`
- Same Redis instance as session store

## 8. Config Design

```typescript
// src/config/env.ts — Zod schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  SESSION_TTL: z.coerce.number().default(86400), // 24h in seconds
  // ...
})
```

## 9. Error Handling

### 9.1 AppError Class

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  )
}
```

### 9.2 Global Error Middleware

- Catches `AppError` → format as `{ success: false, error }`
- Catches Zod validation errors → format as 400 with field-level details
- Catches unknown errors → log via Pino, return 500

## 10. Testing Strategy

| Type | What | Tool |
|---|---|---|
| Unit | Services with mocked Prisma | Vitest + vitest-mock-extended |
| Unit | Validation schemas | Vitest |
| Integration | Route handlers (fastify.inject) | Vitest + fastify build |
| E2E | Full request lifecycle | Vitest + test DB |

## 11. Non-Goals (for v1)

- No file upload handling
- No WebSocket support
- No caching abstraction layer
- No audit log
- No rate limiting (add later via `@fastify/rate-limit`)
