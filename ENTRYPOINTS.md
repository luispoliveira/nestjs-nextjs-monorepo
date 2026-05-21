# ENTRYPOINTS.md — NestJS + Next.js Monorepo

All system entry points: HTTP routes, microservice patterns, queue jobs, and health endpoints.

---

## HTTP Entry Points

### `apps/auth` — `http://localhost:3001/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| `*` | `/api/auth/*` | All better-auth routes (sign-in, sign-up, sign-out, session, OAuth callbacks, 2FA, admin) |
| `GET` | `/api/auth/health/live` | Liveness probe |
| `GET` | `/api/auth/health/ready` | Readiness probe (checks DB, Redis) |
| `GET` | `/api/auth/docs` | Swagger UI (non-production only) |

better-auth exposes these sub-routes automatically:
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-out`
- `GET /api/auth/session`
- `GET /api/auth/callback/google` (OAuth)
- `POST /api/auth/two-factor/*`
- `GET/POST /api/auth/admin/*`

### `apps/api` — `http://localhost:3002/api`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/trpc/*` | tRPC batch endpoint (all procedures) |
| `GET` | `/api/health/live` | Liveness probe |
| `GET` | `/api/health/ready` | Readiness probe |
| `GET` | `/api/docs` | Swagger UI (non-production only) |

### `apps/notifications` — `http://localhost:3004/api/notifications`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/notifications/health/live` | Liveness probe |
| `GET` | `/api/notifications/health/ready` | Readiness probe |

### `apps/worker` — internal only

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health/live` | Liveness probe |
| `GET` | `/health/ready` | Readiness probe |

### `apps/web` — `http://localhost:3000`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Root (redirects to dashboard or sign-in) |
| `GET` | `/sign-in` | Sign-in page |
| `GET` | `/dashboard` | Admin dashboard (protected) |
| `GET/POST` | `/api/*` | Next.js API routes (proxied to backend) |

---

## Microservice Entry Points (Redis)

### Message Patterns (request/response)

| Pattern | Handler | Service | Description |
|---------|---------|---------|-------------|
| `auth:authenticate` | `AuthController.authenticate()` | `apps/auth` | Validate bearer token/cookie → returns user |

### Event Patterns (fire-and-forget)

| Pattern | Handler | Service | Description |
|---------|---------|---------|-------------|
| `user:created` | `AppController.onUserCreated()` | `apps/notifications` | Enqueue welcome email |
| `user:password_reset_requested` | `AppController.onPasswordResetRequested()` | `apps/notifications` | Enqueue password reset email |
| `user:password_changed` | `AppController.onPasswordChanged()` | `apps/notifications` | Enqueue password changed email |
| `user:email_verification_requested` | `AppController.onEmailVerificationRequested()` | `apps/notifications` | Enqueue verification email |
| `user:two_factor_enabled` | `AppController.onTwoFactorEnabled()` | `apps/notifications` | Enqueue 2FA enabled email |
| `user:two_factor_disabled` | `AppController.onTwoFactorDisabled()` | `apps/notifications` | Enqueue 2FA disabled email |

---

## Queue Entry Points (Bull)

Queue: `email-queue` — processed by `apps/worker`

| Job Pattern | Handler | Trigger |
|-------------|---------|---------|
| `job:send_welcome_email` | `EmailConsumer.sendWelcomeEmail()` | `user:created` event |
| `job:send_password_reset_email` | `EmailConsumer.sendPasswordResetEmail()` | `user:password_reset_requested` event |
| `job:send_password_changed_email` | `EmailConsumer.sendPasswordChangedEmail()` | `user:password_changed` event |
| `job:send_email_verification_email` | `EmailConsumer.sendEmailVerificationEmail()` | `user:email_verification_requested` event |
| `job:send_two_factor_enabled_email` | `EmailConsumer.sendTwoFactorEnabledEmail()` | `user:two_factor_enabled` event |
| `job:send_two_factor_disabled_email` | `EmailConsumer.sendTwoFactorDisabledEmail()` | `user:two_factor_disabled` event |

Job configuration: `attempts: 3`, exponential backoff from 2000ms, `removeOnComplete: true`, `removeOnFail: 500`.

---

## Bootstrap Entry Points

Each app's `main.ts` is the process entry point:

| File | App | What it does |
|------|-----|-------------|
| `apps/auth/src/main.ts` | auth | NestFactory + Redis transport + BootstrapUtil.setup() |
| `apps/api/src/main.ts` | api | NestFactory + Redis client + BootstrapUtil.setup() |
| `apps/notifications/src/main.ts` | notifications | NestFactory + Redis transport + BootstrapUtil.setup() |
| `apps/worker/src/main.ts` | worker | NestFactory + Bull consumer setup |
| `apps/web/src/app/layout.tsx` | web | Next.js root layout |

---

## Database Entry Points

| Tool | Command | Entry |
|------|---------|-------|
| Prisma migrations | `pnpm db:migrate` | `packages/database/prisma/schema.prisma` |
| Prisma generate | `pnpm db:generate` | `packages/database/prisma.config.ts` |
| Seed | `pnpm db:seed` | `packages/database/src/database-seeder.service.ts` |
| Auth schema | managed by better-auth | `packages/database/prisma/auth.prisma` |

---

## Development Entry Points

| Command | Entry |
|---------|-------|
| `pnpm dev` | Turborepo dev task → all apps in watch mode |
| `pnpm build` | Turborepo build pipeline |
| `pnpm docker:up` | `docker-compose.yml` → Postgres, MongoDB, Redis |
| `pnpm lint` | ESLint across all workspaces |
| `pnpm check-types` | TypeScript across all workspaces |
