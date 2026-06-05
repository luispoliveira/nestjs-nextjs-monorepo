## Why

The monorepo has only 5 test files — 3 auto-generated controller shells and 2 worker unit tests — and zero integration or E2E tests. The auth, notifications, and worker apps have no coverage against a real database or HTTP layer, making regressions invisible until production.

## What Changes

- New `packages/testing-utils` workspace package providing Prisma-backed test factories (`createUser`, `createSession`) with scrypt password hashing, and a `truncateDatabase` helper
- New `pnpm test:db:setup` root script that creates the `nestjs_test` database and runs Prisma migrations against it
- Per-app test environment configuration: `.env.test`, `test/jest.setup.ts`, separate `jest-integration.json` and `jest-e2e.json` configs
- Integration tests for the `auth` app (Pattern B: lean module + real Postgres, `MongoService` mocked)
- E2E tests for the `auth` app (Pattern A: full `AppModule` + supertest HTTP layer)
- Foundation pattern for `notifications` and `worker` apps to follow in subsequent iterations

## Capabilities

### New Capabilities

- `test-factories`: `packages/testing-utils` — factory functions and DB helpers used across all app test suites
- `test-database-setup`: test DB lifecycle — `pnpm test:db:setup` script, `.env.test` convention, Jest setup files that override `DATABASE_URL` before module init
- `auth-integration-tests`: integration and E2E test suites for `apps/auth` using the factory + setup infrastructure

### Modified Capabilities

## Impact

- New package: `packages/testing-utils` (devDependency in each app)
- New devDependency: `@faker-js/faker` in `packages/testing-utils`
- New root scripts: `test:db:setup`, `test:integration`, `test:e2e`
- Affected apps (test directories only, no production code changes): `apps/auth`, with `apps/notifications` and `apps/worker` to follow the same pattern
- No changes to `SharedModule`, `DatabaseModule`, or any production source files
