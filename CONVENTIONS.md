# CONVENTIONS.md — NestJS + Next.js Monorepo

Coding standards, patterns, and rules enforced across this monorepo. Follow these to stay consistent.

---

## Non-Negotiable Rules

1. **Use `pnpm` exclusively** — never `npm` or `yarn`
2. **Auth via `better-auth` only** — never add Passport strategies or custom JWT logic
3. **Queues via `@nestjs/bullmq` + `bullmq`** — never import from `@nestjs/bull` or `bull`
4. **Validation via Zod v4** — use `z.email()`, not `z.string().email()`
5. **Never hardcode tokens, queue names, or patterns** — always import from `@repo/shared`
6. **`process.env` only in `main.ts`** — everywhere else use `ConfigService.getOrThrow()`

---

## NestJS Conventions

### Module Structure

```typescript
// Every app module starts with SharedModule.register() — always first
@Module({
  imports: [
    SharedModule.register(),     // MUST be first, provides global infra
    ClientsModule.registerAsync([...]),
    FeatureModule,
  ],
})
export class AppModule {}
```

### Dependency Injection Tokens

```typescript
// Always import from @repo/shared — never inline strings
import { SERVICES, QUEUES, EVENT_PATTERNS, MESSAGE_PATTERNS, JOB_PATTERNS, THROTTLE_TIERS } from '@repo/shared';

// Use as injection tokens
@InjectQueue(QUEUES.EMAIL) private emailQueue: Queue

// Use as message patterns
@MessagePattern(MESSAGE_PATTERNS.AUTH_AUTHENTICATE)
@EventPattern(EVENT_PATTERNS.USER_CREATED)
```

### Validation (Zod v4 + nestjs-zod)

```typescript
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

// Zod v4 APIs: z.email() not z.string().email()
const CreateUserSchema = z
  .object({
    email: z.email(),
    name: z.string().min(1),
    role: z.enum(['admin', 'user']),
  })
  .meta({ id: 'CreateUser' }); // .meta() for OpenAPI ID

export class CreateUserDto extends createZodDto(CreateUserSchema) {}

// ZodValidationPipe and ZodSerializerInterceptor are global — do NOT register manually
```

### DTOs and Schemas

- Prefer schemas from `@repo/shared-types` when shared with the frontend
- Use `.meta({ id: 'SchemaName' })` on every top-level schema for Swagger/OpenAPI
- `baseEntitySchema` in `@repo/shared-types` is for API payload shapes, not DB types

### Controllers and Services

```typescript
// Use NestJS Logger (backed by pino)
private readonly logger = new Logger(MyService.name);

// Inject DatabaseService — never PrismaClient directly
constructor(private readonly db: DatabaseService) {}

// ConfigService.getOrThrow() for required env vars
constructor(private readonly config: ConfigService) {
  const url = config.getOrThrow<string>('DATABASE_URL');
}
```

### Microservice Clients

```typescript
// Register clients using MicroserviceUtil helpers
ClientsModule.registerAsync([
  MicroserviceUtil.registerAuthService(),
  MicroserviceUtil.registerNotificationsService(),
])

// Inject using SERVICES tokens
@Inject(SERVICES.NOTIFICATIONS) private notificationsClient: ClientProxy
```

### Publishers

```typescript
// Extend BasePublisher — correlation IDs propagate automatically
class MyPublisher extends BasePublisher {
  publishUserCreated(user: User) {
    return this.emit(EVENT_PATTERNS.USER_CREATED, { user });
  }
}

// Prefer pre-built NotificationsPublisher from @repo/shared
```

### Queue Producers and Consumers

```typescript
// Producer — extend BaseProducer (injects correlation ID into job data)
// Queue and @InjectQueue come from 'bullmq' / '@nestjs/bullmq'
class EmailProducer extends BaseProducer {
  constructor(
    @InjectQueue(QUEUES.EMAIL) queue: Queue, // Queue from 'bullmq'
    protected clsService: ClsService,
  ) {
    super(queue, clsService);
  }

  async sendWelcome(data: WelcomeEmailData) {
    return this.addJob(JOB_PATTERNS.SEND_WELCOME_EMAIL, data);
    // Default job options set globally in QueueModule:
    //   attempts: 3, backoff: exponential 2000ms,
    //   removeOnComplete: true, removeOnFail: 500
  }
}

// Consumer — extends WorkerHost, single process() with switch dispatch
@Processor(QUEUES.EMAIL)
export class EmailConsumer extends WorkerHost {
  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_PATTERNS.SEND_WELCOME_EMAIL:
        return this.sendWelcomeEmail(job);
      default:
        this.logger.warn(`No handler for job ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    // Error handling (e.g. Sentry capture)
  }
}
```

`QueueModule` registers queues with `BullModule.forRootAsync({ connection: { host, port, password } })` — `connection:` not `redis:`.
`QueueModule.registerQueues([QUEUES.EMAIL])` is called in each app that needs to produce or consume from the queue.

### Authentication Decorators

```typescript
@Public()              // Bypass AuthGuard
@CurrentUser()         // Extract request.user
@Roles(RoleEnum.ADMIN) // Role-based access (if implemented)
@RateLimit('default')  // Per-user throttle: 60 req/60s; apply at class or method level
@RateLimit('strict')   // Per-user throttle: 10 req/60s
```

`@RateLimit(tier)` is a composite decorator that applies `CustomThrottlerGuard` (keys on `user:{id}` when authenticated, falls back to `ip:{ip}`) and `@Throttle` with the matching tier from `THROTTLE_TIERS`. Import from `@repo/shared`.

### Error Handling

```typescript
// Throw standard NestJS HTTP exceptions
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid input');
// ZodValidationException → 422 Unprocessable Entity

// In microservices
throw new RpcException({ status: 401, message: 'Unauthorized' });
```

### Pagination

```typescript
import { PaginatedUtil } from '@repo/shared';
import { paginationSchema } from '@repo/shared-types';

// paginationSchema validates { skip, take } — take max 100, default 20
const { skip, take } = paginationSchema.parse(query);
const [items, total] = await Promise.all([
  this.db.user.findMany({ skip, take, where: { deletedAt: null } }),
  this.db.user.count({ where: { deletedAt: null } }),
]);
return PaginatedUtil.getPaginatedResponse(items, total, skip, take);
```

---

## Database Conventions

### Prisma Models

```prisma
model Post {
  id        String    @id @default(cuid())   // Always cuid()
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?                         // Soft delete pattern

  title    String
  authorId String
  author   User   @relation(fields: [authorId], references: [id])

  @@index([authorId])                         // Index every FK
  @@map("post")                               // snake_case table name
}
```

Rules:

- PascalCase model names, `snake_case` table via `@@map`
- Always `id` (cuid), `createdAt`, `updatedAt`
- Prefer soft deletes with `deletedAt DateTime?`
- `@@index` on every FK and frequently-queried column
- Never edit `auth.prisma` — managed by better-auth

### Migrations

```bash
pnpm db:migrate   # prisma migrate dev --name descriptive_snake_case_name
# Examples: add_post_soft_delete, create_booking_table
# Never use: prisma db push (except local rapid iteration)
```

---

## Next.js Conventions

### Component Defaults

- Default to **server components** — add `'use client'` only for hooks/events/browser APIs
- Auth checks and redirects belong in route-group `layout.tsx`, not middleware
- Use `cn()` from `@/lib/utils` for conditional classes
- Use `cva` for component variants
- Theme tokens: `bg-background`, `text-foreground` — avoid inline `style`

### Auth (Next.js)

```typescript
// Server component / server action
import { getServerSession } from '@/lib/auth/server';
const session = await getServerSession();
if (!session) redirect('/sign-in');

// Client component
import { authClient } from '@/lib/auth/client';
const { data: session } = authClient.useSession();
```

### Forms

```typescript
// React Hook Form + Zod v4 + shared schemas
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateUserSchema } from '@repo/shared-types'; // Reuse when possible
```

### shadcn/ui

- Use primitives from `components/ui/` — do NOT modify them in place
- Customize via composition and `cva` variants
- `generatePassword()` from `@/lib/utils` for secrets (uses `crypto.getRandomValues`)

---

## Commit Message Conventions

Format: `<type>(<scope>): <imperative summary>`

- Subject ≤ 50 chars (hard cap 72), lowercase after colon, no trailing period
- **Types**: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`
- **Scopes**: `auth`, `notifications`, `worker`, `web`, `api`, `database`, `shared`, `shared-types`, `mail`, `trpc`, `ci`, `docker`
- Breaking changes: append `!` + `BREAKING CHANGE:` footer
- Body explains **why**, not what; wrap at 72 chars
- No AI attribution lines, no first-person pronouns

```text
feat(auth): add google oauth social provider

Enables users to sign in with Google credentials via better-auth's
built-in social provider integration.

Refs: #42
```

---

## Git Flow

This monorepo follows the Git Flow branching model for release management using the `git-flow` CLI.

### Setup

```bash
# Initialise git-flow in the repo (accept all defaults — branch names match below)
git flow init -d
```

The `-d` flag accepts the defaults: `main` as production branch, `develop` as integration branch, and the standard prefixes (`feature/`, `release/`, `hotfix/`).

### Branch Topology

```text
main ─────────────────────────────────────── (production releases, tagged)
  └─ develop ────────────────────────────── (integration, always deployable)
       ├─ feature/<scope>-<description>     (new work, branched from develop)
       ├─ release/<version>                 (stabilisation, branched from develop)
       └─ hotfix/<scope>-<description>      (urgent prod fix, branched from main)
```

### Branch Types

| Branch      | Branches from | Merges into        | Purpose                                                 |
| ----------- | ------------- | ------------------ | ------------------------------------------------------- |
| `main`      | —             | —                  | Production-ready code; every commit is a release tag    |
| `develop`   | `main`        | —                  | Integration branch; reflects next release state         |
| `feature/*` | `develop`     | `develop`          | Isolated work for a single feature or change            |
| `release/*` | `develop`     | `main` + `develop` | Release stabilisation; only bug fixes and version bumps |
| `hotfix/*`  | `main`        | `main` + `develop` | Urgent patches to production                            |

### Branch Naming

Scope tokens must match the commit scopes already defined in this project: `auth`, `notifications`, `worker`, `web`, `api`, `database`, `shared`, `shared-types`, `mail`, `trpc`, `ci`, `docker`.

```text
feature/<scope>-<short-description>
release/<semver>
hotfix/<scope>-<short-description>
```

| Branch type | Example                                 |
| ----------- | --------------------------------------- |
| `feature/*` | `feature/auth-google-oauth`             |
| `feature/*` | `feature/web-user-profile-page`         |
| `feature/*` | `feature/database-add-post-soft-delete` |
| `release/*` | `release/1.2.0`                         |
| `hotfix/*`  | `hotfix/auth-session-cookie-expiry`     |
| `hotfix/*`  | `hotfix/web-csp-header`                 |

Rules:

- Use `kebab-case` throughout — no underscores, no uppercase
- Description should be short (2–4 words), imperative where possible
- Omit the scope token only when the change is truly cross-cutting (rare)

### Workflow: Feature

```bash
# Start — creates feature/auth-google-oauth from develop
git flow feature start auth-google-oauth

# Work, commit using Conventional Commits
git commit -m "feat(auth): add google oauth social provider"

# Publish to remote (opens PR targeting develop)
git flow feature publish auth-google-oauth

# Finish — merges into develop, deletes branch (after PR is merged)
git flow feature finish auth-google-oauth
```

### Workflow: Release

```bash
# Start — branches release/1.2.0 from develop
git flow release start 1.2.0

# Only bug fixes and version bumps on this branch
git commit -m "chore: bump version to 1.2.0"

# Publish for review
git flow release publish 1.2.0

# Finish — merges into main + develop, creates annotated tag v1.2.0, deletes branch
git flow release finish -m "release: v1.2.0" 1.2.0
git push origin main develop --tags
```

### Workflow: Hotfix

```bash
# Start — branches hotfix/auth-session-cookie-expiry from main
git flow hotfix start auth-session-cookie-expiry

# Fix, commit
git commit -m "fix(auth): correct session cookie expiry calculation"

# Finish — merges into main + develop, creates annotated tag, deletes branch
git flow hotfix finish -m "release: v1.2.1" auth-session-cookie-expiry
git push origin main develop --tags
```

### Release Tags

- Format: `v<MAJOR>.<MINOR>.<PATCH>` — strict [semver](https://semver.org/)
- Tags are applied only to commits on `main`
- `git flow release/hotfix finish` creates annotated tags automatically with the `-m` flag
- `MAJOR` bumps on breaking API changes (include `BREAKING CHANGE:` footer in commits)
- `MINOR` bumps on new backwards-compatible features
- `PATCH` bumps on bug fixes and hotfixes

### Protected Branch Rules

| Branch                               | Direct push               | Force push        | Delete      |
| ------------------------------------ | ------------------------- | ----------------- | ----------- |
| `main`                               | Blocked — PR only         | Never             | Never       |
| `develop`                            | Blocked — PR only         | Never             | Never       |
| `feature/*`, `release/*`, `hotfix/*` | Allowed for branch author | Allowed before PR | After merge |

PR requirements for `main` and `develop`:

- At least 1 approving review
- All CI checks passing (`pnpm build`, `pnpm lint`, `pnpm check-types`)
- No unresolved comments

---

## File and Naming Conventions

| Item             | Convention         | Example                        |
| ---------------- | ------------------ | ------------------------------ |
| Files            | `kebab-case.ts`    | `email-producer.ts`            |
| Classes          | `PascalCase`       | `EmailProducer`                |
| Interfaces       | `PascalCase`       | `AppContext`                   |
| Constants        | `UPPER_SNAKE_CASE` | `QUEUES.EMAIL`                 |
| Env vars         | `UPPER_SNAKE_CASE` | `DATABASE_URL`                 |
| Prisma models    | `PascalCase`       | `User`, `Post`                 |
| DB tables        | `snake_case`       | `@@map("user")`                |
| tRPC procedures  | `camelCase`        | `getUsers`, `createUser`       |
| Files per module | Max 500 lines      | Split into sub-files if larger |

---

## Security Conventions

- **Never commit** `.env` files, secrets, or credentials
- **Validate at system boundaries** only (HTTP layer, external API responses)
- **Sanitize** sensitive fields in logs via `SanitizeUtil` (auto-applied by `LoggingInterceptor`)
- **Throttle** endpoints with `@RateLimit(tier)` — `'default'` (60 req/60s) or `'strict'` (10 req/60s); keys on authenticated user ID, falls back to IP; pass `throttlerRedisUrl` to `SharedModule.register()` for distributed state
- **Helmet** enabled on all HTTP apps via `BootstrapUtil.setup({ useHelmet: true })`
- **CORS** configured per app via `BootstrapUtil.setup({ cors: { origin: ... } })`
- Cookie names: `better-auth.session_token` (HTTP) + `__Secure-better-auth.session_token` (HTTPS)
