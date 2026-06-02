## ADDED Requirements

### Requirement: Sentry initialises before the NestJS application starts
Each backend app SHALL call `SentryUtil.init(appName)` as the first statement in `bootstrap()`, before `NestFactory.create()`, so that Node.js module patches are applied before any application code runs.

#### Scenario: DSN present in environment
- **WHEN** `SENTRY_DSN` is set in the environment and `SentryUtil.init('auth')` is called
- **THEN** Sentry initialises with the provided DSN, `environment` set from `NODE_ENV`, `tracesSampleRate` of `0`, and an `app` tag equal to the argument (`'auth'`)

#### Scenario: DSN absent from environment
- **WHEN** `SENTRY_DSN` is not set and `SentryUtil.init('auth')` is called
- **THEN** the function returns without calling `Sentry.init()` and no error is thrown

### Requirement: HTTP 5xx errors are captured to Sentry
`AllExceptionFilter` SHALL call `Sentry.captureException()` for any HTTP exception whose response status is 500 or above.

#### Scenario: Unhandled server error on HTTP request
- **WHEN** an unhandled exception reaches `AllExceptionFilter` in an HTTP context and the resolved status is >= 500
- **THEN** the exception is forwarded to Sentry before the JSON error response is sent to the client

#### Scenario: Client error on HTTP request
- **WHEN** an `HttpException` with status < 500 (e.g., 400, 404) reaches `AllExceptionFilter`
- **THEN** the exception is NOT sent to Sentry and the filter responds normally

#### Scenario: Zod validation error on HTTP request
- **WHEN** a `ZodValidationException` reaches `AllExceptionFilter`
- **THEN** the exception is NOT sent to Sentry and the filter returns a 400 response with validation details

### Requirement: RPC microservice exceptions are captured to Sentry
`AllExceptionFilter` SHALL handle the RPC execution context without crashing and SHALL capture all RPC-context exceptions to Sentry.

#### Scenario: Exception in a @MessagePattern handler
- **WHEN** an exception is thrown inside a `@MessagePattern` handler in `auth` or `notifications`
- **THEN** `AllExceptionFilter` catches it in RPC context, captures it to Sentry, logs the error, and rethrows so NestJS can serialise the error response to the caller

#### Scenario: Exception in an @EventPattern handler
- **WHEN** an exception is thrown inside an `@EventPattern` handler
- **THEN** `AllExceptionFilter` catches it in RPC context, captures it to Sentry, and rethrows

### Requirement: Bull job failures are captured to Sentry
The `worker` app's `EmailConsumer` SHALL capture Bull job failures to Sentry with job metadata as extra context.

#### Scenario: Email job fails after exhausting retries
- **WHEN** a Bull job in the email queue fails (on any attempt)
- **THEN** `Sentry.captureException()` is called with the error, the job ID, job name, and sanitised job data as extra context, and the `app: 'worker'` tag is included

### Requirement: Per-app tagging in Sentry
Every exception captured from a backend app SHALL include an `app` tag identifying the originating service.

#### Scenario: Error captured from the auth app
- **WHEN** an error is captured to Sentry while `SentryUtil.init('auth')` was called at startup
- **THEN** the Sentry event has `tags.app === 'auth'`

#### Scenario: Error captured from the worker app
- **WHEN** an error is captured to Sentry while `SentryUtil.init('worker')` was called at startup
- **THEN** the Sentry event has `tags.app === 'worker'`
