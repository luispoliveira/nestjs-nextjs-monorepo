# NestJS Backend Expert — Memory & Lessons Learned

> This file is automatically maintained by the NestJS Backend Expert agent.
> **Read at the start of every run. Update at the end of every run.**

---

## ⚠️ Known Pitfalls

<!-- Format:
### Pitfall: [Short title]
- **Context**: When/where does this happen?
- **What went wrong**: What was the mistake?
- **Fix/Avoid**: What to do instead
- **Project**: (optional) specific project where this occurred
- **Date**: YYYY-MM-DD
-->

### Pitfall: Process.env direct access in factories

- **Context**: Using `process.env` directly in `useFactory` functions (e.g., better-auth config)
- **What went wrong**: Bypasses type safety; secrets hardcoded in code
- **Fix/Avoid**: Always inject `ConfigService` and use `configService.getOrThrow<T>(key)`
- **Project**: nestjs-nextjs-monorepo (apps/auth/src/app.module.ts:43-44)
- **Date**: 2026-03-20

### Pitfall: No environment validation at startup

- **Context**: Using `ConfigModule.forRoot()` without validate option
- **What went wrong**: App starts with missing/invalid env vars; fails at runtime
- **Fix/Avoid**: Create Zod schema for env vars and pass to `ConfigModule.forRoot({ validate })`
- **Date**: 2026-03-20

### Pitfall: Zero test coverage in monorepo

- **Context**: Jest configured but no test files exist
- **What went wrong**: No safety net for refactors; code untestable
- **Fix/Avoid**: Create test files alongside every service/controller; aim for 80% coverage
- **Date**: 2026-03-20

### Pitfall: Business logic in module configuration

- **Context**: better-auth hooks defined inline in `AuthModule.forRootAsync`
- **What went wrong**: Hard to test; violates SRP; couples config to business logic
- **Fix/Avoid**: Extract hooks to dedicated service; inject into config
- **Date**: 2026-03-20

### Pitfall: Missing repository pattern

- **Context**: Services access Prisma (DatabaseService) directly
- **What went wrong**: Tight coupling; hard to mock in tests; violates Clean Architecture
- **Fix/Avoid**: Create repository interfaces and implementations; inject interfaces into services
- **Date**: 2026-03-20

---

## ✅ Successful Patterns

<!-- Format:
### Pattern: [Short title]
- **Context**: When to apply this
- **Approach**: What worked well
- **Project**: (optional)
- **Date**: YYYY-MM-DD
-->

### Pattern: Correlation ID tracking via nestjs-cls

- **Context**: Request tracing across microservices
- **Approach**: Use `ClsModule` with middleware to inject correlation ID into request context; propagate via `ClsService`
- **Project**: nestjs-nextjs-monorepo (packages/shared/src/modules/shared.module.ts)
- **Date**: 2026-03-20

### Pattern: Global exception filter with correlation IDs

- **Context**: Consistent error responses and logging
- **Approach**: `AllExceptionFilter` catches all errors, logs with correlation ID, returns structured response
- **Project**: nestjs-nextjs-monorepo (packages/shared/src/filters/http-exception.filter.ts)
- **Date**: 2026-03-20

### Pattern: Centralized bootstrap utility

- **Context**: Consistent app setup across microservices
- **Approach**: `BootstrapUtil.setup()` handles Helmet, CORS, Swagger, versioning, cookie parser
- **Project**: nestjs-nextjs-monorepo (packages/shared/src/utils/bootstrap.util.ts)
- **Date**: 2026-03-20

### Pattern: Queue-based async job processing

- **Context**: Email notifications triggered by auth events
- **Approach**: Auth app publishes Redis events → Notifications app consumes → Produces Bull jobs → Worker processes
- **Project**: nestjs-nextjs-monorepo (apps/worker, apps/notifications)
- **Date**: 2026-03-20

### Pattern: Shared constants package

- **Context**: Avoid hardcoded strings across apps
- **Approach**: Central constants for queue names, job patterns, event patterns, service names
- **Project**: nestjs-nextjs-monorepo (@repo/shared/src/constants)
- **Date**: 2026-03-20

---

## 📋 Project-Specific Notes

<!-- Specific observations about codebases encountered, e.g.:
- Project X uses a custom PrismaService wrapper — inject it differently
- Project Y has a monorepo (Turborepo) — adjust import paths accordingly
- Project Z uses better-auth with a custom session strategy
-->

### nestjs-nextjs-monorepo

- **Monorepo**: Turborepo + pnpm workspaces; all internal packages use `@repo/` prefix
- **Auth**: `better-auth` with `@thallesp/nestjs-better-auth` wrapper — NOT Passport
- **Validation**: Zod v4 + `nestjs-zod` (`createZodDto`, `ZodValidationPipe`)
- **Queue**: Bull v4 via `@nestjs/bull` — NOT BullMQ
- **Database**: Prisma 7 with PrismaPg adapter; `DatabaseService extends PrismaClient`
- **Logging**: MongoDB for audit logs with 30-day TTL; Pino for app logs
- **Constants**: All tokens/queue names live in `@repo/shared/src/constants` — never hardcode
- **Bootstrap**: Apps use `BootstrapUtil.setup()` for consistent config
- **Structure**: Currently flat; needs layered architecture (controller → service → repository)
- **Testing**: Zero coverage — urgent priority
- **Date**: 2026-03-20

---

## 📦 Package Version Compatibility

<!-- Track known version conflicts or compatibility issues. Format:
- `@nestjs/bullmq@X` requires `bullmq@Y` — do not upgrade independently
- `better-auth@X` session type requires explicit generic on `getSession<T>()`
-->

### nestjs-nextjs-monorepo

- **Zod v4**: Use `z.email()` not `z.string().email()`; `.meta({ id: '...' })` for schema IDs
- **Bull v4**: Use `@nestjs/bull` + `bull@^4.x` — NOT `@nestjs/bullmq`
- **Prisma 7**: Requires `@prisma/adapter-pg` for PrismaPg connection
- **better-auth 1.5.5**: Hooks return `Promise<void>`; session strategy via `trustedOrigins`
- **Date**: 2026-03-20

---

## 🔒 Security Observations

<!-- Track security decisions made per project. Format:
- Project X: Rate limiting set to 60 req/min per IP on auth routes
- Project Y: CORS allow-list managed via ConfigService + Zod env var
-->

### nestjs-nextjs-monorepo

- **CORS**: Configured via env var `CORS_ORIGIN`; credentials enabled — ensure strict validation
- **Rate limiting**: `ThrottlerModule` registered (10 req/60s default) but NOT applied to routes — needs `@UseGuards(ThrottlerGuard)` on auth endpoints
- **Secrets**: Hardcoded `process.env` access found in auth module — must migrate to `ConfigService`
- **Helmet**: Enabled globally via `BootstrapUtil`
- **Env validation**: MISSING — urgent fix needed with Zod schemas
- **Input validation**: `ZodValidationPipe` registered but no `whitelist`/`forbidNonWhitelisted` — potential for injection
- **Error handling**: `AllExceptionFilter` exists; verify stack traces hidden in production
- **Logging sanitization**: `SanitizeUtil` used but needs audit for PII/secrets redaction
- **Date**: 2026-03-20

---

## 🧪 Testing Patterns

<!-- Track effective test setup strategies. Format:
- Prisma mock: use `jest-mock-extended` + `mockDeep<PrismaClient>()` — works reliably
- BullMQ queue: mock `Queue` with `{ add: jest.fn() }` in unit tests
-->

### nestjs-nextjs-monorepo

- **Status**: Zero test coverage — no test files exist
- **Jest config**: Present in all apps (rootDir: 'src', testRegex: '.\*\\.spec\\.ts$')
- **Recommended setup**:
  - Prisma: Use `jest-mock-extended` + `mockDeep<PrismaClient>()` for unit tests
  - Bull queues: Mock `Queue` with `{ add: jest.fn() }`, verify job payload and options
  - Controllers: Use `@nestjs/testing` + Supertest for e2e
  - Services: Mock repositories, test business logic in isolation
  - Integration: Use in-memory or Docker test database for Prisma tests
- **Priority**: Create test infrastructure immediately
- **Date**: 2026-03-20
