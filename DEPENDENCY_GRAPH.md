# DEPENDENCY_GRAPH.md — NestJS + Next.js Monorepo

Package dependencies, module imports, and cross-service communication map.
Arrows indicate "depends on" direction.

See also: [PROJECT_MAP.md](PROJECT_MAP.md) | [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | [ENTRYPOINTS.md](ENTRYPOINTS.md)

---

## Internal Package Dependency Graph

```
apps/api ──────────────► @repo/shared
apps/api ──────────────► @repo/shared-types
apps/api ──────────────► @repo/trpc
apps/api ──────────────► @repo/database       (via SharedModule → DatabaseModule)

apps/auth ─────────────► @repo/shared
apps/auth ─────────────► @repo/shared-types
apps/auth ─────────────► @repo/database
apps/auth (test only) ─► @repo/testing-utils

apps/notifications ────► @repo/shared
apps/notifications ────► @repo/shared-types
apps/notifications (test only) ─► @repo/testing-utils

apps/worker ───────────► @repo/shared
apps/worker ───────────► @repo/shared-types
apps/worker ───────────► @repo/database       (via SharedModule → DatabaseModule)
apps/worker ───────────► @repo/mail
apps/worker (test only) ──────► @repo/testing-utils

apps/web ──────────────► @repo/shared-types
apps/web ──────────────► @repo/trpc

@repo/shared ──────────► @repo/database
@repo/mail ────────────► @repo/shared         (MongoModule for EmailLog)
@repo/testing-utils ───► @repo/database       (PrismaClient for factories/helpers)
@repo/trpc ────────────► (generated type, no runtime dep)
```

**Rule:** `@repo/shared-types` and `@repo/trpc` have no runtime NestJS dependencies — they are safe to import in Next.js.

**Rule:** `@repo/testing-utils` is `private: true` and must only be imported in test files — never in application source code.

---

## Cross-Service Communication

```
apps/api ──[Redis send: auth:authenticate]──────────────────► apps/auth
apps/api ──[Redis send: dlq:list|replay|purge]──────────────► apps/worker

apps/auth ──[Redis emit: user:*]────────────────────────────► apps/notifications
apps/notifications ──[BullMQ: email-queue]──────────────────► apps/worker
apps/worker ──[BullMQ: email-queue-dlq]────────────────────── (self — DLQ)

apps/web ──[HTTP proxy /api/auth/**]────────────────────────► apps/auth
apps/web ──[HTTP tRPC /api/trpc/**]─────────────────────────► apps/api
apps/web ──[HTTP /api/auth/trpc/**]─────────────────────────► apps/auth
```

---

## NestJS Module Imports per App

### `apps/api`

| Module                                                                      | Source                            |
| --------------------------------------------------------------------------- | --------------------------------- |
| `SharedModule.register({ metrics: { appName: 'api' }, throttlerRedisUrl })` | `@repo/shared`                    |
| `ClientsModule` with `registerAuthService()`                                | `@repo/shared` (MicroserviceUtil) |
| `TRPCModule.forRoot({ basePath: '/api/trpc', context: AppContext })`        | `nestjs-trpc-v2`                  |

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
| `@nestjs/bullmq`                    | `^11`                      | BullMQ integration               |
| `@nestjs/terminus`                  | `^11`                      | Health checks                    |
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
| `@sentry/nestjs`                    | via shared                 | Error tracking                   |
| `zod`                               | `~4.3.6` (pinned globally) | Validation schemas               |

**Dev / test dependencies** (apps + `packages/shared`, `packages/mail`, `packages/database`):

| Package              | Role                                                         |
| -------------------- | ------------------------------------------------------------ |
| `jest`               | Test runner                                                  |
| `ts-jest`            | TypeScript transform for Jest — uses `tsconfig.test.json`   |
| `@nestjs/testing`    | `Test.createTestingModule` for unit and integration tests    |
| `@types/jest`        | TypeScript types for Jest globals                            |

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

## `packages/testing-utils` Structure

```
@repo/testing-utils  (private — test files only)
├── factories/
│   ├── createUser(db, overrides?)   ← inserts User + Account (credential); exports TEST_PASSWORD
│   └── createSession(db, userId, overrides?) ← inserts Session (expires +24 h)
└── helpers/
    └── truncateDatabase(db)         ← DELETE verification, user (cascade: session, account, twoFactor)
```

Runtime dependencies: `@repo/database` (PrismaClient types).
Dev/peer dependencies: `@faker-js/faker ^9`, `@prisma/client ^7`.

---

## `packages/shared-types` Structure

```
@repo/shared-types
├── enums/
│   ├── RoleEnum             ← 'admin' | 'user'
│   └── EnvironmentEnum      ← 'development' | 'production' | ...
└── schemas/
    ├── baseEntitySchema     ← id, createdAt, updatedAt, deletedAt, audit fields
    ├── paginationSchema     ← skip, take (max 100), sortBy, sortOrder
    ├── createUserSchema     ← name, email, role
    └── editRoleSchema       ← role
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
