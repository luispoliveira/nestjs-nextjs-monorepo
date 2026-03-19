---
description: 'Use when modifying Prisma schema, writing database migrations, seeding data, or working with DatabaseModule and DatabaseService. Covers Prisma conventions, schema organization, seeder patterns, and MongoDB logging models.'
applyTo: 'packages/database/**'
---

# Database Conventions

## Prisma Setup

- **ORM**: Prisma 7 with `prisma-client` generator
- **Driver adapter**: `PrismaPg` (not the default TCP connection) — `DatabaseService` wraps `PrismaClient` using the `PrismaPg` adapter with `DATABASE_URL` from `ConfigService`
- **Generated client output**: `packages/database/generated/prisma/` (imported as `@repo/database/generated/prisma` or via the root `@repo/database` barrel)
- **Module format**: `cjs`
- **Primary datasource**: PostgreSQL
- **Secondary**: MongoDB via `MongoModule` in `@repo/shared` (used for logs/audit only — do not store business data there)

## Schema Organization

Prisma schemas are split by domain under `packages/database/prisma/`:

- `schema.prisma` — generator config + datasource + all custom application models
- `auth.prisma` — better-auth managed models: `User`, `Session`, `Account`, `TwoFactor`, `Verification`

> **Do not modify `auth.prisma`** — those models are owned by `better-auth`. Adding fields requires using better-auth's extension API, not direct schema edits.

When adding new models, place them in `schema.prisma` or create a new domain-scoped file (e.g., `bookings.prisma`). Always run `pnpm db:migrate` after schema changes.

## Model Conventions

- Model names: PascalCase singular (`User`, `BlogPost`)
- Table names: snake_case via `@@map("table_name")`
- Always include `id`, `createdAt`, `updatedAt` on every application model
- Prefer soft deletes: add `deletedAt DateTime?` and filter it out in queries
- Use `@@index` for all foreign keys and frequently-queried fields
- Use `String @id @default(cuid())` for new models (consistent with auth models)

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

> **Note**: `baseEntitySchema` in `@repo/shared-types` uses `id: z.number().int().positive()` — this is a Zod schema for API payloads/validation and may differ from the Prisma model's ID type. The DB model is the source of truth for persistence.

## DatabaseService

`DatabaseService` extends `PrismaClient` and implements `OnModuleInit` / `OnModuleDestroy`. It is provided and exported by `DatabaseModule` (which is `@Global()`). Since `SharedModule.register()` imports `DatabaseModule`, it is available everywhere in any app that imports `SharedModule`.

Inject `DatabaseService` directly — do not inject `PrismaClient`:

```typescript
import { DatabaseService } from '@repo/database';

@Injectable()
export class UserRepository {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string) {
    return this.db.user.findUnique({ where: { id, deletedAt: null } });
  }

  async findAll(skip: number, take: number) {
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({ where: { deletedAt: null }, skip, take }),
      this.db.user.count({ where: { deletedAt: null } }),
    ]);
    return { items, total };
  }
}
```

## Pagination

Use `PaginatedUtil.getPaginatedResponse(items, total, skip, take)` from `@repo/shared` to build paginated responses. The `paginationSchema` from `@repo/shared-types` provides validated `skip`, `take`, `sortBy`, `sortOrder` parameters (max `take: 100`, default `take: 20`).

```typescript
import { PaginatedUtil } from '@repo/shared';
import { paginationSchema } from '@repo/shared-types';
import { createZodDto } from 'nestjs-zod';

export class PaginationDto extends createZodDto(paginationSchema) {}

// In service:
const { skip, take } = dto;
const [items, total] = await this.db.$transaction([...]);
return PaginatedUtil.getPaginatedResponse(items, total, skip, take);
```

## DatabaseModule

```typescript
// DatabaseModule is global — no need to import in feature modules.
// Just import SharedModule.register() in the app root module.
// Access DatabaseService via injection anywhere.
```

If you need `DatabaseModule` outside an app that uses `SharedModule` (e.g., a standalone script), import it directly:

```typescript
import { DatabaseModule } from '@repo/database';
```

## Migrations

- Always use named migrations: `pnpm db:migrate` (runs `prisma migrate dev`)
- Migration names must be descriptive: `add_post_soft_delete`, `create_booking_table`
- **Never use `db push`** in production; only for local rapid iteration during development
- After generating the client (`pnpm db:generate`), commit the generated files if they changed

## Seeders

Seeders live in `packages/database/src/seeders/`. Each seeder must implement the `DatabaseSeeder` interface and be registered in `DatabaseSeederService`.

```typescript
// packages/database/src/seeders/my-entity.seeder.ts
import { DatabaseSeeder } from '../database-seeder.interface';
import { DatabaseService } from '../database.service';

export class MyEntitySeeder implements DatabaseSeeder {
  async seed(db: DatabaseService): Promise<void> {
    await db.myModel.createMany({
      data: [...],
      skipDuplicates: true,
    });
  }
}
```

Register the seeder in `DatabaseSeederService.onModuleInit()`. Run with `pnpm db:seed`.

## MongoDB (Logs & Audit Only)

MongoDB is used exclusively through `MongoModule` (in `@repo/shared`) for structured logs:

- **`Log`** schema — HTTP request/response logs (method, url, headers, body, statusCode, duration, user, ip, correlationId). TTL: 30 days.
- **`EmailLog`** schema — email delivery audit (from, to, subject, templateId, params, correlationId). TTL: 30 days.

Use `MongoService` (from `@repo/shared`) to write logs — do not use Mongoose models directly for business features.
