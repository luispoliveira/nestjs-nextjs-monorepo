---
description: 'Use when modifying Prisma schema, writing database migrations, seeding data, or working with DatabaseModule and DatabaseService. Covers Prisma conventions, schema organization, and seeder patterns.'
applyTo: 'packages/database/**'
---

# Database Conventions

## Prisma Setup

- **ORM**: Prisma 7 with `prisma-client` generator
- **Generated client output**: `packages/database/generated/prisma/` (referenced as `@repo/database/generated/prisma`)
- **Module format**: `cjs`
- **Provider**: PostgreSQL (primary), MongoDB (secondary via `MongoModule` in shared)

## Schema Organization

Prisma schemas are split by domain under `packages/database/prisma/`:

- `schema.prisma` — application models (generator + datasource + app tables)
- `auth.prisma` — better-auth models (User, Session, Account, Verification, TwoFactor)

When adding new models, place them in the appropriate schema file or create a new one for a distinct domain. Apply migrations with `pnpm db:migrate`.

## Model Conventions

- Model names: PascalCase singular (`User`, `BlogPost`)
- Table names: snake_case via `@@map("table_name")`
- Always include `id`, `createdAt`, `updatedAt` on application models
- Prefer soft deletes: add `deletedAt DateTime?` and filter in queries
- Use `@@index` for foreign keys and frequently-queried fields

```prisma
model Post {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  title     String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])

  @@index([authorId])
  @@map("post")
}
```

## DatabaseModule / DatabaseService

Import `DatabaseModule` from `@repo/database` — it is re-exported by `SharedModule` so it's globally available in all NestJS apps. Inject `DatabaseService` to access the Prisma client.

```typescript
import { DatabaseService } from '@repo/database';

@Injectable()
export class UserRepository {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }
}
```

## Migrations

- Always use migrations for schema changes: `pnpm db:migrate`
- Never use `db push` in production (use only for local dev iteration)
- Migration names should be descriptive: `add_post_soft_delete`, `add_user_role_index`

## Seeders

Seeders live in `packages/database/src/seeders/`. Each seeder implements the `DatabaseSeeder` interface and is registered in `DatabaseSeederService`.

```typescript
export class MySeeder implements DatabaseSeeder {
  async seed(db: DatabaseService): Promise<void> {
    await db.myModel.createMany({ ... });
  }
}
```

Run seeders with `pnpm db:seed`.
