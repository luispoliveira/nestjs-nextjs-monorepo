# NestJS + Next.js Monorepo Template

A production-ready, full-stack monorepo template combining NestJS microservices with a Next.js admin dashboard. Built on modern tooling with end-to-end type safety, async job processing, and a complete authentication system.

## Stack

| Layer             | Technology                                          |
| ----------------- | --------------------------------------------------- |
| Monorepo          | Turborepo + pnpm workspaces                         |
| Backend           | NestJS 11 (TypeScript)                              |
| Frontend          | Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui |
| Database          | PostgreSQL via Prisma 7 (PrismaPg adapter)          |
| Logging/Audit     | MongoDB via Mongoose (30-day TTL)                   |
| Cache / Transport | Redis                                               |
| Auth              | `better-auth` + `@thallesp/nestjs-better-auth`      |
| Validation        | Zod v4 + `nestjs-zod`                               |
| API Contract      | tRPC via `nestjs-trpc-v2`                           |
| Queue             | BullMQ via `@nestjs/bullmq`                         |
| Email             | Brevo (via `@getbrevo/brevo`)                       |
| Logging           | `nestjs-pino` with correlation IDs via `nestjs-cls` |
| Health            | `@nestjs/terminus`                                  |
| Observability     | Prometheus + Grafana (local docker-compose stack)   |

## Workspace Structure

```
apps/
  auth/           # NestJS — Auth service (HTTP + Redis microservice)
  api/            # NestJS — tRPC HTTP gateway (mounts TRPCModule at /api/trpc)
  cron/           # NestJS — Scheduled jobs (@nestjs/schedule), health/metrics HTTP only
  notifications/  # NestJS — Notification microservice (Redis events → BullMQ jobs)
  worker/         # NestJS — BullMQ worker (processes email jobs via Brevo)
  web/            # Next.js — Admin backoffice dashboard (App Router)
packages/
  database/       # Prisma client, DatabaseModule, DatabaseService, migrations, seeders
  shared/         # Global NestJS infrastructure (SharedModule, guards, interceptors, publishers, queue, health, metrics)
  shared-types/   # Zod v4 schemas shared between frontend and backend
  trpc/           # AppRouter types exported from the auth and api apps
  mail/           # MailModule (Brevo provider, MongoDB email logging)
  testing-utils/  # Test factories, DB truncation, testcontainers e2e setup
  eslint-config/  # Shared ESLint configurations
  typescript-config/ # Shared tsconfig bases
docker/
  postgres.env[.example]
  mongo.env[.example]
  prometheus/prometheus.yml     # Scrape config for all NestJS apps
  grafana/provisioning/         # Provisioned Prometheus datasource
tasks/            # PRDs and task lists (template + home platform)
```

## Prerequisites

- **Node.js** >= 22
- **pnpm** >= 10
- **Docker** (for local infrastructure)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. First-time setup

Run the interactive setup wizard. It will ask for the project name, PostgreSQL credentials, and MongoDB credentials, then generate all `.env` files and Docker env files automatically:

```bash
pnpm setup
```

The wizard will:

- Update the project name in `package.json`
- Prompt for **PostgreSQL** database name, username, and password
- Prompt for **MongoDB** database name, username, and password
- Copy every `.env.example` → `.env` (root and all apps) with the provided credentials substituted in all connection strings
- Copy `docker/postgres.env.example` → `docker/postgres.env`
- Copy `docker/mongo.env.example` → `docker/mongo.env`

> Files that already exist are skipped automatically — safe to re-run.

See [Environment Variables](#environment-variables) for a description of each variable.

### 3. Start infrastructure

```bash
pnpm docker:up
```

This starts PostgreSQL (5432), Redis (6379), MongoDB (27017), Prometheus (9090), and Grafana (3333).

> On Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]` to the `prometheus` service in `docker-compose.yaml` so it can reach the apps running on the host — see the comment in `docker/prometheus/prometheus.yml`.

### 4. Run database migrations

```bash
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Run migrations
pnpm db:seed       # Seed initial data (creates admin user)
```

### 5. Start all services

```bash
pnpm dev
```

| Service                 | URL                          |
| ----------------------- | ---------------------------- |
| Auth API                | <http://localhost:3000>      |
| Auth API Docs (Swagger) | <http://localhost:3000/docs> |
| API (tRPC gateway)      | <http://localhost:3100>      |
| Cron                    | <http://localhost:3200>      |
| Notifications           | <http://localhost:3300>      |
| Worker                  | <http://localhost:3400>      |
| Web (backoffice)        | <http://localhost:8080>      |
| Prometheus              | <http://localhost:9090>      |
| Grafana                 | <http://localhost:3333>      |

Every NestJS app shares the same `globalPrefix: 'api'` — they are told apart by **port**, not by path.

## Commands

All commands use **Turborepo** for caching and parallel execution.

```bash
pnpm setup           # Interactive first-time setup wizard (env files + credentials)

pnpm build           # Build all apps and packages
pnpm dev             # Start all services in watch mode
pnpm lint            # Lint all packages
pnpm check-types     # TypeScript type-check all packages
pnpm test            # Run all tests

pnpm db:generate     # Prisma: generate client
pnpm db:migrate      # Prisma: run migrations (prod)
pnpm db:seed         # Prisma: seed database

pnpm docker:up       # Start infrastructure containers
pnpm docker:down     # Stop infrastructure containers
```

> Always use `pnpm` — never npm or yarn.

## Testing

Unit tests use **Jest + ts-jest** and run entirely on the host (no Docker required). Each NestJS app has its own test configuration in its `package.json`.

### Run all tests (all apps, via Turborepo)

```bash
pnpm test
```

### Run tests for a single app

```bash
pnpm --filter api          test
pnpm --filter auth         test
pnpm --filter cron         test
pnpm --filter notifications test
pnpm --filter worker       test
```

### Watch mode (re-runs on file save)

```bash
pnpm --filter api test -- --watch
```

### Coverage report

```bash
# Single app — outputs to apps/<name>/coverage/
pnpm --filter api          test:cov
pnpm --filter auth         test:cov
pnpm --filter cron         test:cov
pnpm --filter notifications test:cov
pnpm --filter worker       test:cov

# Open the HTML report in the browser
open apps/api/coverage/lcov-report/index.html
```

Coverage thresholds are enforced at **80 %** (branches, functions, lines, statements). The build fails if any app falls below the threshold.

### Run a single test file

```bash
cd apps/api
pnpm test -- src/app.controller.spec.ts
```

### Run tests matching a name pattern

```bash
cd apps/api
pnpm test -- --testNamePattern="should return"
```

### Technical notes

- Each app has a `tsconfig.test.json` that overrides `module: "commonjs"` so that ts-jest can process files without ESM issues.
- ESM-only packages (e.g. `@thallesp/nestjs-better-auth`) are replaced with `jest.mock('pkg', factory)` — do not import `AppModule` in unit tests.
- Never use `SharedModule` or `AppModule` in unit tests — only import the controller/service under test.

## Architecture

### Microservice Communication

Services communicate via **Redis transport** using predefined constants from `@repo/shared`:

```
[web (Next.js)]  →  tRPC (auth) / better-auth cookies  →  [auth]
[web (Next.js)]  →  tRPC (api)                         →  [api]
[auth]           →  Redis EventPattern                 →  [notifications]
[notifications]  →  BullMQ Queue (email-queue)         →  [worker]
[worker]         →  Brevo API                          →  Email delivery
[cron]           →  @nestjs/schedule                   →  Scheduled jobs (no upstream trigger)
```

The `auth` service also exposes a `MESSAGE_PATTERNS.AUTH_AUTHENTICATE` RPC endpoint used by other services to validate session tokens.

### Authentication Flow

1. User authenticates via `/api/auth/*` (better-auth HTTP handlers)
2. Session cookie is set by better-auth
3. `proxy.ts` (Next.js 16) validates the session server-side; unauthenticated requests are redirected to `/sign-in`
4. tRPC procedures and server components call `getServerSession()` for auth context

### Email Notification Pipeline

All six better-auth lifecycle events trigger email notifications:

| Event                               | Email Sent                    |
| ----------------------------------- | ----------------------------- |
| `USER_CREATED`                      | Welcome email                 |
| `USER_PASSWORD_RESET_REQUESTED`     | Password reset                |
| `USER_PASSWORD_CHANGED`             | Password changed confirmation |
| `USER_EMAIL_VERIFICATION_REQUESTED` | Email verification            |
| `USER_TWO_FACTOR_ENABLED`           | 2FA enabled confirmation      |
| `USER_TWO_FACTOR_DISABLED`          | 2FA disabled confirmation     |

## Environment Variables

### `apps/auth/.env`

```env
PORT=3000
DATABASE_URL=postgresql://nestjs:change-me@localhost:5432/nestjs
BETTER_AUTH_SECRET=change-me
BETTER_AUTH_URL=http://localhost:3000/api/auth
REDIS_HOST=localhost
REDIS_PORT=6379
MONGO_URI=mongodb://nestjs:change-me@localhost:27017/nestjs?authSource=admin
CORS_ORIGIN=http://localhost:8080
UI_URL=http://localhost:8080
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
METRICS_TOKEN=
SENTRY_DSN=
```

### `apps/api/.env`

```env
PORT=3100
DATABASE_URL=postgresql://nestjs:change-me@localhost:5432/nestjs
REDIS_HOST=localhost
REDIS_PORT=6379
MONGO_URI=mongodb://nestjs:change-me@localhost:27017/nestjs?authSource=admin
CORS_ORIGIN=http://localhost:3000
METRICS_TOKEN=
SENTRY_DSN=
```

### `apps/cron/.env`

```env
PORT=3200
DATABASE_URL=postgresql://nestjs:change-me@localhost:5432/nestjs
REDIS_HOST=localhost
REDIS_PORT=6379
MONGO_URI=mongodb://nestjs:change-me@localhost:27017/nestjs?authSource=admin
CORS_ORIGIN=http://localhost:8080
METRICS_TOKEN=
SENTRY_DSN=
```

### `apps/notifications/.env`

```env
PORT=3300
DATABASE_URL=postgresql://nestjs:change-me@localhost:5432/nestjs
REDIS_HOST=localhost
REDIS_PORT=6379
MONGO_URI=mongodb://nestjs:change-me@localhost:27017/nestjs?authSource=admin
CORS_ORIGIN=http://localhost:8080
METRICS_TOKEN=
SENTRY_DSN=
```

### `apps/worker/.env`

```env
PORT=3400
DATABASE_URL=postgresql://nestjs:change-me@localhost:5432/nestjs
REDIS_HOST=localhost
REDIS_PORT=6379
MONGO_URI=mongodb://nestjs:change-me@localhost:27017/nestjs?authSource=admin
CORS_ORIGIN=http://localhost:8080
BREVO_API_KEY=your-brevo-api-key
FROM_EMAIL=no-reply@example.com
FROM_NAME=My App
DEV_EMAIL=dev@example.com
METRICS_TOKEN=
SENTRY_DSN=
```

### `apps/web/.env`

```env
AUTH_API_URL=http://localhost:3000
API_URL=http://localhost:3100
NEXT_PUBLIC_AUTH_API_URL=http://localhost:3000
BACKEND_PROTOCOL=http
BACKEND_HOST=localhost
```

`METRICS_TOKEN` and `SENTRY_DSN` are optional on every NestJS app — leave them empty to disable auth on the metrics endpoint / disable Sentry.

## Internal Packages

All internal packages use the `@repo/` prefix.

### `@repo/shared`

Global NestJS infrastructure. Every NestJS app **must** import `SharedModule` first.

`SharedModule.register()` provides globally:

- `ConfigModule` (`.env`)
- `DatabaseModule` (Prisma via PrismaPg)
- `MongoModule` (Mongoose for logs/audit)
- `LoggerModule` (nestjs-pino — pretty in dev, JSON in prod)
- `ThrottlerModule` (10 req / 60s by default)
- `ClsModule` (correlation IDs on HTTP + RPC)
- `TerminusModule` + `HealthController` (`GET /health/live`, `GET /health/ready`)
- Global: `AllExceptionFilter`, `LoggingInterceptor`, `CorrelationInterceptor`, `ZodValidationPipe`, `ZodSerializerInterceptor`

#### Constants

Never hardcode queue names, service tokens, or event patterns. Always import from `@repo/shared`:

```typescript
import {
  SERVICES,
  QUEUES,
  EVENT_PATTERNS,
  MESSAGE_PATTERNS,
  JOB_PATTERNS,
} from '@repo/shared';
```

| Constant           | Values                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SERVICES`         | `AUTH`, `NOTIFICATIONS`                                                                                                                                                              |
| `QUEUES`           | `EMAIL: 'email-queue'`, `EMAIL_DLQ: 'email-queue-dlq'`                                                                                                                               |
| `EVENT_PATTERNS`   | `USER_CREATED`, `USER_PASSWORD_RESET_REQUESTED`, `USER_PASSWORD_CHANGED`, `USER_EMAIL_VERIFICATION_REQUESTED`, `USER_TWO_FACTOR_ENABLED`, `USER_TWO_FACTOR_DISABLED`                 |
| `MESSAGE_PATTERNS` | `AUTH_AUTHENTICATE`                                                                                                                                                                  |
| `JOB_PATTERNS`     | `SEND_WELCOME_EMAIL`, `SEND_PASSWORD_RESET_EMAIL`, `SEND_PASSWORD_CHANGED_EMAIL`, `SEND_EMAIL_VERIFICATION_EMAIL`, `SEND_TWO_FACTOR_ENABLED_EMAIL`, `SEND_TWO_FACTOR_DISABLED_EMAIL` |

### `@repo/database`

Prisma 7 client with PrismaPg adapter. Schema is split:

- `schema.prisma` — application models
- `auth.prisma` — better-auth models (**do not modify**)

### `@repo/shared-types`

Zod v4 schemas shared between frontend and backend:

```typescript
import {
  RoleEnum,
  paginationSchema,
  createUserSchema,
} from '@repo/shared-types';
```

### `@repo/trpc`

`AppRouter` type definitions auto-generated by `nestjs-trpc-v2`, one per gateway — auth procedures from the `auth` app, application procedures from the `api` app. Import on the frontend for full type safety:

```typescript
import type { AppRouter } from '@repo/trpc/auth';
import type { AppRouter } from '@repo/trpc/api';
```

### `@repo/mail`

Email delivery via Brevo. Configure with `MailModule.forRootAsync()`. Logs all sent emails to MongoDB (`EmailLog`) with a 30-day TTL.

## Conventions

### NestJS

- Use `BootstrapUtil.setup()` to configure any HTTP app (Swagger, CORS, cookie-parser, Helmet)
- Use `MicroserviceUtil.registerAuthService()` / `MicroserviceUtil.registerNotificationsService()` to register Redis microservice clients
- Extend `BasePublisher` for Redis event publishers, `BaseProducer` for BullMQ queue producers
- Use `@Public()` to bypass auth, `@CurrentUser()` to inject the current user in controllers

### Next.js

- Default to **server components**; add `'use client'` only when required
- All API calls go through tRPC — never raw `fetch`
- Auth in server components: `getServerSession()`
- Auth in client components: `authClient` from `lib/auth/client.ts`
- UI primitives from `components/ui/` (shadcn/ui)

### Database

- Model naming: PascalCase name, `@@map("snake_case")` table name
- Always include `id`, `createdAt`, `updatedAt`; prefer `deletedAt` for soft deletes
- `id String @id @default(cuid())`
- MongoDB is for **logs/audit only** — application data lives in PostgreSQL

### Validation

Use Zod v4 APIs throughout:

```typescript
// ✅ Correct (Zod v4)
z.email();
z.string().min(1);

// ❌ Incorrect (Zod v3)
z.string().email();
```

## Health Checks

All NestJS apps expose:

- `GET /health/live` — liveness probe
- `GET /health/ready` — readiness probe (checks database, Redis, MongoDB)
- `GET /api/metrics` — Prometheus metrics, optionally protected by a `METRICS_TOKEN` bearer token

## Observability

`pnpm docker:up` starts a local Prometheus + Grafana stack alongside the usual infra:

- **Prometheus** (<http://localhost:9090>) scrapes `/api/metrics` on all five NestJS apps (`auth`, `api`, `cron`, `notifications`, `worker`) via `host.docker.internal`. Scrape config: [docker/prometheus/prometheus.yml](docker/prometheus/prometheus.yml).
- **Grafana** (<http://localhost:3333>, default login `admin` / `admin`) comes with a Prometheus datasource pre-provisioned from [docker/grafana/provisioning/](docker/grafana/provisioning/).

> **Linux only:** Docker on Linux doesn't resolve `host.docker.internal` by default. Add `extra_hosts: ["host.docker.internal:host-gateway"]` to the `prometheus` service in `docker-compose.yaml`.

## Docker / Production

The `docker-compose.yaml` includes fully configured (but commented-out) app service definitions with Traefik routing labels, ready to uncomment for deployment. Each app has a `Dockerfile` using a multi-stage build.

## License

Private — all rights reserved.
