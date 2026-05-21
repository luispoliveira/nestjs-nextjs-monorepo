---
name: onboard
description: Guided onboarding for new developers joining this monorepo. Walks through architecture, key concepts, development workflow, and a first task. Tailored to the developer's experience level.
license: MIT
compatibility: NestJS + Next.js monorepo
metadata:
  author: project
  version: "1.0"
---

Welcome a new developer to this NestJS + Next.js monorepo. Guide them through the architecture, conventions, and development workflow.

**This is a guided tour, not a task executor.** Read files, explain concepts, answer questions.

---

## Preflight

Before starting, ask:
- "Are you new to NestJS, Next.js, or the monorepo pattern? Or all three?"
- "Are you focused on backend, frontend, or full-stack work?"

This tailors the depth of each section.

---

## Phase 1: Project Overview (5 min)

```
This is a Turborepo + pnpm monorepo template with:

  apps/
  ├── auth/          NestJS — authentication (better-auth)
  ├── api/           NestJS — tRPC API gateway
  ├── notifications/ NestJS — email event bridge
  ├── worker/        NestJS — email job processor (Bull)
  └── web/           Next.js — admin dashboard

packages/
  ├── database/      Prisma ORM + DatabaseService
  ├── shared/        Global NestJS infra (guards, filters, utils)
  ├── shared-types/  Zod schemas shared across frontend + backend
  ├── mail/          Brevo email provider
  └── trpc/          AppRouter type (auto-generated)
```

Key insight: **all backend apps are separate processes** communicating via Redis (events/messages) and Bull (jobs). They share code through internal packages.

---

## Phase 2: Environment Setup (10 min)

Walk through setup:

```bash
# Prerequisites
node --version   # must be >= 22
pnpm --version   # must be 10.33.0

# Install
pnpm install

# Start infrastructure
pnpm docker:up   # starts Postgres, MongoDB, Redis

# Run database migrations
pnpm db:migrate

# Seed the database
pnpm db:seed

# Start all apps in dev mode
pnpm dev
```

Explain where `.env` files live:
- Each app has its own `.env` based on `.env.example`
- `packages/database/.env` for Prisma

---

## Phase 3: Key Concepts (15 min)

### SharedModule — the foundation

Every NestJS app starts with `SharedModule.register()`. It provides globally:
- `DatabaseService` (Prisma)
- `ConfigModule` (env vars — never use `process.env` outside `main.ts`)
- Logging (pino + correlation IDs via CLS)
- Validation (`ZodValidationPipe` + `ZodSerializerInterceptor`)
- Error handling (`AllExceptionFilter`)
- Health checks (`GET /health/live`, `/health/ready`)
- Rate limiting (ThrottlerModule)

Read `packages/shared/src/modules/shared.module.ts` together.

### Constants — never hardcode

```typescript
import { SERVICES, QUEUES, EVENT_PATTERNS, MESSAGE_PATTERNS, JOB_PATTERNS } from '@repo/shared';

// These are the only queue names, event patterns, and service tokens in the system.
// Never write strings like 'email-queue' or 'user:created' directly.
```

### Authentication flow

```
AuthGuard (APP_GUARD) → all routes protected by default
@Public() → opt-out decorator for public routes
@CurrentUser() → extract authenticated user
```

In microservices: `MicroserviceAuthGuard` calls `AUTH_AUTHENTICATE` message pattern on the auth service to validate tokens.

### Validation

```typescript
// Build DTOs from Zod schemas using nestjs-zod
export class CreateUserDto extends createZodDto(CreateUserSchema) {}

// ZodValidationPipe validates incoming bodies automatically (it's global)
// Never call .parse() or .safeParse() in controllers
```

---

## Phase 4: Your First Feature (20 min)

Walk through adding a simple feature end-to-end. Use an example like "list users":

**Step 1**: Add Prisma model (if new data) → `packages/database/prisma/schema.prisma`

**Step 2**: Create migration → `pnpm db:migrate`

**Step 3**: Create DTO in shared-types (if shared with frontend) or in the app:
```typescript
// packages/shared-types/src/user.schema.ts
const GetUsersSchema = z.object({ ... });
export class GetUsersDto extends createZodDto(GetUsersSchema) {}
```

**Step 4**: Create service method:
```typescript
// apps/api/src/users/users.service.ts
async getUsers(dto: GetUsersDto) {
  const [items, total] = await Promise.all([
    this.db.user.findMany({ where: { deletedAt: null }, ...paginate(dto) }),
    this.db.user.count({ where: { deletedAt: null } }),
  ]);
  return PaginatedUtil.getPaginatedResponse(items, total, dto.skip, dto.take);
}
```

**Step 5**: Expose via tRPC or REST:
- tRPC: add a procedure to a `@Router` class
- REST: add a `@Get()` to a `@Controller`

**Step 6**: Consume in Next.js (if tRPC):
```typescript
const { data } = trpc.users.getUsers.useQuery({ skip: 0, take: 20 });
```

---

## Phase 5: Development Workflow

```
1. pnpm dev          → starts all apps with hot reload
2. Edit code         → Turborepo detects changes
3. pnpm lint         → ESLint (run before PR)
4. pnpm check-types  → TypeScript (run before PR)
5. pnpm build        → verify build passes
```

OpenSpec workflow (for structured feature development):
```
/opsx:propose <feature-name>   → create proposal + specs + tasks
/opsx:apply <feature-name>     → implement tasks
/opsx:verify <feature-name>    → check implementation
/opsx:archive <feature-name>   → archive when done
```

---

## Phase 6: Orientation Checklist

Send the developer off with this checklist:

```
[ ] Read CLAUDE.md (full conventions)
[ ] Read ARCHITECTURE_OVERVIEW.md (service topology)
[ ] Run pnpm docker:up && pnpm dev successfully
[ ] Find where AUTH_GUARD is registered (apps/auth/src/app.module.ts)
[ ] Find where QUEUES.EMAIL is used (apps/worker, apps/notifications)
[ ] Trace a user:created event from auth → notifications → worker
[ ] Add a @Public() route and confirm it works without auth
```

---

## Guardrails

- Never implement features during onboarding — explain, don't do
- Adapt depth to the developer's experience (ask upfront)
- Offer to read any file together to ground explanations in code
- Direct to CLAUDE.md for authoritative conventions
