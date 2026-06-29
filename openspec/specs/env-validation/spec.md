### Requirement: NestJS apps fail at boot when required env vars are missing

Each NestJS application (auth, api, notifications, worker) SHALL validate its environment variables during the NestJS bootstrap phase, before any request is served. If any required variable is absent or fails type/format constraints, the process SHALL exit with a non-zero status code and a structured error message listing every invalid variable.

#### Scenario: Required variable missing at boot

- **WHEN** a NestJS app starts with `DATABASE_URL` absent from the environment
- **THEN** the process crashes immediately during bootstrap
- **THEN** the error output identifies `DATABASE_URL` as missing
- **THEN** no HTTP port is opened and no requests are accepted

#### Scenario: Variable present but malformed

- **WHEN** `REDIS_PORT` is set to `"abc"` (non-numeric string)
- **THEN** the process crashes immediately during bootstrap
- **THEN** the error output identifies `REDIS_PORT` as invalid
- **THEN** no HTTP port is opened

#### Scenario: All required variables present and valid

- **WHEN** all required env vars are present and pass their constraints
- **THEN** the app boots successfully
- **THEN** no validation error is emitted

---

### Requirement: Each NestJS app validates only its own variable surface

Each app SHALL define a Zod schema covering exactly the variables it uses. An app SHALL NOT be required to supply variables it does not consume.

#### Scenario: Worker boots without auth-specific variables

- **WHEN** the worker app starts without `BETTER_AUTH_SECRET` in the environment
- **THEN** the worker boots successfully (it does not use that variable)

#### Scenario: Auth app requires BETTER_AUTH_SECRET

- **WHEN** the auth app starts without `BETTER_AUTH_SECRET`
- **THEN** the auth app crashes at boot with an error identifying `BETTER_AUTH_SECRET`

---

### Requirement: Numeric env vars are coerced from strings

The system SHALL accept numeric environment variables (e.g. `PORT`, `REDIS_PORT`) as strings and coerce them to numbers during validation. Values that cannot be coerced to a positive integer SHALL be rejected.

#### Scenario: REDIS_PORT provided as string

- **WHEN** `REDIS_PORT` is set to `"6379"` (string form)
- **THEN** the app boots successfully and `ConfigService.get('REDIS_PORT')` returns the number `6379`

#### Scenario: REDIS_PORT is not a number

- **WHEN** `REDIS_PORT` is set to `"not-a-port"`
- **THEN** the app crashes at boot with an error identifying `REDIS_PORT`

---

### Requirement: apps/web validates env vars at module load time

The Next.js app (`apps/web`) SHALL export a validated `env` object from `apps/web/env.ts`. This module SHALL use `z.parse()` at the top level, causing a build-time or startup failure if any required variable is missing.

#### Scenario: Next.js build fails when AUTH_API_URL is missing

- **WHEN** `next build` runs without `AUTH_API_URL` defined
- **THEN** the build process exits with a non-zero code
- **THEN** the error identifies `AUTH_API_URL` as missing

#### Scenario: Server utility imports validated env

- **WHEN** `apps/web/lib/auth/server.ts` (or any server utility) reads `AUTH_API_URL`
- **THEN** it imports from `env.ts` rather than reading `process.env` directly
- **THEN** the value is guaranteed to be a non-empty string

---

### Requirement: No direct process.env reads inside app business logic

App code (services, modules, guards, controllers) SHALL NOT read `process.env` directly. All env access SHALL go through `ConfigService.get()` (NestJS apps) or the `env` object from `env.ts` (Next.js). The only exception is `main.ts`.

#### Scenario: Social provider credentials via ConfigService

- **WHEN** the auth app configures Google OAuth
- **THEN** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are read via `configService.get()`, not `process.env`

#### Scenario: Optional social provider not configured

- **WHEN** `GOOGLE_CLIENT_ID` is absent from the environment
- **THEN** Google OAuth is silently disabled (social provider block omitted)
- **THEN** the auth app boots successfully without requiring it
