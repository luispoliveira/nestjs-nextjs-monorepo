# CONVENTIONS.md — NestJS + Next.js Monorepo

Coding standards, patterns, and rules enforced across this monorepo.

See also: [PROJECT_MAP.md](PROJECT_MAP.md) | [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | [ENTRYPOINTS.md](ENTRYPOINTS.md)

---

## General Rules

- Use **pnpm** exclusively (never npm or yarn).
- Run all tasks via Turborepo: `pnpm build`, `pnpm lint`, `pnpm test`, etc.
- Keep files under 500 lines.
- `process.env` is readable only in `main.ts`. Everywhere else use `ConfigService.getOrThrow(...)`.
- Never hardcode queue names, service tokens, or event/job patterns — import from `@repo/shared/constants`.
- Never commit `.env` files, credentials, or secrets.

---

## Constants

All injection tokens, queue names, and message patterns live in `packages/shared/src/constants/` as `as const` objects.

| Export | File | Examples |
|---|---|---|
| `SERVICES` | `constants/services.ts` | `AUTH = 'AUTH_SERVICE'`, `NOTIFICATIONS = 'NOTIFICATIONS_SERVICE'` |
| `QUEUES` | `constants/queues.ts` | `EMAIL = 'email-queue'`, `EMAIL_DLQ = 'email-queue-dlq'` |
| `EVENT_PATTERNS` | `constants/events.ts` | `USER_CREATED`, `USER_PASSWORD_RESET_REQUESTED`, … |
| `MESSAGE_PATTERNS` | `constants/events.ts` | `AUTH_AUTHENTICATE`, `DLQ_LIST`, `DLQ_REPLAY`, `DLQ_PURGE` |
| `JOB_PATTERNS` | `constants/jobs.ts` | `SEND_WELCOME_EMAIL`, `SEND_PASSWORD_RESET_EMAIL`, … |
| `CLS_CORRELATION_ID` | `constants/cls.ts` | `'correlationId'` |
| `THROTTLE_TIERS` | `constants/throttler.ts` | `default: { limit: 60, ttl: 60_000 }`, `strict: { limit: 10, ttl: 60_000 }` |

---

## NestJS Conventions

### Module Bootstrap

Every `AppModule` must import `SharedModule.register()` first.

```typescript
@Module({
  imports: [
    SharedModule.register({ metrics: { appName: 'my-service' } }),
    // ... other imports
  ],
})
export class AppModule {}
```

`SharedModule.register` parameters:

| Param | Type | Default | Notes |
|---|---|---|---|
| `throttlerOptions.ttl` | `number` | `60000` | Milliseconds |
| `throttlerOptions.limit` | `number` | `10` | Requests per TTL |
| `throttlerRedisUrl` | `string?` | — | Enables Redis throttler storage |
| `metrics.appName` | `string?` | — | Added as `app` label on all Prometheus metrics |

### Validation (Zod v4)

- Build DTOs with `createZodDto` from `nestjs-zod`.
- Use **Zod v4 APIs**: `z.email()` (not `z.string().email()`), `z.url()`, `z.uuid()`.
- Use `.meta({ id: 'SchemaName' })` for OpenAPI IDs.
- `ZodValidationPipe` and `ZodSerializerInterceptor` are registered globally — do not add them manually.
- Prefer schemas from `@repo/shared-types` when shared with the frontend.

```typescript
const CreateUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  role: z.enum(RoleEnum),
}).meta({ id: 'CreateUser' });

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
```

### Authentication

- All routes are protected by default via the app-level `APP_GUARD`.
  - `apps/api`: `MicroserviceAuthGuard` (validates token via `AUTH_SERVICE` Redis call).
  - `apps/auth`: `AuthGuard` from `@thallesp/nestjs-better-auth`.
- Use `@Public()` from `@repo/shared/decorators` to exempt a route.
- Use `@CurrentUser()` to extract `request.user` in HTTP controllers.
- Never add Passport strategies or custom JWT logic.

### Rate Limiting

Use `@RateLimit(tier)` from `@repo/shared/decorators`. It applies `CustomThrottlerGuard` + the correct `Throttle` config.

```typescript
@RateLimit('default')   // 60 req / 60 s, keyed by user.id then IP
@RateLimit('strict')    // 10 req / 60 s
```

`CustomThrottlerGuard` tracks by `user.id` when authenticated, falls back to IP hash.

### Microservices (Redis)

- Inject service clients using `SERVICES` tokens.
- Register client providers with `MicroserviceUtil.registerAuthService()` or `MicroserviceUtil.registerNotificationsService()`.
- Fire-and-forget → `@EventPattern(EVENT_PATTERNS.*)`.
- Request/response → `@MessagePattern(MESSAGE_PATTERNS.*)`.
- Default transport options: `retryAttempts: 5`, `retryDelay: 3000`.

### Publishers

Extend `BasePublisher` (`packages/shared/src/abstracts/base.publisher.ts`). Correlation IDs are threaded automatically from `ClsService`.

Use the pre-built `NotificationsPublisher` from `@repo/shared/publishers` for all notification events.

### Queues (BullMQ)

- Do not install or import from legacy `bull` / `@nestjs/bull`. This project uses BullMQ (`@nestjs/bullmq`).
- Register queues in feature modules: `QueueModule.registerQueues([QUEUES.EMAIL])`. This registers both the main queue and its DLQ (`email-queue-dlq`) automatically.
- Producers: extend `BaseProducer` — it injects `correlationId` into job data. Use `EmailProducer` from `@repo/shared/queue` for email jobs.
- Consumers: `@Processor(QUEUES.EMAIL)` extending `WorkerHost`; single `process(job)` method that dispatches via `switch` on `job.name` (`JOB_PATTERNS.*`).
- DLQ routing: in `@OnWorkerEvent('failed')`, check `job.attemptsMade >= maxAttempts`; if so, call `dlqQueue.add(job.name, job.data, ...)`.
- Report failures with `SentryUtil.captureException()` and metrics.

Default job options (set in `QueueModule`):
- `attempts: 3`
- `backoff: { type: 'exponential', delay: 2000 }`
- `removeOnComplete: true`
- `removeOnFail: 500`

### Logging and Errors

- Use NestJS `Logger` (backed by pino). Never use `console.log` except in `main.ts` startup messages.
- `LoggingInterceptor` persists HTTP request/response to MongoDB. Skipped for `/health`, `/metrics`, `/favicon.ico`.
- `AllExceptionFilter` returns: `{ statusCode, timestamp, path, message, correlationId }`.
- Throw standard NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`, etc.). Zod validation errors → 422 via `ZodValidationException`.
- 5xx errors are automatically captured by Sentry via `AllExceptionFilter`.

### tRPC

- Mount with `TrpcModule.register(filePath, basePath)` from `@repo/shared/trpc`.
- Define routers extending `BaseRouter` (auto-applies `LoggingTrpcMiddleware`) and decorating with `@Router({ alias: '...' })`.
- `AuthTrpcMiddleware` in `apps/api` validates tokens via Redis call to `AUTH_SERVICE`.
- The `AppRouter` type regenerates into `packages/trpc/src/` (non-production only).

---

## Database Conventions

### Prisma Models

- PascalCase singular model names, `@@map` to snake_case table name.
- Every model must include: `id String @id @default(cuid())`, `createdAt`, `updatedAt`.
- Prefer soft deletes: add `deletedAt DateTime?` and filter `deletedAt: null` in queries.
- `@@index` on every FK and frequently-queried column.

```prisma
model Post {
  id        String    @id @default(cuid())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  title    String
  authorId String
  author   User   @relation(fields: [authorId], references: [id])

  @@index([authorId])
  @@map("post")
}
```

### Access

- Inject `DatabaseService` (never inject `PrismaClient` directly).
- `DatabaseService` is provided globally by `SharedModule` → `DatabaseModule`.
- For paginated responses: `PaginatedUtil.getPaginatedResponse(items, total, skip, take)` with `paginationSchema` from `@repo/shared-types` (`take` max 100, default 20).

### Migrations

- `pnpm db:migrate` — runs `prisma migrate dev`. Use descriptive names: `add_post_soft_delete`.
- Never use `prisma db push` outside local rapid iteration.
- Seeders implement `DatabaseSeeder` and register in `DatabaseSeederService.onModuleInit()`.

### MongoDB — Logs/Audit Only

- `MongoModule` provides `Log` and `EmailLog` schemas (30-day TTL).
- Write via `MongoService`. Never store business data in MongoDB.
- Never inject Mongoose models in feature code.

---

## Next.js Conventions

### Server vs Client Components

- Default to server components. Add `'use client'` only when hooks, events, or browser APIs are required.
- Auth checks and redirects belong in route-group `layout.tsx` (e.g., `(dashboard)/layout.tsx`), not middleware.

### Auth

```typescript
// Server component / server action
import { getServerSession } from '@/lib/auth/server';
const session = await getServerSession();
if (!session) redirect('/sign-in');

// Client component
import { authClient } from '@/lib/auth/client';
const { data: session } = authClient.useSession();
await authClient.signIn.email({ email, password });
```

- `getServerSession()` hits `AUTH_API_URL/api/auth/get-session` with forwarded cookies (5 s timeout).
- Role checks: `if (session.user.role !== RoleEnum.ADMIN) redirect('/dashboard')`.
- `RoleEnum` is imported from `@repo/shared-types`.
- Never write custom session or JWT logic.

### tRPC Client

- API tRPC client: `apiTrpc` in `lib/trpc/api.ts`, `httpBatchLink` to `/api/trpc`.
- Auth tRPC client: `trpc` in `lib/trpc/auth.ts`, `httpBatchLink` to `/api/auth/trpc`.
- `TrpcProvider` / `ApiTrpcProvider` are already in the root layout. Do not re-wrap.

### UI

- Use shadcn primitives from `components/ui/` — do not modify them in place.
- `cn()` from `@/lib/utils` for conditional class merging (`clsx` + `tailwind-merge`).
- `cva` for component variants.
- Theme tokens (`bg-background`, `text-foreground`, etc.) — avoid inline `style`.
- `generatePassword()` in `@/lib/utils` uses `crypto.getRandomValues` — prefer it over `Math.random()` for any secret/token material.

### Forms

- React Hook Form + `@hookform/resolvers/zod`.
- Reuse schemas from `@repo/shared-types` when the same shape is validated server-side.

---

## Commit Message Rules

Format: `<type>(<scope>): <imperative summary>` — ≤50 chars subject (hard cap 72), lowercase after colon, no trailing period.

| Type | When |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behaviour change) |
| `perf` | Performance improvement |
| `docs` | Documentation only |
| `test` | Test-only changes |
| `chore` | Build, tooling, maintenance |
| `build` | Build system changes |
| `ci` | CI configuration |
| `style` | Formatting only |
| `revert` | Revert a previous commit |

Scopes: `auth`, `notifications`, `worker`, `web`, `api`, `database`, `shared`, `shared-types`, `mail`, `trpc`, `ci`, `docker`.

Breaking changes: append `!` to the type+scope and add a `BREAKING CHANGE:` footer.

Body: explains **why**, not what. Wrap at 72 chars. Do not include AI attribution lines.

---

## Import Aliases

Internal packages use the `@repo/` prefix:

```typescript
import { DatabaseService } from '@repo/database';
import { SharedModule, QUEUES, SERVICES, EVENT_PATTERNS, JOB_PATTERNS } from '@repo/shared';
import { RoleEnum, paginationSchema } from '@repo/shared-types';
import type { AppRouter } from '@repo/trpc';
```

Next.js uses `@/` for app-local imports:

```typescript
import { authClient } from '@/lib/auth/client';
import { cn } from '@/lib/utils';
```
