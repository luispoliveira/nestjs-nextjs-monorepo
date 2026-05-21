---
name: find-entrypoints
description: Find and list all system entry points — HTTP routes, microservice patterns, queue jobs, health endpoints, and CLI commands. Produces a complete inventory with file references.
license: MIT
compatibility: NestJS + Next.js monorepo
metadata:
  author: project
  version: "1.0"
---

Discover all entry points in this NestJS + Next.js monorepo. Produce a complete, navigable inventory.

**Do not modify anything.** This is a read-only discovery skill.

---

## Discovery Steps

### 1. HTTP Routes (NestJS)

```bash
# Find all controller decorators
grep -r "@Controller\|@Get\|@Post\|@Put\|@Delete\|@Patch" apps --include="*.ts" -n
```

For each controller, extract:
- HTTP method and path
- Auth requirement (`@Public()` present? or protected by default)
- DTO used for validation
- Service called

### 2. better-auth Routes

The auth app mounts all better-auth routes at `/api/auth/*`. Enumerate:
- Sign-in, sign-up, sign-out
- Session endpoints
- OAuth callbacks (Google)
- 2FA endpoints
- Admin endpoints

```bash
grep -r "betterAuth\|plugins\|socialProviders" apps/auth --include="*.ts" -n
```

### 3. tRPC Procedures

```bash
# Find router definitions
grep -r "@Router\|procedure\.\(query\|mutation\)" apps packages --include="*.ts" -n

# Find the app router composition
find apps -name "app.router.ts" | xargs cat
```

For each procedure:
- Name and type (query/mutation)
- Input schema
- Auth requirement
- Service called

### 4. Microservice Patterns

```bash
# Message patterns (request/response)
grep -r "@MessagePattern" apps --include="*.ts" -n

# Event patterns (fire-and-forget)
grep -r "@EventPattern" apps --include="*.ts" -n
```

Cross-reference with constants:
```bash
cat packages/shared/src/constants/events.ts
```

### 5. Queue Jobs

```bash
# Processors
grep -r "@Processor\|@Process" apps --include="*.ts" -n
```

Cross-reference with:
```bash
cat packages/shared/src/constants/jobs.ts
```

### 6. Health Endpoints

Provided globally by `SharedModule` via `HealthController`:
- `GET /health/live` — always returns 200 if process is running
- `GET /health/ready` — checks DB, Redis, MongoDB connectivity

```bash
find packages/shared/src -name "health.controller.ts" | xargs cat
```

### 7. Next.js Routes

```bash
# App Router pages
find apps/web/src/app -name "page.tsx" -o -name "route.ts" | sort

# API routes
find apps/web/src/app -name "route.ts" | sort
```

For each page, note:
- Path derived from file system
- Protected (layout-level auth check)?
- Server or client component?

---

## Output Format

```
## Entry Point Inventory

### HTTP — apps/auth (port 3001, prefix: /api/auth)

| Method | Path | Auth | File |
|--------|------|------|------|
| * | /api/auth/* | Public | better-auth (all routes) |
| GET | /api/auth/health/live | Public | shared/health.controller.ts |
| GET | /api/auth/health/ready | Public | shared/health.controller.ts |
| GET | /api/auth/docs | Public (non-prod) | main.ts (Swagger) |

### tRPC — apps/api (port 3002, prefix: /api/trpc)

| Procedure | Type | Auth | File |
|-----------|------|------|------|
| users.getUsers | query | Required | apps/api/src/... |

### Microservice — Redis

| Pattern | Type | Handler | File |
|---------|------|---------|------|
| auth:authenticate | message | AuthController.authenticate | apps/auth/src/auth.controller.ts:15 |
| user:created | event | AppController.onUserCreated | apps/notifications/src/app.controller.ts:... |

### Queue Jobs — Bull (email-queue)

| Job | Handler | File |
|-----|---------|------|
| job:send_welcome_email | EmailConsumer.sendWelcomeEmail | apps/worker/src/consumer/email.consumer.ts |

### Next.js Pages — apps/web (port 3000)

| Path | Auth | Type | File |
|------|------|------|------|
| / | Redirect | Server | apps/web/src/app/page.tsx |
| /sign-in | Public | Server | apps/web/src/app/sign-in/page.tsx |
| /dashboard | Protected | Server | apps/web/src/app/(dashboard)/page.tsx |
```

---

## Reference Documents

- `ENTRYPOINTS.md` — existing entry point docs (compare and offer to update if stale)
- `CLAUDE.md` — conventions for route patterns

---

## Guardrails

- Never modify files — read only
- Flag any entry points missing in `ENTRYPOINTS.md`
- Note any unprotected routes that should require auth
- Offer to update `ENTRYPOINTS.md` if significant gaps found
