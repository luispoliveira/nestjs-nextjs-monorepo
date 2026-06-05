## Context

The monorepo has 5 test files covering only unit-level behaviour with fully mocked dependencies. No test exercises a real database, a real HTTP endpoint, or a real queue. The auth app is the most business-critical and has zero integration coverage. The existing worker unit tests (`email.consumer.spec.ts`, `base.dlq.service.spec.ts`) establish a solid mocking pattern; this change adds the complementary real-infrastructure layer.

Key constraints discovered during design exploration:
- Every app's `tsconfig.test.json` sets `moduleResolution: node` + `resolvePackageJsonExports: false`, which disables sub-path export resolution (`@repo/database/testing` style imports break in tests)
- `SharedModule.register()` unconditionally bootstraps PostgreSQL, MongoDB, and Redis — integration tests need a strategy to avoid requiring all three
- `ConfigModule` hardcodes `envFilePath: '.env'` inside `SharedModule`; test DB config must be injected via `process.env` overrides in Jest `setupFiles` (before module init)
- `DatabaseService extends PrismaClient` directly — factories can accept `PrismaClient` and work without a NestJS module
- `User.id` has no Prisma `@default()` — better-auth generates IDs externally; factories use `crypto.randomUUID()`
- better-auth uses scrypt (via Node's `crypto.scrypt`) to hash passwords in `Account.password`

## Goals / Non-Goals

**Goals:**
- Shared factory + helper package (`@repo/testing-utils`) usable by all apps with a single devDependency
- Test database lifecycle managed by a `pnpm test:db:setup` script (create DB + migrate)
- Separate `test:integration` and `test:e2e` scripts at the root level
- Integration tests for `apps/auth` running against real Postgres with MongoDB mocked
- E2E tests for `apps/auth` running against the full `AppModule` via supertest
- Pattern established for `apps/notifications` and `apps/worker` to follow

**Non-Goals:**
- Testcontainers — the project already runs docker-compose infra locally and in CI
- Changes to any production source file
- Frontend (`apps/web`) test infrastructure — separate concern
- `apps/notifications` and `apps/worker` test suites — first iteration only establishes the pattern; those apps follow in subsequent iterations

## Decisions

### D1: New `packages/testing-utils` package (not a sub-path export on `@repo/database`)

`@repo/database/testing` sub-path exports fail silently in the test environment because `resolvePackageJsonExports: false` is set in all app `tsconfig.test.json` files. A standalone `@repo/testing-utils` package resolves via the `main` field with no path aliases or tsconfig changes required.

*Alternatives considered:* exporting from `@repo/database` main barrel — rejected because test utilities (faker, scrypt hashing) in the prod barrel creates accidental-import risk.

### D2: `process.env` override in Jest `setupFiles` for test database URL

`SharedModule` hardcodes `envFilePath: '.env'`, making it impractical to override via ConfigModule options in a TestingModule. Setting `process.env.DATABASE_URL` in a `setupFiles` entry runs before any NestJS module initialises, so ConfigModule reads the overridden value without any module-level changes.

*Alternatives considered:* per-app `.env.test` loaded by a custom ConfigModule import — rejected because it requires overriding `SharedModule`'s internal ConfigModule setup.

### D3: Two test module patterns — Lean (Pattern B) for integration, Full (Pattern A) for E2E

SharedModule's MongoDB and Redis dependencies make spinning up the full app expensive for data-layer tests. Pattern B imports only `ConfigModule` + `DatabaseModule` (mocking `MongoService`) and runs in ~100-500ms. Pattern A uses the full `AppModule` and is reserved for HTTP boundary tests.

### D4: `MongoService` mocked in Pattern B tests

MongoDB stores HTTP logs and email logs — not business data. Mocking `MongoService` in integration tests is safe: no test behaviour depends on log persistence. The mock is a jest object with no-op methods.

### D5: `afterEach` truncation over `afterAll`

Each test starts from a clean slate. `truncateDatabase` issues two deletes: `DELETE FROM "user"` (cascades to Session, Account, TwoFactor) and `DELETE FROM "verification"`. The cascade relationships in the Prisma schema make ordering trivial.

### D6: Scrypt hashing in `createUser` factory

`Account.password` must store a scrypt hash for HTTP sign-in tests to work end-to-end. Uses Node's built-in `crypto.scrypt` — no additional dependency. Default test password is a known constant exposed as `TEST_PASSWORD` from the package.

### D7: Separate `test:integration` and `test:e2e` scripts

Integration tests (Pattern B) run without a full HTTP server, completing in seconds. E2E tests (Pattern A) bootstrap the full app. Keeping them separate allows fast feedback during development without skipping E2E entirely.

## Risks / Trade-offs

- **Test DB drift**: If migrations diverge between dev and test databases, tests produce false results. Mitigation: `test:db:setup` always runs `prisma migrate deploy` (not `migrate dev`) so the test DB stays in sync with committed migrations.
- **Scrypt timing in CI**: Scrypt is CPU-intensive by design; hashing in `beforeEach` for large test suites is slow. Mitigation: factory hashes a single known password constant once and caches the result per test run; `createUser` accepts a pre-hashed value override.
- **SharedModule MongoDB connection in Pattern A**: Full AppModule tests still connect to MongoDB. If Mongo is down, Pattern A tests fail. Mitigation: document that `pnpm docker:up` is a prerequisite for `test:e2e`.
- **`@faker-js/faker` bundle size**: faker is ~2MB. It is a devDependency of `packages/testing-utils` only and never enters production builds.

## Migration Plan

1. Create `packages/testing-utils` with factories and helpers
2. Run `pnpm test:db:setup` to provision `nestjs_test`
3. Add `test/jest.setup.ts` + `jest-integration.json` + `jest-e2e.json` to `apps/auth`
4. Write integration tests for `apps/auth` (users CRUD, session management)
5. Write E2E tests for `apps/auth` (sign-in, protected routes)
6. Add root `test:integration` and `test:e2e` scripts to `turbo.json` pipeline
7. Repeat steps 3-6 for `apps/notifications`, then `apps/worker`
