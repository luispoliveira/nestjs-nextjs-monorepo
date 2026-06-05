# ARCHITECTURE_OVERVIEW.md — NestJS + Next.js Monorepo

Detailed architectural description covering service topology, module structure, async communication, and integrations.

---

## High-Level Topology

```text
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│                                                                 │
│                   ┌─────────────────┐                          │
│                   │   apps/web      │  Next.js 16 (App Router) │
│                   │  :3000 (web)    │  Tailwind v4 + shadcn/ui │
│                   └────────┬────────┘                          │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTP / tRPC / better-auth client
┌────────────────────────────┼────────────────────────────────────┐
│                      API LAYER                                  │
│                             │                                   │
│           ┌─────────────────┼──────────────┐                   │
│           │                 │              │                   │
│    ┌──────▼──────┐  ┌───────▼──────┐      │                   │
│    │  apps/auth  │  │   apps/api   │      │                   │
│    │  :3001      │  │   :3002      │      │                   │
│    │ better-auth │  │ tRPC router  │      │                   │
│    │ REST+µsvc   │  │ µsvc client  │      │                   │
│    └──────┬──────┘  └──────────────┘      │                   │
└───────────┼────────────────────────────────┘
            │ Redis Pub/Sub + Message Patterns
┌───────────┼────────────────────────────────────────────────────┐
│           │          ASYNC LAYER                               │
│    ┌──────▼───────────────┐                                    │
│    │    Redis              │  Transport + Queue                 │
│    └──────┬──────┬────────┘                                    │
│           │      │                                             │
│    ┌──────▼──┐  ┌▼──────────────────┐                         │
│    │  apps/  │  │  apps/worker      │                         │
│    │  notif- │  │  :3003            │                         │
│    │  ications│  │  BullMQ consumer  │                         │
│    │  :3004  │  │  @Processor(EMAIL)│                         │
│    └─────────┘  └──────────────────┘                          │
└────────────────────────────────────────────────────────────────┘
            │
┌───────────┼────────────────────────────────────────────────────┐
│           │        PERSISTENCE LAYER                           │
│   ┌───────▼──────┐  ┌───────────────┐  ┌──────────────┐      │
│   │  PostgreSQL  │  │    MongoDB    │  │    Redis     │      │
│   │  (Prisma 7   │  │  (Mongoose)   │  │  (ioredis)   │      │
│   │  + PrismaPg) │  │  Logs/Audit   │  │  Cache/Queue │      │
│   └──────────────┘  └───────────────┘  └──────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

---

## Service Responsibilities

| Service | Port | Role | Transport |
| --- | --- | --- | --- |
| `apps/auth` | 3001 | Auth, session, user lifecycle | REST + Redis µsvc |
| `apps/api` | 3002 | tRPC API gateway | REST + Redis µsvc client |
| `apps/notifications` | 3004 | Event → queue bridge | Redis µsvc listener |
| `apps/worker` | 3003 | Email job processor | BullMQ consumer (Redis) |
| `apps/web` | 3000 | Next.js frontend | HTTP client |

---

## Module Architecture (NestJS)

Every NestJS app follows this module composition:

```text
AppModule
├── SharedModule.register()   ← @Global(), must be first
│   ├── ConfigModule          (env vars, isGlobal)
│   ├── DatabaseModule        (Prisma, PrismaPg adapter)
│   ├── TerminusModule        (health checks)
│   ├── MongoModule           (audit logs)
│   ├── LoggerModule          (pino)
│   ├── ThrottlerModule       (10 req/60s per IP)
│   ├── ClsModule             (correlation IDs)
│   ├── AllExceptionFilter    (APP_FILTER)
│   ├── LoggingInterceptor    (APP_INTERCEPTOR, logs to MongoDB)
│   ├── CorrelationInterceptor(APP_INTERCEPTOR)
│   ├── ZodValidationPipe     (APP_PIPE)
│   ├── ZodSerializerInterceptor (APP_INTERCEPTOR)
│   └── HealthController      (GET /health/live, /health/ready)
│
└── Feature Modules           (app-specific)
    ├── ClientsModule          (Redis microservice clients)
    ├── QueueModule            (BullMQ queues, app-specific)
    └── ...
```

---

## Authentication Flow

```text
Client Request
     │
     ▼
AuthGuard (APP_GUARD, global in auth app)
     │
     ├─ @Public() decorator? → skip guard
     │
     ▼
better-auth.getSession()
     │
     ├─ Cookie: better-auth.session_token
     ├─ Header: Authorization: Bearer <token>
     │
     ▼
Session validated → request.user populated
     │
     ▼
@CurrentUser() decorator extracts user
```

### Cross-service auth (microservices)

```text
Microservice Request (e.g. api → auth)
     │
     ▼
MicroserviceAuthGuard (in api/notifications)
     │
     ▼
Redis message: AUTH_AUTHENTICATE { token }
     │
     ▼
auth/AuthController.authenticate()
     │
     ├─ betterAuth.api.getSession()
     ├─ Validates cookie + bearer token
     │
     └─ Returns user | throws RpcException(401)
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
         │ Bull email-queue
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

| Event Pattern | Trigger | Job Enqueued |
| --- | --- | --- |
| `user:created` | New registration | `SEND_WELCOME_EMAIL` |
| `user:password_reset_requested` | Password reset flow | `SEND_PASSWORD_RESET_EMAIL` |
| `user:password_changed` | Password changed | `SEND_PASSWORD_CHANGED_EMAIL` |
| `user:email_verification_requested` | Email verification | `SEND_EMAIL_VERIFICATION_EMAIL` |
| `user:two_factor_enabled` | 2FA enabled | `SEND_TWO_FACTOR_ENABLED_EMAIL` |
| `user:two_factor_disabled` | 2FA disabled | `SEND_TWO_FACTOR_DISABLED_EMAIL` |

---

## tRPC Architecture

```text
apps/web (Next.js)
  TrpcProvider (root layout)
    └─ httpBatchLink → /api/auth/trpc
         │
         ▼
apps/api (or apps/auth)
  TrpcModule.register(filePath, '/trpc')
    └─ AppRouter (nestjs-trpc-v2)
         ├─ @Router({ alias: 'users' }) UsersRouter
         ├─ @Router({ alias: 'admin' }) AdminRouter
         └─ ...extends BaseRouter
              └─ MicroserviceAuthTrpcMiddleware (validates session)

packages/trpc
  └─ AppRouter type (auto-generated, imported by web)
```

---

## Database Architecture

### PostgreSQL (primary — via Prisma 7)

- Driver: `PrismaPg` (connection pooler compatible)
- Generated client: `packages/database/generated/prisma/`
- Schema split:
  - `schema.prisma` — app models (add your models here)
  - `auth.prisma` — better-auth managed models (User, Session, Account, TwoFactor, Verification)
- Soft deletes: add `deletedAt DateTime?` + filter `deletedAt: null`

### MongoDB (logs/audit only)

- `Log` schema — HTTP request/response (30-day TTL)
- `EmailLog` schema — Email delivery records (30-day TTL)
- Never store business data here; never inject Mongoose models in feature code

### Redis

- **Microservice transport**: Redis Pub/Sub for event and message patterns
- **BullMQ queue**: `email-queue` with retry (3 attempts, exponential backoff from 2s)
- **Cache**: available for feature use

---

## Cross-Cutting Concerns

| Concern | Implementation | Location |
| --- | --- | --- |
| Validation | Zod v4 + `nestjs-zod` | Global `ZodValidationPipe` |
| Serialization | `ZodSerializerInterceptor` | Global |
| Error handling | `AllExceptionFilter` | Global, returns standardized JSON |
| Logging | `nestjs-pino` (JSON prod, pretty dev) | Global `LoggingInterceptor` |
| Correlation IDs | `nestjs-cls` | Auto-threaded through `ClsModule` |
| Rate limiting | `nestjs-throttler` | 10 req/60s per IP (configurable) |
| Health checks | `@nestjs/terminus` | `GET /health/live`, `/health/ready` |
| Secrets sanitization | `SanitizeUtil` | Applied in logging interceptor |

---

## Deployment

- **Docker Compose**: `docker-compose.yml` starts Postgres, MongoDB, Redis
- **PM2**: `DEPLOY-PM2.md` for process management in production
- **Turborepo**: task pipeline for build, test, lint with caching
