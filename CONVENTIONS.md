# CONVENTIONS.md — NestJS + Next.js Monorepo

Coding standards, patterns, and rules enforced across this monorepo. Follow these to stay consistent.

---

## Non-Negotiable Rules

1. **Use `pnpm` exclusively** — never `npm` or `yarn`
2. **Auth via `better-auth` only** — never add Passport strategies or custom JWT logic
3. **Queues via `@nestjs/bull` (Bull v4)** — never import from `bullmq`
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
import { SERVICES, QUEUES, EVENT_PATTERNS, MESSAGE_PATTERNS, JOB_PATTERNS } from '@repo/shared';

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
const CreateUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'user']),
}).meta({ id: 'CreateUser' });  // .meta() for OpenAPI ID

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
class EmailProducer extends BaseProducer {
  async sendWelcome(data: WelcomeEmailData) {
    return this.add(JOB_PATTERNS.SEND_WELCOME_EMAIL, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: 500,
    });
  }
}

// Consumer — @Processor + @Process
@Processor(QUEUES.EMAIL)
export class EmailConsumer {
  @Process(JOB_PATTERNS.SEND_WELCOME_EMAIL)
  async sendWelcomeEmail(job: Job<WelcomeEmailData>) { ... }
}
```

### Authentication Decorators

```typescript
@Public()              // Bypass AuthGuard
@CurrentUser()         // Extract request.user
@Roles(RoleEnum.ADMIN) // Role-based access (if implemented)
```

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
import { CreateUserSchema } from '@repo/shared-types';  // Reuse when possible
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

```
feat(auth): add google oauth social provider

Enables users to sign in with Google credentials via better-auth's
built-in social provider integration.

Refs: #42
```

---

## File and Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | `kebab-case.ts` | `email-producer.ts` |
| Classes | `PascalCase` | `EmailProducer` |
| Interfaces | `PascalCase` | `AppContext` |
| Constants | `UPPER_SNAKE_CASE` | `QUEUES.EMAIL` |
| Env vars | `UPPER_SNAKE_CASE` | `DATABASE_URL` |
| Prisma models | `PascalCase` | `User`, `Post` |
| DB tables | `snake_case` | `@@map("user")` |
| tRPC procedures | `camelCase` | `getUsers`, `createUser` |
| Files per module | Max 500 lines | Split into sub-files if larger |

---

## Security Conventions

- **Never commit** `.env` files, secrets, or credentials
- **Validate at system boundaries** only (HTTP layer, external API responses)
- **Sanitize** sensitive fields in logs via `SanitizeUtil` (auto-applied by `LoggingInterceptor`)
- **Throttle** all public endpoints (ThrottlerModule, 10 req/60s default)
- **Helmet** enabled on all HTTP apps via `BootstrapUtil.setup({ useHelmet: true })`
- **CORS** configured per app via `BootstrapUtil.setup({ cors: { origin: ... } })`
- Cookie names: `better-auth.session_token` (HTTP) + `__Secure-better-auth.session_token` (HTTPS)
