# DEPENDENCY_GRAPH.md — NestJS + Next.js Monorepo

Package dependencies, module imports, and cross-service communication map.
Arrows indicate "depends on" direction.

See also: [PROJECT_MAP.md](PROJECT_MAP.md) | [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | [ENTRYPOINTS.md](ENTRYPOINTS.md)

---

## Internal Package Dependency Graph

```text
apps/auth ──────────────────────────────────────────────────────────┐
  │                                                                  │
  ├─→ @repo/shared         (SharedModule, utils, guards, constants)  │
  ├─→ @repo/database       (DatabaseService, Prisma models)          │
  ├─→ @repo/shared-types   (RoleEnum, EnvironmentEnum)              │
  └─→ better-auth          (auth engine)                             │
       └─→ @better-auth/prisma-adapter                              │
                                                                      │
apps/api ────────────────────────────────────────────────────────────┤
  │                                                                  │
  ├─→ @repo/shared         (SharedModule, MicroserviceUtil, guards,  │
  │                          tRPC middlewares)                        │
  ├─→ @repo/database       (DatabaseService)                         │
  ├─→ @repo/shared-types   (schemas, RoleEnum)                       │
  └─→ nestjs-trpc-v2       (TRPCModule.forRoot — tRPC HTTP gateway)  │
                                                                      │
apps/cron ───────────────────────────────────────────────────────────┤
  │                                                                  │
  ├─→ @repo/shared         (SharedModule, MetricsModule)             │
  ├─→ @repo/shared-types   (env schema)                              │
  └─→ @nestjs/schedule     (ScheduleModule.forRoot, @Cron)           │
                                                                      │
apps/notifications ──────────────────────────────────────────────────┤
  │                                                                  │
  ├─→ @repo/shared         (SharedModule, QueueModule, EmailProducer)│
  └─→ @repo/shared-types   (schemas)                                 │
                                                                      │
apps/worker ─────────────────────────────────────────────────────────┤
  │                                                                  │
  ├─→ @repo/shared         (SharedModule, QueueModule, JOB_PATTERNS) │
  └─→ @repo/mail           (MailModule, email sending)               │
                                                                      │
apps/web ────────────────────────────────────────────────────────────┘
  │
  ├─→ @repo/trpc           (AppRouter type for type safety)
  ├─→ @repo/shared-types   (Zod schemas for forms, RoleEnum)
  └─→ better-auth/client   (authClient, session hooks)
```

---

## NestJS Module Imports per App

### `apps/api`

| Module                                                                      | Source                            |
| --------------------------------------------------------------------------- | --------------------------------- |
| `SharedModule.register({ metrics: { appName: 'api' }, throttlerRedisUrl })` | `@repo/shared`                    |
| `ClientsModule` with `registerAuthService()`                                | `@repo/shared` (MicroserviceUtil) |
| `TRPCModule.forRoot({ basePath: '/api/trpc', context: AppContext })`        | `nestjs-trpc-v2`                  |

### `apps/cron`

| Module                                                       | Source              |
| -------------------------------------------------------------| -------------------- |
| `SharedModule.register({ validate: cronEnvSchema.parse, metrics: { appName: 'cron' } })` | `@repo/shared` |
| `ScheduleModule.forRoot()`                                    | `@nestjs/schedule`   |

No `ClientsModule` and no `app.connectMicroservice()` call — `apps/cron` never
listens on or sends to Redis as a microservice.

### `apps/auth`

| Module                                                | Source                                       |
| ----------------------------------------------------- | -------------------------------------------- |
| `SharedModule.register({})`                           | `@repo/shared`                               |
| `ClientsModule` with `registerNotificationsService()` | `@repo/shared` (MicroserviceUtil)            |
| `AuthModule.forRootAsync(...)`                        | `@thallesp/nestjs-better-auth`               |
| `DatabaseModule`                                      | `@repo/database` (within AuthModule factory) |
| `ConfigModule`                                        | `@nestjs/config` (within AuthModule factory) |

### `apps/notifications`

| Module                                                             | Source         |
| ------------------------------------------------------------------ | -------------- |
| `SharedModule.register({ metrics: { appName: 'notifications' } })` | `@repo/shared` |
| `QueueModule.registerQueues([QUEUES.EMAIL])`                       | `@repo/shared` |

### `apps/worker`

| Module                                                      | Source                       |
| ----------------------------------------------------------- | ---------------------------- |
| `SharedModule.register({ metrics: { appName: 'worker' } })` | `@repo/shared`               |
| `QueueModule.registerQueues([QUEUES.EMAIL])`                | `@repo/shared`               |
| `MailModule.forRootAsync({ provider: 'brevo', ... })`       | `@repo/mail`                 |
| `DlqModule`                                                 | local `apps/worker/src/dlq/` |

#### `DlqModule`

| Module                                       | Source         |
| -------------------------------------------- | -------------- |
| `QueueModule.registerQueues([QUEUES.EMAIL])` | `@repo/shared` |

---

## Key Third-Party Dependencies

### Backend (NestJS apps + shared/mail packages)

| Package                             | Version                    | Role                             |
| ----------------------------------- | -------------------------- | -------------------------------- |
| `@nestjs/common`                    | `^11`                      | Core NestJS                      |
| `@nestjs/microservices`             | `^11`                      | Redis transport                  |
| `@nestjs/bullmq`                    | `^11`                      | BullMQ integration (never legacy `bull` / `@nestjs/bull`) |
| `@nestjs/terminus`                  | `^11`                      | Health checks                    |
| `@nestjs/schedule`                  | `^6` (apps/cron only)      | Cron jobs — `ScheduleModule.forRoot()`, `@Cron()` |
| `@nestjs/throttler`                 | via shared                 | Rate limiting                    |
| `@nest-lab/throttler-storage-redis` | via shared                 | Redis throttler storage          |
| `@willsoto/nestjs-prometheus`       | via shared                 | Prometheus metrics               |
| `better-auth`                       | `^1.6`                     | Auth framework                   |
| `@thallesp/nestjs-better-auth`      | via auth                   | NestJS adapter for better-auth   |
| `@better-auth/prisma-adapter`       | `^1.6`                     | Prisma adapter for better-auth   |
| `nestjs-trpc-v2`                    | via api/shared             | tRPC server integration          |
| `nestjs-zod`                        | via shared                 | Zod validation pipe + serializer |
| `nestjs-pino`                       | via shared                 | Structured logging               |
| `nestjs-cls`                        | via shared                 | Continuation-local storage       |
| `@prisma/client`                    | `^7`                       | Database ORM                     |
| `@prisma/adapter-pg`                | `^7`                       | PrismaPg driver adapter          |
| `@nestjs/mongoose`                  | via shared                 | MongoDB / Mongoose               |
| `bullmq`                            | via `@nestjs/bullmq`       | BullMQ client                    |
| `@sentry/nestjs`                    | via shared                 | Error tracking (optional — enabled by setting `SENTRY_DSN`) |
| `zod`                               | `~4.3.6` (pinned globally) | Validation schemas               |

**Dev / test dependencies** (apps + `packages/shared`, `packages/mail`, `packages/database`):

| Package           | Role                                                      |
| ----------------- | --------------------------------------------------------- |
| `jest`            | Test runner                                               |
| `ts-jest`         | TypeScript transform for Jest — uses `tsconfig.test.json` |
| `@nestjs/testing` | `Test.createTestingModule` for unit and integration tests |
| `@types/jest`     | TypeScript types for Jest globals                         |

### Frontend (`apps/web`)

| Package                    | Version       | Role                                           |
| -------------------------- | ------------- | ---------------------------------------------- |
| `next`                     | `16.x`        | Next.js App Router                             |
| `react`                    | `^19`         | React                                          |
| `better-auth`              | `^1.6`        | Auth client (`twoFactorClient`, `adminClient`) |
| `@trpc/react-query`        | `^11`         | tRPC client                                    |
| `@tanstack/react-query`    | `^5`          | Query cache                                    |
| `@hookform/resolvers`      | `^5`          | Zod resolver for React Hook Form               |
| `react-hook-form`          | via resolvers | Form state management                          |
| `tailwindcss`              | `^4`          | CSS framework                                  |
| `class-variance-authority` | `^0.7`        | Component variants                             |
| `clsx` + `tailwind-merge`  | via utils     | Conditional class merging                      |
| `next-themes`              | via layout    | Theme provider                                 |
| `sonner`                   | via layout    | Toast notifications                            |
| `lucide-react`             | via nav       | Icons                                          |
| `zod`                      | `~4.3.6`      | Client-side validation                         |

---

## `packages/shared` Internal Structure

```
@repo/shared
├── abstracts/
│   ├── BaseProducer         ← extend for new BullMQ producers
│   ├── BasePublisher        ← extend for new Redis event publishers
│   └── BaseDlqService       ← extend for new DLQ service implementations
├── constants/               ← SERVICES, QUEUES, EVENT_PATTERNS, MESSAGE_PATTERNS,
│                               JOB_PATTERNS, CLS_CORRELATION_ID, THROTTLE_TIERS
├── decorators/
│   ├── @Public()            ← bypasses APP_GUARD
│   ├── @CurrentUser()       ← extracts request.user
│   └── @RateLimit(tier)     ← CustomThrottlerGuard + Throttle config
├── filters/
│   └── AllExceptionFilter   ← @Catch() — normalised errors, Sentry capture
├── guards/
│   ├── CustomThrottlerGuard ← user.id > IP key strategy
│   └── MicroserviceAuthGuard← validates token via AUTH_SERVICE Redis call
├── health/
│   └── HealthController     ← GET /health/live, GET /health/ready
├── interceptors/
│   ├── LoggingInterceptor   ← HTTP req/res → MongoDB Log
│   └── CorrelationInterceptor← propagates correlationId into CLS for RPC
├── metrics/
│   ├── MetricsModule        ← Prometheus with per-app labels
│   ├── MetricsController    ← GET /metrics (MetricsAuthGuard protected)
│   └── HttpMetricsInterceptor← duration histogram per route
├── modules/
│   └── SharedModule         ← @Global() dynamic module
├── mongo/
│   ├── MongoModule          ← @Global() Mongoose module
│   ├── MongoService         ← createLog, updateLog, createEmailLog, updateEmailLog
│   ├── schema/log.schema.ts ← HTTP request/response log
│   └── schema/email-log.schema.ts ← sent email record
├── publishers/
│   └── NotificationsPublisher← emit all USER_* events to notifications service
├── queue/
│   ├── QueueModule          ← BullMQ root + registerQueues (main + DLQ)
│   ├── producers/EmailProducer← send all email job types
│   └── input/               ← Zod DTOs for each job type
├── trpc/
│   ├── TrpcModule           ← wraps nestjs-trpc-v2 + MongoModule
│   ├── AppContext            ← TRPCContext factory
│   ├── BaseRouter           ← abstract; applies LoggingTrpcMiddleware
│   ├── LoggingTrpcMiddleware ← logs tRPC req/res to MongoDB
│   └── AuthTrpcMiddleware   ← validates token via AUTH_SERVICE
├── types/
│   ├── PaginatedType        ← generic paginated response shape
│   └── PagedMetaType        ← pagination metadata
└── utils/
    ├── BootstrapUtil        ← app setup (helmet, versioning, swagger, cors, cookie-parser)
    ├── MicroserviceUtil     ← registerAuthService, registerNotificationsService
    ├── PaginatedUtil        ← getPaginatedResponse(items, total, skip, take)
    ├── ContextUtil          ← extractToken from header/cookie
    ├── SanitizeUtil         ← redacts sensitive keys (password, token, etc.)
    └── SentryUtil           ← init(appName), captureException(error, context)
```

---

## NestJS Module Dependencies (per app)

### `apps/auth` Module Graph

```text
AppModule
├─ SharedModule.register()
│   ├─ ConfigModule
│   ├─ DatabaseModule ──→ @repo/database
│   ├─ TerminusModule
│   ├─ MongoModule
│   ├─ LoggerModule (pino)
│   ├─ ThrottlerModule
│   ├─ ClsModule
│   └─ MetricsModule
│
├─ ClientsModule (NOTIFICATIONS_SERVICE client)
│
└─ AuthModule (@thallesp/nestjs-better-auth)
    ├─ DatabaseModule (Prisma adapter)
    └─ ConfigModule
```

### `apps/api` Module Graph

```text
AppModule
├─ SharedModule.register()
│   └─ (same as above)
│
├─ ClientsModule (AUTH_SERVICE client)
│
├─ APP_GUARD: MicroserviceAuthGuard
│
└─ TRPCModule.forRoot({ basePath: '/api/trpc', context: AppContext })  ← nestjs-trpc-v2
    └─ AppRouter (@Router, @UseMiddlewares(LoggingTrpcMiddleware, AuthTrpcMiddleware))
```

### `apps/cron` Module Graph

```text
AppModule
├─ SharedModule.register({ validate: cronEnvSchema.parse, metrics: { appName: 'cron' } })
│   └─ (same as apps/auth above)
│
└─ ScheduleModule.forRoot()      ← @nestjs/schedule
    └─ ExampleCronService (@Cron(CronExpression.EVERY_HOUR))
```

No `ClientsModule`, no `APP_GUARD` override, no Redis microservice connection.

### `apps/notifications` Module Graph

```text
AppModule
├─ SharedModule.register()
│   └─ (same as above)
│
└─ QueueModule.registerQueues([QUEUES.EMAIL])
    └─ BullModule (@nestjs/bullmq) — email-queue → Redis
```

### `apps/worker` Module Graph

```text
AppModule
├─ SharedModule.register()
│   └─ (same as above)
│
├─ QueueModule.registerQueues([QUEUES.EMAIL])
│   └─ BullModule (@nestjs/bullmq) — email-queue → Redis
│       EmailConsumer extends WorkerHost (@Processor)
│
└─ MailModule.forRootAsync({ provider: 'brevo', ... })
    └─ Brevo SDK (HTTP → external)
```

---

## Database Schema Dependencies

```
packages/database/prisma/auth.prisma
  User ─── Session (1:N, cascade delete)
  User ─── Account (1:N, cascade delete)
  User ─── TwoFactor (1:N, cascade delete)
  Verification (standalone — identifier + value + expiresAt)
```

`packages/database/prisma/schema.prisma` contains only the generator and datasource. Application-domain models are added here as the app grows.
