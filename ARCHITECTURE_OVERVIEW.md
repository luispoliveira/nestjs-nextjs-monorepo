# ARCHITECTURE_OVERVIEW.md — NestJS + Next.js Monorepo

Detailed architectural description covering service topology, module structure, async communication, and integrations.

See also: [PROJECT_MAP.md](PROJECT_MAP.md) | [ENTRYPOINTS.md](ENTRYPOINTS.md) | [CONVENTIONS.md](CONVENTIONS.md) | [DEPENDENCY_GRAPH.md](DEPENDENCY_GRAPH.md)

---

## Service Topology

```
                    ┌─────────────┐
                    │   Browser   │
                    └──────┬──────┘
                           │ HTTP
                    ┌──────▼──────┐
                    │    Nginx    │  (production reverse proxy)
                    └──┬──────┬───┘
                       │      │
               HTTP    │      │  HTTP
          ┌────────────▼──┐ ┌─▼────────────────┐
          │  apps/api     │ │  apps/auth        │
          │  :PORT/api    │ │  :PORT/api/auth   │
          │  tRPC + REST  │ │  better-auth      │
          └───────┬───────┘ └──────────┬────────┘
                  │                    │
    Redis send()  │              Redis emit()
    auth:authenticate              notifications events
                  │                    │
          ┌───────▼────────────────────▼────────┐
          │              Redis                  │
          │   (message transport + BullMQ)      │
          └──┬────────────────────────┬─────────┘
             │                        │
    Redis    │                 BullMQ │ email-queue
    events   │               ┌────────▼──────────┐
             │               │  apps/worker      │
    ┌────────▼───────┐        │  EmailConsumer    │
    │ apps/notif-    │        │  DLQ: email-queue-dlq │
    │ ications       │        └────────┬──────────┘
    │ :PORT/api/     │                 │ SMTP
    │ notifications  │         ┌───────▼───────┐
    └────────────────┘         │  Brevo (mail) │
                               └───────────────┘
          │
          │ BullMQ enqueue (email-queue)
          └──────────────────────────────►  apps/worker
```

---

## Infrastructure Dependencies

| Service    | Role                                                                                |
| ---------- | ----------------------------------------------------------------------------------- |
| PostgreSQL | Primary database — Prisma 7 via `PrismaPg` adapter                                  |
| MongoDB    | Log/audit storage — HTTP request logs, email send logs (30-day TTL)                 |
| Redis      | Microservice transport (NestJS Redis strategy) + BullMQ queues + throttler storage  |
| Sentry     | Error tracking — initialized in each app's `main.ts` via `SentryUtil.init(appName)` |
| Brevo      | Transactional email delivery                                                        |

---

## SharedModule — Global Infrastructure

`SharedModule.register(params?)` is `@Global()` and must be the first import in every app `AppModule`. It provides the following to the entire application context:

**Registered imports:**

| Module            | What it provides                                                                |
| ----------------- | ------------------------------------------------------------------------------- |
| `ConfigModule`    | `.env` loading, `isGlobal: true`                                                |
| `DatabaseModule`  | `DatabaseService` (Prisma + PrismaPg)                                           |
| `TerminusModule`  | Health check infrastructure                                                     |
| `MongoModule`     | `MongoService`, `Log` model, `EmailLog` model                                   |
| `LoggerModule`    | pino logger (pretty in dev, JSON in prod)                                       |
| `ThrottlerModule` | Default: 10 req / 60 s per key; Redis storage when `throttlerRedisUrl` supplied |
| `ClsModule`       | Correlation ID propagation via `nestjs-cls`                                     |
| `MetricsModule`   | Prometheus metrics (optional `appName` label)                                   |

**Global providers (applied to all routes):**

| Provider                   | Type              | Role                                                            |
| -------------------------- | ----------------- | --------------------------------------------------------------- |
| `AllExceptionFilter`       | `APP_FILTER`      | Normalised error responses; Sentry capture for 5xx; 422 for Zod |
| `LoggingInterceptor`       | `APP_INTERCEPTOR` | Logs HTTP req/res to MongoDB                                    |
| `CorrelationInterceptor`   | `APP_INTERCEPTOR` | Threads `correlationId` from RPC payloads into CLS              |
| `ZodValidationPipe`        | `APP_PIPE`        | Request body validation                                         |
| `ZodSerializerInterceptor` | `APP_INTERCEPTOR` | Response serialisation                                          |
| `HttpMetricsInterceptor`   | `APP_INTERCEPTOR` | Records HTTP request duration in Prometheus                     |

**Global controller:**

| Controller          | Routes                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| `HealthController`  | `GET /health/live`, `GET /health/ready` (version-neutral)                 |
| `MetricsController` | `GET /metrics` (Prometheus scrape endpoint; `MetricsAuthGuard` protected) |

---

## Authentication Flow

```
Client (browser / other service)
    │
    │  Bearer token or better-auth.session_token cookie
    ▼
┌─────────────────────────────────────┐
│  apps/api  — MicroserviceAuthGuard  │  (global APP_GUARD)
│  apps/auth — AuthTrpcMiddleware     │  (tRPC middleware)
└─────────────┬───────────────────────┘
              │  Redis send  MESSAGE_PATTERNS.AUTH_AUTHENTICATE
              ▼
┌─────────────────────────────────────┐
│  apps/auth — AuthController         │
│  @MessagePattern('auth:authenticate')│
│  calls better-auth session lookup   │
└─────────────────────────────────────┘
              │
              │  returns user object (or throws UnauthorizedException)
              ▼
         request.user populated
```

---

## Event-Driven Flow

### User Created → Welcome Email

```text
1. auth app
   better-auth fires user.created hook
         │
         ▼
   NotificationsPublisher.emit(USER_CREATED, { user })
         │ Redis EVENT_PATTERN
         ▼

2. notifications app
   @EventPattern(USER_CREATED)
   AppController.onUserCreated()
         │
         ▼
   EmailProducer.add(SEND_WELCOME_EMAIL, { to, name })
         │ BullMQ email-queue
         ▼

3. worker app
   @Processor(QUEUES.EMAIL)
   EmailConsumer.process(job) — switch on job.name
     → case JOB_PATTERNS.SEND_WELCOME_EMAIL
         │
         ▼
   MailModule → Brevo API → Email delivered
```

### Supported Events

| Event Pattern                       | Trigger             | Job Enqueued                     |
| ----------------------------------- | ------------------- | -------------------------------- |
| `user:created`                      | New registration    | `SEND_WELCOME_EMAIL`             |
| `user:password_reset_requested`     | Password reset flow | `SEND_PASSWORD_RESET_EMAIL`      |
| `user:password_changed`             | Password changed    | `SEND_PASSWORD_CHANGED_EMAIL`    |
| `user:email_verification_requested` | Email verification  | `SEND_EMAIL_VERIFICATION_EMAIL`  |
| `user:two_factor_enabled`           | 2FA enabled         | `SEND_TWO_FACTOR_ENABLED_EMAIL`  |
| `user:two_factor_disabled`          | 2FA disabled        | `SEND_TWO_FACTOR_DISABLED_EMAIL` |

---

## tRPC Architecture

```text
apps/web (Next.js)
  TrpcProvider (root layout)
    └─ httpBatchLink → tRPC endpoint
         │
         ▼
apps/api  (HTTP gateway, globalPrefix 'api')
  TRPCModule.forRoot({ basePath: '/api/trpc', context: AppContext })  ← nestjs-trpc-v2
    │  APP_GUARD: MicroserviceAuthGuard (validates session via apps/auth over Redis)
    └─ AppRouter  (@Router)
         @UseMiddlewares(LoggingTrpcMiddleware, AuthTrpcMiddleware)
              └─ procedures (e.g. hello)

packages/trpc
  └─ AppRouter type (auto-generated from apps/api into src/server/api/, imported by web)
```

> The tRPC gateway lives in `apps/api`, not `apps/auth`. The `autoSchemaFile`
> in `apps/api/src/app.module.ts` regenerates the router type into
> `packages/trpc/src/server/api/` outside production.

---

## Correlation IDs

Every request carries a `correlationId` (UUID v4):

1. HTTP: generated in `ClsModule` setup hook; attached to `req[CLS_CORRELATION_ID]`.
2. Microservice events: `BasePublisher.publish()` / `BaseProducer.addJob()` spread `correlationId` into the payload.
3. `CorrelationInterceptor` reads `payload.correlationId` from RPC context and sets it in CLS.
4. All log entries (MongoDB, pino) and Sentry captures include `correlationId`.

---

## Rate Limiting

- `ThrottlerModule` is configured in `SharedModule` with Redis storage (when `throttlerRedisUrl` is provided).
- `CustomThrottlerGuard` keys on `user.id` when authenticated, falls back to client IP.
- `@RateLimit(tier)` combines `@UseGuards(CustomThrottlerGuard)` + `@Throttle(THROTTLE_TIERS[tier])`.
- Tiers defined in `packages/shared/src/constants/throttler.ts`:
  - `default`: 60 req / 60 s
  - `strict`: 10 req / 60 s
- `apps/api AppController` uses `@RateLimit('default')`.

---

## Prisma Schema Structure

Two `.prisma` files merged at generate time:

- `packages/database/prisma/schema.prisma` — generator + datasource (no application models yet; extension point for app-domain models).
- `packages/database/prisma/auth.prisma` — owned by better-auth: `User`, `Session`, `Account`, `Verification`, `TwoFactor`.

Generated client output: `packages/database/generated/prisma/` (CJS format).

---

## Turborepo Task Graph

```
db:generate ──► build ──► dev / test / test:cov / lint / check-types
                      └──► test:integration / test:e2e / test:watch  (cache: false — never skipped)
```

Build caches `dist/**` and `.next/**`. Environment variables `AUTH_API_URL`, `API_URL`, `BACKEND_HOST`, `BACKEND_PROTOCOL` are declared as Turbo `env` inputs for the `build` task (cache-busting).

`test` and `test:cov` run across all workspaces (apps + `packages/shared`, `packages/mail`, `packages/database`). `test:integration` and `test:e2e` depend on `^build`, are never cached, and apply only to apps that have the corresponding jest configs. Run `pnpm test:db:setup` once before executing integration or E2E tasks to ensure the `nestjs_test` database exists and is migrated.
