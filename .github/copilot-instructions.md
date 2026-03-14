# Monorepo Project Instructions

## Stack Overview

- **Monorepo**: Turborepo + pnpm workspaces (`pnpm-workspace.yaml`)
- **Backend**: NestJS 11 (TypeScript), microservices via Redis transport
- **Frontend**: Next.js 16 (TypeScript), Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL via Prisma 7 (ORM), MongoDB (secondary), Redis (cache/queues)
- **Auth**: better-auth (not Passport/JWT)
- **Validation**: Zod + nestjs-zod
- **API contract**: tRPC for frontend↔backend type safety
- **Queue**: BullMQ/Bull with Redis
- **Logging**: nestjs-pino with correlation IDs (nestjs-cls)

## Package Manager & Commands

- Always use `pnpm` — never npm or yarn
- Run all tasks via Turborepo: `pnpm build`, `pnpm dev`, `pnpm lint`, `pnpm test`
- Database commands: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`
- Infrastructure: `pnpm docker:up` / `pnpm docker:down`

## Workspace Structure

```
apps/
  auth-api/        # NestJS — authentication service (better-auth)
  notifications/   # NestJS — notification delivery stub
  worker/          # NestJS — BullMQ worker (email jobs)
  web/             # Next.js — frontend admin dashboard
packages/
  database/        # Prisma client, DatabaseModule, DatabaseService
  shared/          # NestJS shared modules (guards, interceptors, filters, publishers, queue)
  shared-types/    # Zod schemas shared between frontend and backend
  trpc/            # tRPC router definitions (consumed by both web and NestJS)
  mail/            # MailModule with Brevo provider
  eslint-config/   # Shared ESLint configs
  typescript-config/ # Shared tsconfig bases
```

## Internal Package Imports

All internal packages use the `@repo/` prefix:

```typescript
import { DatabaseModule, DatabaseService } from '@repo/database';
import { SharedModule, QUEUES, SERVICES, EVENT_PATTERNS } from '@repo/shared';
import { MailModule } from '@repo/mail';
```

## Constants Conventions

All service tokens, queue names, event/message patterns live in `@repo/shared/src/constants` as `as const` objects:

- `SERVICES` — microservice injection tokens
- `QUEUES` — Bull queue names
- `EVENT_PATTERNS` — Redis event patterns (`user:created`, etc.)
- `MESSAGE_PATTERNS` — Redis request/response patterns

Never hardcode string tokens inline — always reference from `@repo/shared` constants.
