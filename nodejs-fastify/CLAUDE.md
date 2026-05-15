
# CLAUDE.md — Node.js / Fastify Admin API Skeleton

## Project Identity

Node.js backend skeleton for admin systems, part of the **admin-api** monorepo. Other implementations (Java, etc.) live in sibling directories.

## New Developer Onboarding

First-time setup:
```bash
pnpm install              # install deps (postinstall tolerates missing .env)
pnpm dev:init             # auto-create .env → check MySQL/Redis → migrate → seed
pnpm dev                  # start dev server (hot reload)
```

- `scripts/init-dev.ts` is the entry point for `pnpm dev:init`
  - Copies `.env.example` → `.env` + `.env.development` if missing
  - Checks TCP connectivity to MySQL (3306) and Redis (6379); exits with guidance if unavailable
  - Runs `prisma generate` → `prisma migrate dev` → `prisma db seed`
- `.env.example` contains dev defaults matching the root `docker-compose.yml`
- `postinstall` gracefully skips `prisma generate` when `DATABASE_URL` is unset

## Tech Stack

- **Runtime**: Node.js (TypeScript)
- **Framework**: Fastify
- **ORM**: Prisma + MySQL 8
- **Validation**: Zod
- **Logger**: Pino (Fastify built-in)
- **Auth**: Session-based (@fastify/session + connect-redis, Redis 7)
- **Queue**: BullMQ (backed by Redis)
- **HTTP Client**: Axios
- **Testing**: Vitest

## Project Structure (Modular-Layered Hybrid)

```
nodejs-fastify/
├── prisma/                  # Prisma schema & migrations
├── src/
│   ├── config/              # Config loader (dotenv + env-validation via Zod)
│   ├── database/            # Prisma client singleton
│   ├── modules/             # Business modules (domain-driven)
│   │   ├── auth/            # Authentication: login/logout/session/me
│   │   └── health/          # Health check endpoint
│   ├── shared/              # Shared infrastructure
│   │   ├── lib/             # Utilities (response helpers, error classes)
│   │   ├── middleware/      # Global middleware (error handler, auth guard)
│   │   └── queue/           # BullMQ queue & worker setup
│   └── app.ts               # Fastify app bootstrap
├── tests/                   # Vitest tests (mirrors src/ structure)
├── .env.example
└── package.json
```

## Key Patterns for AI Assistance

### Adding a New Module

1. Create `src/modules/<name>/` with route, service, schema files
2. Define Zod schema for validation, export types from Zod inference
3. Create Fastify route plugin (register routes on passed fastify instance)
4. Register the plugin in `src/app.ts`
5. Add Prisma model if new DB table needed
6. Write tests in `tests/modules/<name>/`

### Module File Naming

```
<name>.routes.ts     # Fastify route plugin
<name>.service.ts    # Business logic & DB access
<name>.schema.ts     # Zod validation schemas (+ exported TS types)
<name>.types.ts      # Additional TS types (if needed)
<name>.test.ts       # Vitest tests
```

### Response Format

Success:
```ts
{ success: true, data: T, message?: string }
```

Error:
```ts
{ success: false, error: { code: string, message: string, details?: unknown } }
```

Use `shared/lib/response.ts` helpers (`ok()`, `fail()`) to build responses.

### Error Handling

- Use `AppError` class from `shared/lib/errors.ts` with statusCode + error code
- Global error middleware in `shared/middleware/` catches unhandled errors
- Zod validation errors are caught and transformed to standardized format

### Session Auth

- Session stored in Redis via `@fastify/session` + `connect-redis`
- Session ID in HTTP-only cookie
- Auth guard middleware: `shared/middleware/auth.guard.ts`
- On login: create session, store user data in session
- On logout: destroy session

### Queue (BullMQ)

- Queue definitions in `shared/queue/`
- Worker runs in same process (or separate for production)
- Use environment variable to toggle worker on/off
- Example: `email` queue (skeleton example)

### Config Loading

- `src/config/` reads `.env` via dotenv, validates with Zod schema
- Exported typed config object consumed everywhere
- Fail fast on missing required env vars

### Testing Guidelines

- Unit tests: mock Prisma (via `@prisma/client` mocking) and external calls
- Integration tests: use testcontainers or local DB
- Test file co-located with source or in `tests/` mirroring `src/` structure

## Project Conventions

- Use `interface` over `type` for object shapes (TS convention)
- Preform `async/await` over raw promises
- Named exports only (no default exports)
- Fastify plugin pattern: `async function plugin(fastify, opts)`
- Error first: validate inputs at route boundary, throw AppError in service layer
- TypeScript strict mode enabled

## Git Commit Rules

- Commit message must use **Chinese**
- **Never** include `Co-Authored-By` trailer of any kind
