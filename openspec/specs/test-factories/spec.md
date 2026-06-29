# Test Factories

## Purpose

Defines the shared testing utility requirements for Prisma-backed factories and database cleanup helpers used across application test suites.

---

## Requirements

### Requirement: Testing utilities package exists as a workspace package

The monorepo SHALL include a `packages/testing-utils` workspace package exported as `@repo/testing-utils`. It SHALL be a devDependency only — never a production dependency of any app.

#### Scenario: Package is importable in app test files

- **WHEN** an app test file contains `import { createUser } from '@repo/testing-utils'`
- **THEN** TypeScript resolves the import without path alias configuration and without errors

---

### Requirement: User factory creates a valid database record

`createUser(db, overrides?)` SHALL insert a `User` row and a corresponding `Account` row (with a scrypt-hashed password) into the test database. It SHALL return the created `User` object.

#### Scenario: Default user is created with random unique values

- **WHEN** `createUser(db)` is called with no overrides
- **THEN** a `User` row exists in the database with a unique email, a non-empty name, and `role` set to `RoleEnum.USER`
- **THEN** an `Account` row exists linked to that user with `providerId` of `credential` and a non-empty hashed `password`

#### Scenario: Overrides are applied to the created user

- **WHEN** `createUser(db, { email: 'fixed@example.com', role: RoleEnum.ADMIN })` is called
- **THEN** the created `User` has `email = 'fixed@example.com'` and `role = 'admin'`

#### Scenario: TEST_PASSWORD constant authenticates the created user

- **WHEN** a user is created with `createUser(db)`
- **THEN** verifying `TEST_PASSWORD` against the stored `Account.password` hash with scrypt MUST succeed

---

### Requirement: Session factory creates a valid session record

`createSession(db, userId, overrides?)` SHALL insert a `Session` row linked to the given user and return the created session including its `token`.

#### Scenario: Session is created with a future expiry

- **WHEN** `createSession(db, userId)` is called
- **THEN** a `Session` row exists with `userId` matching the given user and `expiresAt` set to a date in the future

#### Scenario: Session token can be used as a cookie value

- **WHEN** `createSession(db, userId)` returns a session
- **THEN** the returned `token` is a non-empty string suitable for use as the `better-auth.session_token` cookie value in test HTTP requests

---

### Requirement: truncateDatabase cleans all application tables

`truncateDatabase(db)` SHALL delete all rows from `User`, `Session`, `Account`, `TwoFactor`, and `Verification` tables. It SHALL exploit FK cascade rules so that deleting `User` rows removes dependent rows automatically.

#### Scenario: All rows removed after truncation

- **WHEN** several users and sessions are created and then `truncateDatabase(db)` is called
- **THEN** `db.user.count()` returns 0
- **THEN** `db.session.count()` returns 0
- **THEN** `db.verification.count()` returns 0

#### Scenario: truncateDatabase is safe on an empty database

- **WHEN** `truncateDatabase(db)` is called on an empty database
- **THEN** no error is thrown

---

### Requirement: Factory functions accept PrismaClient not DatabaseService

All factory functions SHALL accept `PrismaClient` as the `db` parameter type. Since `DatabaseService extends PrismaClient`, both types SHALL be accepted without casting.

#### Scenario: Factory works when passed a DatabaseService instance

- **WHEN** a `DatabaseService` instance (obtained from a NestJS `TestingModule`) is passed to `createUser`
- **THEN** the factory creates the record without TypeScript errors or runtime exceptions
