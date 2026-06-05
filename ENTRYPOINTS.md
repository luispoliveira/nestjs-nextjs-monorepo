# ENTRYPOINTS.md — NestJS + Next.js Monorepo

All system entry points: HTTP routes, microservice message/event patterns, BullMQ jobs, and shared health/metrics endpoints.

See also: [PROJECT_MAP.md](PROJECT_MAP.md) | [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | [CONVENTIONS.md](CONVENTIONS.md)

---

## HTTP Routes

### `apps/api` — prefix `/api`, versioning enabled

| Method | Path | Handler | Auth | Notes |
|---|---|---|---|---|
| `GET` | `/api` | `AppController.getHello` | Required | Returns `'Hello, world!'`; `@RateLimit('default')` |
| `GET` | `/api/health/live` | `HealthController.isAlive` | Public | Liveness probe — returns `{ status: 'ok' }` |
| `GET` | `/api/health/ready` | `HealthController.check` | Public | Readiness: DB ping, Redis ping, memory heap, disk |
| `GET` | `/api/metrics` | `MetricsController` | `MetricsAuthGuard` | Prometheus scrape endpoint |
| `*` | `/api/trpc/*` | `TRPCModule` (nestjs-trpc-v2) | `AuthTrpcMiddleware` | tRPC batch endpoint |

Global guard: `MicroserviceAuthGuard` (all non-`@Public` routes require valid session).
Swagger: `/api/docs` (non-production only).

### `apps/auth` — prefix `/api/auth`, versioning enabled

| Method | Path | Handler | Auth | Notes |
|---|---|---|---|---|
| `*` | `/api/auth/**` | `better-auth` handler | Managed by better-auth | Session, sign-in, sign-up, OAuth, 2FA, admin |
| `GET` | `/health/live` | `HealthController.isAlive` | Public | Excluded from global prefix — better-auth intercepts all `/api/auth/*` |
| `GET` | `/health/ready` | `HealthController.check` | Public | Excluded from global prefix |
| `GET` | `/api/auth/metrics` | `MetricsController` | `MetricsAuthGuard` | |

Global guard: `AuthGuard` from `@thallesp/nestjs-better-auth`.
`globalPrefixExclude: ['health', 'health/*path']` in `main.ts` keeps health endpoints reachable outside the prefix that better-auth intercepts.
Swagger: `/api/auth/docs` (non-production only).

### `apps/notifications` — prefix `/api/notifications`, port `3100`

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/notifications/health/live` | |
| `GET` | `/api/notifications/health/ready` | |
| `GET` | `/api/notifications/metrics` | `MetricsAuthGuard` |

Swagger: `/api/notifications/docs` (non-production only).
No application HTTP routes — all traffic is via Redis event patterns.

### `apps/worker` — prefix `/api/worker`, port `3200`

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/worker/health/live` | |
| `GET` | `/api/worker/health/ready` | |
| `GET` | `/api/worker/metrics` | `MetricsAuthGuard` |

Swagger: `/api/worker/docs` (non-production only).
No application HTTP routes — all traffic is via Redis message patterns and BullMQ.

---

## tRPC Procedures

Base path: `/api/trpc` (on `apps/api`). Both middlewares apply to all procedures:
1. `LoggingTrpcMiddleware` — logs to MongoDB, duration, user, input/output.
2. `AuthTrpcMiddleware` — validates token via `MESSAGE_PATTERNS.AUTH_AUTHENTICATE`.

| Router | Procedure | Type | Output | File |
|---|---|---|---|---|
| `AppRouter` | `hello` | Query | `string` | `apps/api/src/app.router.ts` |

`BaseRouter` in `packages/shared/src/trpc/router/base.router.ts` applies `LoggingTrpcMiddleware` to all subclasses.

Auth tRPC client (web → auth service): `basePath='/api/auth/trpc'` — type source `@repo/trpc/auth`.
API tRPC client (web → api service): `basePath='/api/trpc'` — type source `@repo/trpc/api`.

---

## Redis Message Patterns (`@MessagePattern` — request/response)

Constant source: `packages/shared/src/constants/events.ts`

| Pattern | Value | Handler App | Handler | Purpose |
|---|---|---|---|---|
| `MESSAGE_PATTERNS.AUTH_AUTHENTICATE` | `'auth:authenticate'` | `apps/auth` | `AuthController.authenticate` | Validate session token; returns user object |
| `MESSAGE_PATTERNS.DLQ_LIST` | `'dlq:list'` | `apps/worker` | `DlqController.list` | List jobs in `email-queue-dlq` |
| `MESSAGE_PATTERNS.DLQ_REPLAY` | `'dlq:replay'` | `apps/worker` | `DlqController.replay` | Move DLQ job back to `email-queue` |
| `MESSAGE_PATTERNS.DLQ_PURGE` | `'dlq:purge'` | `apps/worker` | `DlqController.purge` | Remove a job from the DLQ |

Senders: `MicroserviceAuthGuard` and `AuthTrpcMiddleware` send `AUTH_AUTHENTICATE`. DLQ patterns are called from `apps/api` or any service that manages the worker.

---

## Redis Event Patterns (`@EventPattern` — fire-and-forget)

Constant source: `packages/shared/src/constants/events.ts`

| Pattern | Value | Emitted by | Handled by | Payload |
|---|---|---|---|---|
| `EVENT_PATTERNS.USER_CREATED` | `'user:created'` | `apps/auth` (`LocalAuthService`) | `apps/notifications` | `{ userId, email }` |
| `EVENT_PATTERNS.USER_PASSWORD_RESET_REQUESTED` | `'user:password_reset_requested'` | `apps/auth` | `apps/notifications` | `{ userId, email, resetToken }` |
| `EVENT_PATTERNS.USER_PASSWORD_CHANGED` | `'user:password_changed'` | `apps/auth` | `apps/notifications` | `{ userId, email }` |
| `EVENT_PATTERNS.USER_EMAIL_VERIFICATION_REQUESTED` | `'user:email_verification_requested'` | `apps/auth` | `apps/notifications` | `{ userId, email, verificationLink }` |
| `EVENT_PATTERNS.USER_TWO_FACTOR_ENABLED` | `'user:two_factor_enabled'` | `apps/auth` | `apps/notifications` | `{ userId, email }` |
| `EVENT_PATTERNS.USER_TWO_FACTOR_DISABLED` | `'user:two_factor_disabled'` | `apps/auth` | `apps/notifications` | `{ userId, email }` |

Publisher: `NotificationsPublisher` in `packages/shared/src/publishers/` — wraps `BasePublisher.publish()` which adds `correlationId`.

---

## BullMQ Queues and Job Patterns

Constant sources: `packages/shared/src/constants/queues.ts`, `packages/shared/src/constants/jobs.ts`

### Queues

| Constant | Queue Name | Purpose |
|---|---|---|
| `QUEUES.EMAIL` | `'email-queue'` | Primary email job queue |
| `QUEUES.EMAIL_DLQ` | `'email-queue-dlq'` | Dead Letter Queue — jobs that exhausted all retries |

Default job options (set in `QueueModule`): `attempts: 3`, exponential backoff from 2000 ms, `removeOnComplete: true`, `removeOnFail: 500`.
DLQ job options: `removeOnFail: { count: 1000, age: 2592000 }` (30 days), `removeOnComplete: true`.

### Job Patterns

Constant source: `packages/shared/src/constants/jobs.ts`

| Constant | Value | Enqueued by | Processed by | Input schema |
|---|---|---|---|---|
| `JOB_PATTERNS.SEND_WELCOME_EMAIL` | `'job:send_welcome_email'` | `EmailProducer` | `EmailConsumer` | `sendWelcomeEmailInputSchema` |
| `JOB_PATTERNS.SEND_EMAIL_VERIFICATION_EMAIL` | `'job:send_email_verification_email'` | `EmailProducer` | `EmailConsumer` | `sendEmailVerificationEmailSchema` |
| `JOB_PATTERNS.SEND_PASSWORD_RESET_EMAIL` | `'job:send_password_reset_email'` | `EmailProducer` | `EmailConsumer` | `sendPasswordResetEmailInputSchema` |
| `JOB_PATTERNS.SEND_PASSWORD_CHANGED_EMAIL` | `'job:send_password_changed_email'` | `EmailProducer` | `EmailConsumer` | `sendPasswordChangedEmailInputSchema` |
| `JOB_PATTERNS.SEND_TWO_FACTOR_ENABLED_EMAIL` | `'job:send_two_factor_enabled_email'` | `EmailProducer` | `EmailConsumer` | `sendUserTwoFactorEnabledInputSchema` |
| `JOB_PATTERNS.SEND_TWO_FACTOR_DISABLED_EMAIL` | `'job:send_two_factor_disabled_email'` | `EmailProducer` | `EmailConsumer` | `sendUserTwoFactorDisabledInputSchema` |

All input schemas are in `packages/shared/src/queue/input/` and re-exported from `@repo/shared`.

---

## Next.js API Routes (`apps/web`)

| Method | Path | File | Notes |
|---|---|---|---|
| `*` | `/api/auth/[...path]` | `app/api/auth/[...path]/route.ts` | Proxies to `AUTH_API_URL` |
| `*` | `/api/trpc/[...path]` | `app/api/trpc/[...path]/route.ts` | tRPC handler (api service) |

---

## Next.js Pages

| Route | File | Protection |
|---|---|---|
| `/` | `app/page.tsx` | Public (redirects based on session) |
| `/sign-in` | `app/(auth)/sign-in/page.tsx` | Public |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Session required (layout redirect) |
| `/users` | `app/(dashboard)/users/page.tsx` | `RoleEnum.ADMIN` only |

---

## Health Check Details

`HealthController` (registered globally by `SharedModule`) checks:

| Check | Indicator | Threshold |
|---|---|---|
| Database | `PrismaHealthIndicator.pingCheck` | Ping `DatabaseService` |
| Redis | `MicroserviceHealthIndicator.pingCheck` | `Transport.REDIS` at `REDIS_HOST:REDIS_PORT` |
| Memory | `MemoryHealthIndicator.checkHeap` | 250 MB heap limit |
| Disk | `DiskHealthIndicator.checkStorage` | 70% threshold on `/` |
