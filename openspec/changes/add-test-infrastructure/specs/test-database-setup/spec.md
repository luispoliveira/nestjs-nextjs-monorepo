## ADDED Requirements

### Requirement: pnpm test:db:setup provisions the test database
The root `package.json` SHALL expose a `test:db:setup` script that creates the `nestjs_test` PostgreSQL database (if it does not exist) and applies all Prisma migrations against it.

#### Scenario: Script runs successfully against running Postgres
- **WHEN** `pnpm test:db:setup` is executed with the local docker-compose Postgres running
- **THEN** a database named `nestjs_test` exists on the Postgres instance
- **THEN** all Prisma migrations have been applied to `nestjs_test`
- **THEN** the script exits with code 0

#### Scenario: Script is idempotent
- **WHEN** `pnpm test:db:setup` is run a second time against an already-provisioned database
- **THEN** it completes without error

### Requirement: Each app has a .env.test file for test environment variables
Each NestJS app (`auth`, `notifications`, `worker`) SHALL include a `.env.test` file (committed, containing no secrets) that sets `DATABASE_URL` to point at the `nestjs_test` database.

#### Scenario: .env.test contains the test database URL
- **WHEN** `apps/auth/.env.test` is read
- **THEN** it contains a `DATABASE_URL` line pointing to the `nestjs_test` database

### Requirement: Jest setupFiles override process.env before module init
Each app's `test/jest.setup.ts` SHALL load `.env.test` values into `process.env` so that `ConfigModule.forRoot()` (which runs after `setupFiles`) reads the test database URL.

#### Scenario: Integration tests connect to nestjs_test not nestjs
- **WHEN** an integration test suite starts up a NestJS `TestingModule`
- **THEN** `DatabaseService` connects to `nestjs_test`, not `nestjs`

### Requirement: Separate jest-integration.json and jest-e2e.json configs per app
Each app SHALL have two Jest config files in its `test/` directory:
- `jest-integration.json` — matches `*.integration.ts` files, uses Pattern B (no HTTP server)
- `jest-e2e.json` — matches `*.e2e-spec.ts` files, uses Pattern A (full AppModule + HTTP)

Both SHALL reference `tsconfig.test.json` for transformation and `test/jest.setup.ts` via `setupFiles`.

#### Scenario: test:integration runs only integration test files
- **WHEN** `pnpm test:integration` is run in `apps/auth`
- **THEN** only files matching `*.integration.ts` are executed
- **THEN** no E2E spec files are executed

#### Scenario: test:e2e runs only E2E test files
- **WHEN** `pnpm test:e2e` is run in `apps/auth`
- **THEN** only files matching `*.e2e-spec.ts` are executed

### Requirement: Root package.json exposes test:integration and test:e2e scripts
The monorepo root `package.json` SHALL include `test:integration` and `test:e2e` scripts that delegate to all apps via Turborepo.

#### Scenario: Root test:integration triggers all app integration tests
- **WHEN** `pnpm test:integration` is run from the repo root
- **THEN** Turborepo executes the `test:integration` script in each app that defines it
