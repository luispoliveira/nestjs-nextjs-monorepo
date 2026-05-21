# PROJECT_MAP.md — NestJS + Next.js Monorepo

Codebase map for rapid orientation. Every top-level directory described with its role and key files.

---

## Root

```
nestjs-nextjs-monorepo/
├── apps/                  # Deployable applications
├── packages/              # Shared internal libraries
├── openspec/              # Spec-driven development artifacts
├── .claude/               # Claude Code skills, agents, commands
├── .github/               # CI and Copilot instructions
├── CLAUDE.md              # Claude Code guide (start here)
├── DEPLOY.md              # Docker Compose deployment guide
├── DEPLOY-PM2.md          # PM2 deployment guide
├── turbo.json             # Turborepo task pipeline
├── pnpm-workspace.yaml    # pnpm workspace config
└── package.json           # Root scripts and workspace config
```

---

## apps/

### `apps/auth/`
**Role**: NestJS authentication service (primary backend).
- Manages user sessions via `better-auth` + Prisma adapter.
- Exposes REST API at `/api/auth` + microservice listener on Redis.
- Plugins: `twoFactor()`, `admin()`, Google OAuth.
- Emits Redis events on user lifecycle (created, password reset, 2FA toggles).
- Key files:
  - `src/main.ts` — Bootstrap + Redis transport setup
  - `src/app.module.ts` — Root module, `AuthGuard` as `APP_GUARD`
  - `src/auth.controller.ts` — `@MessagePattern(AUTH_AUTHENTICATE)` handler
  - `src/local-auth.service.ts` — Event publishing to Notifications service

### `apps/api/`
**Role**: NestJS tRPC API service.
- Hosts tRPC router for end-to-end type-safe communication with Next.js.
- Key files:
  - `src/app.module.ts` — Module with `TrpcModule`
  - `src/app.router.ts` — Root tRPC AppRouter
  - `src/app.context.ts` — tRPC context (auth session extraction)

### `apps/notifications/`
**Role**: NestJS notification delivery service.
- Listens for Redis events from the auth service.
- Enqueues email jobs into the Bull `email-queue`.
- Key files:
  - `src/app.module.ts` — Imports `QueueModule.registerQueues([QUEUES.EMAIL])`
  - `src/app.controller.ts` — `@EventPattern` handlers
  - `src/app.service.ts` — Job enqueueing via `EmailProducer`

### `apps/worker/`
**Role**: NestJS Bull worker — processes email jobs from the queue.
- Consumes `email-queue` jobs using `@Processor` + `@Process`.
- Sends emails via Brevo through `@repo/mail`.
- Key files:
  - `src/app.module.ts` — Imports `QueueModule` + `MailModule`
  - `src/consumer/email.consumer.ts` — `@Processor(QUEUES.EMAIL)` class

### `apps/web/`
**Role**: Next.js 16 frontend (App Router).
- Admin dashboard consuming auth and tRPC APIs.
- Auth via `better-auth` client; data via tRPC `httpBatchLink`.
- Key directories:
  - `src/app/` — App Router pages and layouts
  - `src/components/` — Shared UI components (shadcn/ui primitives in `components/ui/`)
  - `src/lib/` — Auth client/server helpers, tRPC client, utilities

---

## packages/

### `packages/database/`
**Role**: Prisma ORM client, `DatabaseModule`, and seeders.
- Uses `PrismaPg` adapter (not default TCP driver).
- `auth.prisma` is managed by better-auth — do not edit manually.
- Key files:
  - `prisma/schema.prisma` — Application models
  - `prisma/auth.prisma` — Auth models (User, Session, Account, TwoFactor, Verification)
  - `src/database.service.ts` — Wraps `PrismaClient`, injected via `DatabaseModule`
  - `src/database-seeder.service.ts` — Runs seeders on `onModuleInit`
  - `src/seeders/` — Individual seeder implementations

### `packages/shared/`
**Role**: Global NestJS infrastructure shared across all backend apps.
- `@Global()` — provided everywhere via `SharedModule.register()`.
- Key subdirectories:
  - `src/constants/` — `SERVICES`, `QUEUES`, `EVENT_PATTERNS`, `MESSAGE_PATTERNS`, `JOB_PATTERNS`
  - `src/abstracts/` — `BasePublisher`, `BaseProducer`, `BaseRouter`
  - `src/guards/` — `AuthGuard`, `MicroserviceAuthGuard`
  - `src/interceptors/` — `LoggingInterceptor`, `CorrelationInterceptor`
  - `src/filters/` — `AllExceptionFilter`
  - `src/publishers/` — `NotificationsPublisher`
  - `src/queue/` — `QueueModule`, `EmailProducer`, producer base classes
  - `src/modules/` — `SharedModule`, `MongoModule`
  - `src/utils/` — `BootstrapUtil`, `MicroserviceUtil`, `PaginatedUtil`, `SanitizeUtil`, `ContextUtil`
  - `src/health/` — `HealthController` (GET `/health/live`, `/health/ready`)
  - `src/mongo/` — `MongoModule`, `Log` + `EmailLog` schemas (30-day TTL)
  - `src/trpc/` — `TrpcModule`, `BaseRouter`, auth middlewares

### `packages/shared-types/`
**Role**: Zod v4 schemas shared between frontend and backend.
- `RoleEnum`, `paginationSchema`, `baseEntitySchema`, environment schemas.
- Import on both NestJS DTOs and Next.js forms.

### `packages/trpc/`
**Role**: Auto-generated `AppRouter` type exported from the auth/api app.
- Regenerated outside production by `nestjs-trpc-v2`.
- Next.js imports `AppRouter` from here for end-to-end type safety.

### `packages/mail/`
**Role**: Email sending via Brevo provider.
- `MailModule.forRootAsync({ provider: 'brevo', ... })`.
- Used only by `apps/worker`.

### `packages/eslint-config/` + `packages/typescript-config/`
**Role**: Shared ESLint and TypeScript configurations for all workspaces.

---

## openspec/

```
openspec/
├── config.yaml      # OpenSpec configuration
├── changes/         # In-progress change artifacts (proposals, specs, designs, tasks)
└── specs/           # Finalized specs (synced from archived changes)
```

---

## .claude/

```
.claude/
├── skills/          # Reusable skill definitions (SKILL.md per skill)
├── agents/          # Agent persona definitions
├── commands/        # Slash command files (invoke skills)
└── settings.local.json
```
