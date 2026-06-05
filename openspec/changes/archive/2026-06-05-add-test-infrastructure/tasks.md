## 1. packages/testing-utils — Package Scaffold

- [x] 1.1 Create `packages/testing-utils/package.json` with `@repo/testing-utils` name, `main`/`types` pointing to `dist/src/index`, devDep `@faker-js/faker`, dep `@repo/database`
- [x] 1.2 Create `packages/testing-utils/tsconfig.json` extending `../../packages/typescript-config/nestjs.json` with `outDir: ./dist`, `rootDir: .`
- [x] 1.3 Add `@repo/testing-utils` as a devDependency in `apps/auth/package.json`, `apps/notifications/package.json`, `apps/worker/package.json`

## 2. packages/testing-utils — Factories and Helpers

- [x] 2.1 Create `packages/testing-utils/src/helpers/truncate.ts` — `truncateDatabase(db: PrismaClient)` deletes `verification` then `user` (cascade handles the rest)
- [x] 2.2 Create `packages/testing-utils/src/factories/user.factory.ts` — `createUser(db, overrides?)` generates a `User` + `Account` with scrypt-hashed `TEST_PASSWORD`; use `crypto.randomUUID()` for IDs, `faker.internet.email()` for email, `faker.person.fullName()` for name
- [x] 2.3 Create `packages/testing-utils/src/factories/session.factory.ts` — `createSession(db, userId, overrides?)` creates a `Session` with a `crypto.randomUUID()` token and `expiresAt` 24h in the future
- [x] 2.4 Export `TEST_PASSWORD` constant (plain-text value used by factories and test assertions) from the package barrel
- [x] 2.5 Create `packages/testing-utils/src/factories/index.ts` and `packages/testing-utils/src/helpers/index.ts` barrel files
- [x] 2.6 Create `packages/testing-utils/src/index.ts` re-exporting factories, helpers, and `TEST_PASSWORD`

## 3. Test Database Setup

- [x] 3.1 Create `scripts/test-db-setup.mjs` — uses `pg` to `CREATE DATABASE nestjs_test IF NOT EXISTS`, then runs `prisma migrate deploy` with `DATABASE_URL` pointing at `nestjs_test`
- [x] 3.2 Add `"test:db:setup": "node scripts/test-db-setup.mjs"` to root `package.json`
- [x] 3.3 Create `apps/auth/.env.test` with `DATABASE_URL` pointing at `nestjs_test` (no secrets; safe to commit)

## 4. apps/auth — Test Directory and Jest Config

- [x] 4.1 Create `apps/auth/test/jest.setup.ts` — reads `apps/auth/.env.test` via `dotenv` and sets `process.env.DATABASE_URL`, `process.env.BETTER_AUTH_SECRET`, `process.env.MONGO_URI`, `process.env.REDIS_HOST`
- [x] 4.2 Create `apps/auth/test/jest-integration.json` — `testRegex: \.integration\.ts$`, `rootDir: ..`, `setupFiles: [<rootDir>/test/jest.setup.ts]`, transforms via `tsconfig.test.json`
- [x] 4.3 Create `apps/auth/test/jest-e2e.json` — `testRegex: \.e2e-spec\.ts$`, same setup, `testTimeout: 30000`
- [x] 4.4 Add `"test:integration": "jest --config ./test/jest-integration.json"` and `"test:e2e": "jest --config ./test/jest-e2e.json"` scripts to `apps/auth/package.json`

## 5. apps/auth — Integration Tests

- [x] 5.1 Create `apps/auth/test/users.integration.ts` — lean `TestingModule` with `DatabaseModule` + `ConfigModule`, `MongoService` mocked as a jest object with no-op methods
- [x] 5.2 Add `afterEach(() => truncateDatabase(db))` and `afterAll(() => db.$disconnect())` hooks
- [x] 5.3 Write test: `createUser(db)` produces a user with expected shape (`role = 'user'`, `emailVerified = false`)
- [x] 5.4 Write test: `createUser(db, { role: 'admin' })` stores `role = 'admin'`
- [x] 5.5 Write test: duplicate email throws a Prisma unique constraint error
- [x] 5.6 Write test: `createSession(db, userId)` creates a session with future `expiresAt` linked to the user
- [x] 5.7 Write test: `truncateDatabase(db)` removes all rows across all tables

## 6. apps/auth — E2E Tests

- [x] 6.1 Create `apps/auth/test/auth.e2e-spec.ts` — full `AppModule` bootstrapped with `app.init()`, `supertest` HTTP client, `afterAll(() => app.close())`
- [x] 6.2 Write test: `GET /api/auth/health/live` returns 200
- [x] 6.3 Write test: protected route (e.g. `GET /api/auth/trpc/...`) without cookie returns 401
- [x] 6.4 Write test: inject session via `createUser` + `createSession`, send `better-auth.session_token` cookie, verify 200

## 7. Root Scripts and Turbo Pipeline

- [x] 7.1 Add `"test:integration": "turbo run test:integration"` and `"test:e2e": "turbo run test:e2e"` to root `package.json`
- [x] 7.2 Add `test:integration` and `test:e2e` task entries to `turbo.json` (depends on `build`, no output caching for test results)

## 8. Build Verification

- [x] 8.1 Run `pnpm test:db:setup` and confirm `nestjs_test` exists with all tables
- [x] 8.2 Run `pnpm --filter @repo/testing-utils build` and confirm `dist/` is generated
- [x] 8.3 Run `pnpm --filter auth test:integration` and confirm all integration tests pass
- [x] 8.4 Run `pnpm --filter auth test:e2e` and confirm all E2E tests pass
- [x] 8.5 Run `pnpm build` to confirm no production source files were affected
