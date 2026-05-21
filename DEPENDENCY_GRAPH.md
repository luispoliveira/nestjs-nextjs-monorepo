# DEPENDENCY_GRAPH.md — NestJS + Next.js Monorepo

Module and package dependency map. Arrows indicate "depends on" direction.

---

## Package Dependency Graph

```
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
  ├─→ @repo/shared         (SharedModule, TrpcModule, MicroserviceUtil)
  ├─→ @repo/database       (DatabaseService)                         │
  └─→ @repo/shared-types   (schemas, RoleEnum)                      │
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

## Internal Package Dependencies

```
@repo/shared
  ├─→ @repo/database       (DatabaseModule imported in SharedModule)
  └─→ (no other internal deps)

@repo/database
  └─→ (no internal deps — only Prisma + PrismaPg)

@repo/shared-types
  └─→ (no internal deps — only zod)

@repo/trpc
  └─→ (type-only, auto-generated — no runtime deps)

@repo/mail
  └─→ (no internal deps — only Brevo SDK)
```

---

## NestJS Module Dependencies (per app)

### `apps/auth` Module Graph

```
AppModule
├─ SharedModule.register()
│   ├─ ConfigModule
│   ├─ DatabaseModule ──→ @repo/database
│   ├─ TerminusModule
│   ├─ MongoModule
│   ├─ LoggerModule (pino)
│   ├─ ThrottlerModule
│   └─ ClsModule
│
├─ ClientsModule (NOTIFICATIONS_SERVICE client)
│
└─ AuthModule (@thallesp/nestjs-better-auth)
    ├─ DatabaseModule (Prisma adapter)
    └─ ConfigModule
```

### `apps/api` Module Graph

```
AppModule
├─ SharedModule.register()
│   └─ (same as above)
│
├─ ClientsModule (AUTH_SERVICE client)
│
└─ TrpcModule.register()
    └─ AppRouter
        ├─ UsersRouter extends BaseRouter
        └─ AdminRouter extends BaseRouter
```

### `apps/notifications` Module Graph

```
AppModule
├─ SharedModule.register()
│   └─ (same as above)
│
└─ QueueModule.registerQueues([QUEUES.EMAIL])
    └─ BullModule (email-queue → Redis)
```

### `apps/worker` Module Graph

```
AppModule
├─ SharedModule.register()
│   └─ (same as above)
│
├─ QueueModule.registerQueues([QUEUES.EMAIL])
│   └─ BullModule (email-queue → Redis)
│
└─ MailModule.forRootAsync({ provider: 'brevo', ... })
    └─ Brevo SDK (HTTP → external)
```

---

## Runtime Communication Dependencies

```
apps/web
  │  HTTP / Cookie
  ▼
apps/auth   ◄──── Redis ────► apps/notifications
    │                               │
    │ Redis                         │ Bull (Redis)
    ▼                               ▼
(broadcasts events)           apps/worker
                                    │
                                    │ HTTP (Brevo API)
                                    ▼
                               Email Delivery

apps/api ◄─── Redis ──── apps/auth
  (AUTH_AUTHENTICATE message pattern)
```

---

## External Dependencies

| Package | Used By | Purpose |
|---------|---------|---------|
| `better-auth` | auth | Auth engine (sessions, OAuth, 2FA, admin) |
| `@better-auth/prisma-adapter` | auth | Prisma database adapter for better-auth |
| `@thallesp/nestjs-better-auth` | auth | NestJS integration for better-auth |
| `@nestjs/bull` | notifications, worker | Bull v4 queue management |
| `bull` | notifications, worker | Redis-based job queue (v4) |
| `nestjs-pino` | all NestJS | Structured logging |
| `nestjs-cls` | all NestJS | Continuation-local storage (correlation IDs) |
| `nestjs-zod` | all NestJS | Zod validation + serialization pipes |
| `nestjs-trpc-v2` | api | tRPC integration for NestJS |
| `@nestjs/terminus` | all NestJS | Health check endpoints |
| `@nestjs/throttler` | all NestJS | Rate limiting |
| `prisma` | database | ORM + migration tool |
| `@prisma/adapter-pg` | database | PrismaPg driver adapter |
| `mongoose` | shared | MongoDB ODM (logs/audit only) |
| `zod` | all | Schema validation (v4) |
| `next` | web | React framework (v16, App Router) |
| `next-themes` | web | Theme switching |
| `sonner` | web | Toast notifications |
| `react-hook-form` | web | Form state management |

---

## Dependency Rules

1. Apps MUST NOT import from other apps — communicate only via Redis events/messages
2. Apps CAN import from any `packages/` library
3. `@repo/shared` CAN import from `@repo/database` (it provides `DatabaseModule`)
4. `@repo/shared-types` MUST have zero internal dependencies (shared with frontend)
5. `@repo/trpc` is type-only — no runtime code imported by apps
6. `apps/worker` is the ONLY consumer of `@repo/mail`
7. MongoDB is ONLY used via `@repo/shared/mongo` — never imported in feature code
