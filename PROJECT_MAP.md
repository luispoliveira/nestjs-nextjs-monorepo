# PROJECT_MAP.md — NestJS + Next.js Monorepo

Codebase map for rapid orientation. Every top-level directory described with its role and key files.

See also: [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | [ENTRYPOINTS.md](ENTRYPOINTS.md) | [CONVENTIONS.md](CONVENTIONS.md) | [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md)

---

## Workspace Root

| File / Dir            | Purpose                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `package.json`        | Root workspace; pnpm scripts (`dev`, `build`, `lint`, `db:*`, `docker:*`)                                  |
| `pnpm-workspace.yaml` | Declares `apps/*` and `packages/*`; pins `zod ~4.3.6` globally                                             |
| `turbo.json`          | Turborepo pipeline: build, dev, lint, test, test:cov, test:integration, test:e2e, check-types, db:\* tasks |
| `docker-compose.yaml` | Local infra: PostgreSQL, MongoDB, Redis, Prometheus, Grafana (per-app service defs + Traefik kept commented for future prod use) |
| `.nvmrc`              | Node `>=22`                                                                                                |
| `docker/`             | Compose service config: `docker/prometheus/prometheus.yml` (scrape config), `docker/grafana/provisioning/` (datasource), `postgres.env`/`mongo.env` |
| `openspec/specs/`     | Archived OpenSpec specs, one per shipped change (e.g. `local-observability-stack/spec.md`)                 |
| `CLAUDE.md`           | AI assistant instructions                                                                                  |
| `.github/`            | Copilot instructions, git commit rules, PR templates                                                       |
| `.claude/`            | Agent definitions, corner-cases log                                                                        |

---

## `apps/`

All NestJS apps share the same `globalPrefix: 'api'` (set in each `src/main.ts`) and are
distinguished by **port**, not by path prefix. See [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md#service-ports)
for the full port table.

### `apps/auth/`

**Role**: NestJS authentication service (primary backend). Port `3000`.

- Manages user sessions via `better-auth` + Prisma adapter.
- Exposes REST API at `/api/auth` + microservice listener on Redis.
- Plugins: `twoFactor()`, `admin()`, Google OAuth.
- Emits Redis events on user lifecycle (created, password reset, 2FA toggles).
- Key files:
  - `src/main.ts` — Bootstrap + Redis transport setup
  - `src/app.module.ts` — Root module, `AuthGuard` as `APP_GUARD`
  - `src/auth.controller.ts` — `@MessagePattern(AUTH_AUTHENTICATE)` handler
  - `src/local-auth.service.ts` — Event publishing to Notifications service

---

### `apps/api/`

**Role**: NestJS tRPC HTTP gateway. Port `3100`. Sits behind Nginx in production.

- Hosts the tRPC router for end-to-end type-safe communication with Next.js.
- Mounts `TRPCModule.forRoot()` from `nestjs-trpc-v2` (`basePath: '/api/trpc'`, `globalPrefix: 'api'`).
- `MicroserviceAuthGuard` is the global `APP_GUARD`; calls into `apps/auth` over Redis to validate sessions.
- Registers an `AUTH_SERVICE` Redis client (`ClientsModule`) — it does **not** listen as a microservice.
- Regenerates the `AppRouter` type into `packages/trpc/src/server/api/` (non-production, via `autoSchemaFile`).
- Key files:
  - `src/main.ts` — Bootstrap: `globalPrefix='api'`, `trustProxy:true`
  - `src/app.module.ts` — `SharedModule` + `ClientsModule` (AUTH service) + `TRPCModule.forRoot()` + `MicroserviceAuthGuard` APP_GUARD
  - `src/app.controller.ts` — `GET /api` health-check stub, decorated `@RateLimit('default')`
  - `src/app.router.ts` — Root `AppRouter` (`@Router`, `@UseMiddlewares(LoggingTrpcMiddleware, AuthTrpcMiddleware)`)
  - `src/app.context.ts` — tRPC context (auth session extraction)
  - `test/` — Jest unit tests

---

### `apps/cron/`

**Role**: NestJS scheduled-jobs runner. Port `3200`. No business HTTP routes — health/metrics/docs only.

| Path                                        | Role                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/main.ts`                                | Bootstrap: `globalPrefix='api'`, no Redis microservice transport             |
| `src/app.module.ts`                          | Imports `SharedModule`, `ScheduleModule.forRoot()`; registers cron providers |
| `src/env.ts`                                 | `cronEnvSchema` — app-specific env validation                                |
| `src/example/example-cron.service.ts`        | Example `@Cron(CronExpression.EVERY_HOUR)` job (`Europe/Lisbon` timezone)     |
| `src/example/example-cron.service.spec.ts`   | Unit test for the example cron job                                           |

> `ExampleCronService` carries a `ponytail:` comment: run this app single-instance
> (e.g. PM2 `fork` with 1 instance) so jobs don't fire once per replica. Upgrade
> path if HA scheduling is ever needed: a Redis lock or a BullMQ repeatable job.

---

### `apps/notifications/`

Redis-event–driven notification dispatcher. Enqueues email jobs into BullMQ.

| Path                         | Role                                                                       |
| ---------------------------- | -------------------------------------------------------------------------- |
| `src/main.ts`                | Bootstrap: `globalPrefix='api'`, Redis microservice transport, port `3300` |
| `src/app.module.ts`          | Imports `SharedModule`, `QueueModule.registerQueues([QUEUES.EMAIL])`       |
| `src/app.controller.ts`      | Six `@EventPattern` handlers (see [ENTRYPOINTS.md](ENTRYPOINTS.md))        |
| `src/app.service.ts`         | Delegates to `EmailProducer` for each event type                           |
| `src/app.controller.spec.ts` | Unit tests for `AppController`                                             |
| `src/app.service.spec.ts`    | Unit tests for `AppService`                                                |

---

### `apps/worker/`

BullMQ consumer. Processes email jobs and handles the Dead Letter Queue.

| Path                                        | Role                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/main.ts`                               | Bootstrap: `globalPrefix='api'`, Redis microservice transport, port `3400`                      |
| `src/app.module.ts`                         | Imports `SharedModule`, `QueueModule.registerQueues([QUEUES.EMAIL])`, `MailModule`, `DlqModule` |
| `src/consumer/email.consumer.ts`            | `@Processor(QUEUES.EMAIL)` — dispatches on `job.name`; routes exhausted jobs to DLQ             |
| `src/consumer/email.consumer.spec.ts`       | Unit tests for `EmailConsumer`                                                                  |
| `src/dlq/dlq.controller.ts`                 | Three `@MessagePattern` handlers: `dlq:list`, `dlq:replay`, `dlq:purge`                         |
| `src/dlq/dlq.controller.spec.ts`            | Unit tests for `DlqController`                                                                  |
| `src/dlq/dlq.module.ts`                     | Registers `QueueModule.registerQueues([QUEUES.EMAIL])`, `EmailDlqService`, `DlqController`      |
| `src/dlq/email.dlq.service.ts`              | Extends `BaseDlqService`; list/replay/purge DLQ jobs                                            |
| `src/dlq/email.dlq.service.spec.ts`         | Unit tests for `EmailDlqService`                                                                |
| `src/dlq/base.dlq.service.spec.ts`          | Unit tests for `BaseDlqService` (shared abstract)                                               |
| `src/metrics/queue-metrics.service.ts`      | Prometheus gauges and histograms for queue depth, job duration, failure count                   |
| `src/metrics/queue-metrics.service.spec.ts` | Unit tests for `QueueMetricsService`                                                            |

---

### `apps/web/`

Next.js 16 admin dashboard (App Router). Port `8080` (dev and prod — see `package.json` `dev` script and the commented `docker-compose.yaml` web service).

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

| Sub-path              | Contents                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/abstracts/`      | `BaseProducer`, `BasePublisher`, `BaseDlqService`; spec files for each                                                                                       |
| `src/constants/`      | `SERVICES`, `QUEUES`, `EVENT_PATTERNS`, `MESSAGE_PATTERNS`, `JOB_PATTERNS`, `CLS_CORRELATION_ID`, `THROTTLE_TIERS`                                           |
| `src/decorators/`     | `@Public()`, `@CurrentUser()`, `@RateLimit(tier)`                                                                                                            |
| `src/filters/`        | `AllExceptionFilter` — HTTP + RPC exception handler, Sentry capture; `http-exception.filter.spec.ts`                                                         |
| `src/guards/`         | `CustomThrottlerGuard`, `MicroserviceAuthGuard`; spec files for each                                                                                         |
| `src/health/`         | `HealthController` — `GET /health/live`, `GET /health/ready`                                                                                                 |
| `src/interceptors/`   | `LoggingInterceptor` (MongoDB), `CorrelationInterceptor`; spec files for each                                                                                |
| `src/metrics/`        | `MetricsModule`, `MetricsController` (`GET /metrics`), `HttpMetricsInterceptor`, `MetricsAuthGuard`; spec files for interceptor and guard                    |
| `src/modules/`        | `SharedModule` (global, dynamic)                                                                                                                             |
| `src/mongo/`          | `MongoModule`, `MongoService`, `Log` schema, `EmailLog` schema; `mongo.service.spec.ts`                                                                      |
| `src/publishers/`     | `NotificationsPublisher`, publisher input DTOs; `notifications.publisher.spec.ts`                                                                            |
| `src/queue/`          | `QueueModule`, `EmailProducer`, job input DTOs + schemas; `email.producer.spec.ts`                                                                           |
| `src/trpc/`           | `TrpcModule`, `AppContext`, `BaseRouter`, `LoggingTrpcMiddleware`, `AuthTrpcMiddleware`                                                                      |
| `src/types/`          | `PaginatedType`, `PagedMetaType`                                                                                                                             |
| `src/utils/`          | `BootstrapUtil`, `MicroserviceUtil`, `PaginatedUtil`, `ContextUtil`, `SanitizeUtil`, `SentryUtil`; spec files for context, paginated, sanitize, sentry utils |
| `tsconfig.build.json` | Extends `tsconfig.json`; excludes `**/*.spec.ts` — used by `build` and `dev` scripts                                                                         |
| `tsconfig.test.json`  | Extends `tsconfig.json`; sets `module: commonjs`, `moduleResolution: node`, `resolvePackageJsonExports: false` — used by ts-jest                             |

### `packages/database/`

Prisma 7 client and database infrastructure.

| Path                                  | Role                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                | Generator (CJS output to `generated/prisma`), datasource (PostgreSQL)                                          |
| `prisma/auth.prisma`                  | better-auth models: `User`, `Session`, `Account`, `Verification`, `TwoFactor`                                  |
| `src/database.service.ts`             | `DatabaseService extends PrismaClient` with `PrismaPg` adapter                                                 |
| `src/database.module.ts`              | `DatabaseModule` — global, exports `DatabaseService`                                                           |
| `src/database-seeder.service.ts`      | Runs registered seeders on `onModuleInit`                                                                      |
| `src/index.ts`                        | Barrel re-export including Prisma generated client                                                             |
| `src/database.service.spec.ts`        | Unit tests for `DatabaseService`                                                                               |
| `src/database-seeder.service.spec.ts` | Unit tests for `DatabaseSeederService`                                                                         |
| `tsconfig.build.json`                 | Extends `tsconfig.json`; excludes `**/*.spec.ts`                                                               |
| `tsconfig.test.json`                  | Extends `tsconfig.json`; sets `module: commonjs`, `moduleResolution: node`, `resolvePackageJsonExports: false` |

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

**Role**: Auto-generated `AppRouter` type for end-to-end type safety.

- Generated by `nestjs-trpc-v2` from the `apps/api` gateway into `src/server/api/server.ts` (non-production).
- Exposes subpath exports `@repo/trpc/api` and `@repo/trpc/auth`; the package barrel (`src/index.ts`) re-exports the server types.
- Next.js imports the `AppRouter` type from here for the typed tRPC client.

### `packages/mail/`

Email delivery abstraction. Currently supports Brevo only.

| Path                                   | Role                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/mail.module.ts`                   | Dynamic module — `forRoot` / `forRootAsync`; provider: `'brevo'`                                               |
| `src/mail.service.ts`                  | `send()` with 3-attempt exponential retry; dev-mode email redirect; logs via `MongoService`                    |
| `src/providers/brevo.provider.ts`      | Brevo (Sendinblue) API integration                                                                             |
| `src/interfaces/`                      | `MailModuleOptions`, `MailProvider` interfaces                                                                 |
| `src/mail.service.spec.ts`             | Unit tests for `MailService`                                                                                   |
| `src/providers/brevo.provider.spec.ts` | Unit tests for `BrevoProvider`                                                                                 |
| `tsconfig.build.json`                  | Extends `tsconfig.json`; excludes `**/*.spec.ts`                                                               |
| `tsconfig.test.json`                   | Extends `tsconfig.json`; sets `module: commonjs`, `moduleResolution: node`, `resolvePackageJsonExports: false` |

### `packages/testing-utils/`

Test-only utilities shared by all backend apps. **Never import in production code.**

| Path                               | Role                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                     | Barrel export                                                                                                          |
| `src/factories/user.factory.ts`    | `createUser(db, overrides?)` — inserts `User` + `Account` (credential provider); exports `TEST_PASSWORD = 'Test1234!'` |
| `src/factories/session.factory.ts` | `createSession(db, userId, overrides?)` — inserts a `Session` expiring 24 h from now                                   |
| `src/factories/index.ts`           | Re-exports factories and their override interfaces                                                                     |
| `src/helpers/truncate.ts`          | `truncateDatabase(db)` — `DELETE` from `verification`, `user` (cascade removes sessions, accounts, 2FA)                |
| `src/helpers/index.ts`             | Re-exports helpers                                                                                                     |

Password hashing in `createUser` matches better-auth's scrypt format exactly (`${salt}:${hex(key)}`, N=16384, r=16, p=1, keylen=64). The hash is cached per process to avoid paying the cost on every test.

### `packages/eslint-config/`

Shared ESLint configurations for all workspaces.

### `packages/typescript-config/`

Shared `tsconfig` base files (`base.json`, `nestjs.json`, `nextjs.json`).
