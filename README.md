# admin-api

Multi-language backend skeleton for admin systems.

This monorepo contains multiple language/framework implementations of the same backend architecture, each in its own directory.

## Implementations

| Directory | Language | Framework | Status |
|-----------|----------|-----------|--------|
| [nodejs-fastify/](./nodejs-fastify/) | Node.js | Fastify + Prisma | ✅ Complete |
| java-spring/ (planned) | Java | Spring Boot | 📋 Planned |

## Architecture

Each implementation follows the same design:
- **Modular-layered hybrid**: shared infrastructure (config, DB, queue) + per-domain modules
- **Session-based auth**: Redis-backed sessions
- **Unified API response format**: `{ success, data }` / `{ success, error }`
- **Standardized error handling**: AppError → global error middleware
- **Background jobs**: BullMQ (Node.js) / equivalent in other stacks

See [docs/superpowers/specs/](./docs/superpowers/specs/) for the full design spec.
