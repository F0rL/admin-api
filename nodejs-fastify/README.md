
> This project is the Node.js/Fastify implementation of the **admin-api** monorepo — a multi-language backend skeleton for admin systems. Other language implementations (Java, etc.) live in sibling directories.

## Project Overview

Node.js backend skeleton for admin systems, built with **Fastify + Prisma + MySQL + Redis + BullMQ**.

### Tech Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Framework       | Fastify                             |
| ORM             | Prisma (MySQL 8)                    |
| Validation      | Zod                                 |
| Logger          | Pino (Fastify built-in)            |
| Auth            | Session + Redis (@fastify/session)  |
| Queue           | BullMQ (Redis)                      |
| HTTP Client     | Axios                               |
| Testing         | Vitest                              |

### Project Structure

```
nodejs-fastify/
├── prisma/                  # Prisma schema & migrations
├── src/
│   ├── config/              # Config loader (dotenv + env validation)
│   ├── database/            # Prisma client singleton
│   ├── modules/             # Business modules (domain-driven)
│   │   ├── auth/            # Authentication (login/logout/session)
│   │   └── health/          # Health check endpoint
│   ├── shared/              # Shared infrastructure
│   │   ├── lib/             # Utilities (response format, errors)
│   │   ├── middleware/       # Global middleware (auth, session, error)
│   │   └── queue/           # BullMQ setup & workers
│   └── app.ts               # Fastify app bootstrap
├── tests/                   # Vitest test files
├── .env.example
└── package.json
```

### Architecture Principles

1. **Modular by domain** — Business logic is grouped into `modules/<domain>/`, each containing its own routes, services, and handlers
2. **Layered shared infra** — Cross-cutting concerns (config, middleware, queue) are centralized in `shared/`
3. **Unified response format** — All API responses follow `{ success, data, message }` or `{ success, error }` shapes
4. **Type-safe** — TypeScript throughout, Zod for runtime validation, Prisma for DB type generation
5. **Session-based auth** — Server-managed sessions stored in Redis, HTTP-only cookies

### Module Template

To add a new domain module, create the following structure:

```
src/modules/<name>/
├── <name>.routes.ts      # Fastify route definitions
├── <name>.service.ts     # Business logic
├── <name>.schema.ts      # Zod schemas for validation
├── <name>.types.ts       # TypeScript types (if needed)
└── <name>.test.ts        # Tests
```

Then register the routes in `src/app.ts`.

### Development

```bash
# Prerequisites: MySQL 8 + Redis 7 running locally
# (docker-compose.yml provides both)

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start dev server
npm run dev

# Run tests
npm test
```

### Available Scripts

| Command              | Description              |
| -------------------- | ------------------------ |
| `npm run dev`        | Start dev server (tsx)   |
| `npm run build`      | TypeScript build         |
| `npm start`          | Start production server  |
| `npm test`           | Run tests (Vitest)       |
| `npm run lint`       | Lint code                |
| `npx prisma migrate` | DB migrations            |

### Related Implementations

- [Java (Spring Boot) - planned](../java-spring/)
