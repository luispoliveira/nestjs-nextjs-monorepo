# PROJECT_MAP.md — NestJS + Next.js Monorepo

Codebase map for rapid orientation. Every top-level directory described with its role and key files.

See also: [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | [ENTRYPOINTS.md](ENTRYPOINTS.md) | [CONVENTIONS.md](CONVENTIONS.md) | [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md)

---

## Workspace Root

| File / Dir            | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `package.json`        | Root workspace; pnpm scripts (`dev`, `build`, `lint`, `db:*`, `docker:*`) |
| `pnpm-workspace.yaml` | Declares `apps/*` and `packages/*`; pins `zod ~4.3.6` globally            |
| `turbo.json`          | Turborepo pipeline: build, dev, lint, test, check-types, db:\* tasks      |
| `docker-compose.yml`  | Local infra: PostgreSQL, MongoDB, Redis                                   |
| `.nvmrc`              | Node `>=22`                                                               |
| `CLAUDE.md`           | AI assistant instructions                                                 |
| `.github/`            | Copilot instructions, git commit rules, PR templates                      |
| `.claude/`            | Agent definitions, corner-cases log                                       |

---

## `apps/`

### `apps/api/`

Main HTTP + tRPC gateway. Sits behind Nginx in production.

| Path                    | Role                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `src/main.ts`           | Bootstrap: `globalPrefix='api'`, Swagger on `/api/docs`, `trustProxy:true`                 |
| `src/app.module.ts`     | Imports `SharedModule`, `ClientsModule` (AUTH service), `TRPCModule`                       |
| `src/app.controller.ts` | `GET /api` — health-check stub; decorated `@RateLimit('default')`                          |
| `src/app.router.ts`     | tRPC `AppRouter`: `hello` query; middlewares `LoggingTrpcMiddleware`, `AuthTrpcMiddleware` |
| `src/app.context.ts`    | tRPC context factory                                                                       |
| `test/`                 | Jest unit tests                                                                            |

Global guard: `MicroserviceAuthGuard` (validates bearer token via `AUTH_SERVICE` over Redis).

---

### `apps/auth/`

Authentication service backed by `better-auth`.

| Path                        | Role                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`               | Bootstrap: `globalPrefix='api/auth'`, Redis microservice transport, Swagger on `/api/auth/docs`                                       |
| `src/app.module.ts`         | Imports `SharedModule`, `ClientsModule` (NOTIFICATIONS service), `AuthModule.forRootAsync`                                            |
| `src/auth.controller.ts`    | `@MessagePattern('auth:authenticate')` — validates session token, returns user                                                        |
| `src/local-auth.service.ts` | Hooks into `better-auth` lifecycle (user created, password reset, email verification, 2FA); emits events via `NotificationsPublisher` |

Global guard: `AuthGuard` from `@thallesp/nestjs-better-auth`. Social provider: Google OAuth.
better-auth plugins: `twoFactor()`, `admin()`.

---

### `apps/notifications/`

Redis-event–driven notification dispatcher. Enqueues email jobs into BullMQ.

| Path                    | Role                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `src/main.ts`           | Bootstrap: `globalPrefix='api/notifications'`, Redis microservice transport, port `3100` |
| `src/app.module.ts`     | Imports `SharedModule`, `QueueModule.registerQueues([QUEUES.EMAIL])`                     |
| `src/app.controller.ts` | Six `@EventPattern` handlers (see [ENTRYPOINTS.md](ENTRYPOINTS.md))                      |
| `src/app.service.ts`    | Delegates to `EmailProducer` for each event type                                         |

---

### `apps/worker/`

BullMQ consumer. Processes email jobs and handles the Dead Letter Queue.

| Path                                   | Role                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/main.ts`                          | Bootstrap: `globalPrefix='api/worker'`, Redis microservice transport, port `3200`               |
| `src/app.module.ts`                    | Imports `SharedModule`, `QueueModule.registerQueues([QUEUES.EMAIL])`, `MailModule`, `DlqModule` |
| `src/consumer/email.consumer.ts`       | `@Processor(QUEUES.EMAIL)` — dispatches on `job.name`; routes exhausted jobs to DLQ             |
| `src/dlq/dlq.controller.ts`            | Three `@MessagePattern` handlers: `dlq:list`, `dlq:replay`, `dlq:purge`                         |
| `src/dlq/dlq.module.ts`                | Registers `QueueModule.registerQueues([QUEUES.EMAIL])`, `EmailDlqService`, `DlqController`      |
| `src/dlq/email.dlq.service.ts`         | Extends `BaseDlqService`; list/replay/purge DLQ jobs                                            |
| `src/metrics/queue-metrics.service.ts` | Prometheus gauges and histograms for queue depth, job duration, failure count                   |
| `test/`                                | Jest unit tests for consumer and DLQ service                                                    |

---

### `apps/web/`

Next.js 16 admin dashboard (App Router).

| Path                                     | Role                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `app/layout.tsx`                         | Root layout: `TrpcProvider`, `ThemeProvider`, `Toaster`                             |
| `app/page.tsx`                           | Public root — redirects to `/sign-in` or `/dashboard`                               |
| `app/(auth)/layout.tsx`                  | Unauthenticated layout (centered card)                                              |
| `app/(auth)/sign-in/page.tsx`            | Email/password sign-in form (`authClient.signIn.email`)                             |
| `app/(dashboard)/layout.tsx`             | Protected layout: calls `getServerSession()`, redirects to `/sign-in` if no session |
| `app/(dashboard)/dashboard/page.tsx`     | Dashboard home                                                                      |
| `app/(dashboard)/users/page.tsx`         | Admin-only users list; redirects non-admins to `/dashboard`                         |
| `app/(dashboard)/users/users-client.tsx` | Client component: user management table                                             |
| `app/api/auth/[...path]/route.ts`        | Proxies all `better-auth` requests to `AUTH_API_URL`                                |
| `app/api/trpc/[...path]/route.ts`        | tRPC handler (proxies to API service)                                               |
| `lib/auth/client.ts`                     | `authClient` — `better-auth/react`, plugins: `twoFactorClient`, `adminClient`       |
| `lib/auth/server.ts`                     | `getServerSession()` — fetches `AUTH_API_URL/api/auth/get-session` (5 s timeout)    |
| `lib/auth/schema.ts`                     | Zod `loginSchema`                                                                   |
| `lib/trpc/`                              | tRPC client (`apiTrpc`, `trpcApiClient`) and auth tRPC client                       |
| `lib/nav.ts`                             | `navItems` — sidebar navigation (Dashboard, Users)                                  |
| `lib/image.ts`                           | `getImageUrl()` helper                                                              |
| `lib/utils.ts`                           | `cn()`, `generatePassword()`                                                        |
| `components/ui/`                         | shadcn/ui primitives (do not modify)                                                |
| `components/layout/`                     | `AppSidebar`, `TopBar`                                                              |
| `components/theme/`                      | `ThemeProvider`, `ThemeToggle`                                                      |
| `components/trpc/`                       | `ApiTrpcProvider` (wraps `TanStack Query` + tRPC)                                   |

---

## `packages/`

### `packages/shared/`

Global NestJS infrastructure. Imported by every backend app.

| Sub-path            | Contents                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/abstracts/`    | `BaseProducer`, `BasePublisher`, `BaseDlqService`                                                                  |
| `src/constants/`    | `SERVICES`, `QUEUES`, `EVENT_PATTERNS`, `MESSAGE_PATTERNS`, `JOB_PATTERNS`, `CLS_CORRELATION_ID`, `THROTTLE_TIERS` |
| `src/decorators/`   | `@Public()`, `@CurrentUser()`, `@RateLimit(tier)`                                                                  |
| `src/filters/`      | `AllExceptionFilter` — HTTP + RPC exception handler, Sentry capture                                                |
| `src/guards/`       | `CustomThrottlerGuard`, `MicroserviceAuthGuard`                                                                    |
| `src/health/`       | `HealthController` — `GET /health/live`, `GET /health/ready`                                                       |
| `src/interceptors/` | `LoggingInterceptor` (MongoDB), `CorrelationInterceptor`                                                           |
| `src/metrics/`      | `MetricsModule`, `MetricsController` (`GET /metrics`), `HttpMetricsInterceptor`, `MetricsAuthGuard`                |
| `src/modules/`      | `SharedModule` (global, dynamic)                                                                                   |
| `src/mongo/`        | `MongoModule`, `MongoService`, `Log` schema, `EmailLog` schema                                                     |
| `src/publishers/`   | `NotificationsPublisher`, publisher input DTOs                                                                     |
| `src/queue/`        | `QueueModule`, `EmailProducer`, job input DTOs + schemas                                                           |
| `src/trpc/`         | `TrpcModule`, `AppContext`, `BaseRouter`, `LoggingTrpcMiddleware`, `AuthTrpcMiddleware`                            |
| `src/types/`        | `PaginatedType`, `PagedMetaType`                                                                                   |
| `src/utils/`        | `BootstrapUtil`, `MicroserviceUtil`, `PaginatedUtil`, `ContextUtil`, `SanitizeUtil`, `SentryUtil`                  |

### `packages/database/`

Prisma 7 client and database infrastructure.

| Path                             | Role                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `prisma/schema.prisma`           | Generator (CJS output to `generated/prisma`), datasource (PostgreSQL)         |
| `prisma/auth.prisma`             | better-auth models: `User`, `Session`, `Account`, `Verification`, `TwoFactor` |
| `src/database.service.ts`        | `DatabaseService extends PrismaClient` with `PrismaPg` adapter                |
| `src/database.module.ts`         | `DatabaseModule` — global, exports `DatabaseService`                          |
| `src/database-seeder.service.ts` | Runs registered seeders on `onModuleInit`                                     |
| `src/index.ts`                   | Barrel re-export including Prisma generated client                            |

### `packages/shared-types/`

Zod v4 schemas shared between frontend and backend.

| Path                                | Contents                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `src/schemas/base-entity.schema.ts` | `baseEntitySchema` — `id`, `createdAt`, `updatedAt`, `deletedAt`, audit fields |
| `src/schemas/pagination.schema.ts`  | `paginationSchema` — `skip`, `take` (max 100), `sortBy`, `sortOrder`           |
| `src/schemas/user.schema.ts`        | `createUserSchema`, `editRoleSchema`                                           |
| `src/enums/role.enum.ts`            | `RoleEnum` — `admin`, `user`                                                   |
| `src/enums/environment.enum.ts`     | `EnvironmentEnum`                                                              |

### `packages/trpc/`

Auto-generated `AppRouter` type consumed by `apps/web`.

| Path                 | Role                  |
| -------------------- | --------------------- |
| `src/auth/server.ts` | Auth tRPC server type |
| `src/index.ts`       | Barrel export         |

### `packages/mail/`

Email delivery abstraction. Currently supports Brevo only.

| Path                              | Role                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/mail.module.ts`              | Dynamic module — `forRoot` / `forRootAsync`; provider: `'brevo'`                            |
| `src/mail.service.ts`             | `send()` with 3-attempt exponential retry; dev-mode email redirect; logs via `MongoService` |
| `src/providers/brevo.provider.ts` | Brevo (Sendinblue) API integration                                                          |
| `src/interfaces/`                 | `MailModuleOptions`, `MailProvider` interfaces                                              |

### `packages/eslint-config/`

Shared ESLint configurations for all workspaces.

### `packages/typescript-config/`

Shared `tsconfig` base files (`base.json`, `nestjs.json`, `nextjs.json`).
