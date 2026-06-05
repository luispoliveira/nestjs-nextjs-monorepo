# Background Job Processing

## Purpose

Defines the requirements for enqueuing and processing background jobs in the monorepo using BullMQ. Covers producer abstractions with correlation ID propagation, consumer dispatch via `WorkerHost`, default retry/backoff configuration, and Redis connection setup from environment variables.

---

## Requirements

### Requirement: Producer adds jobs to a named queue with correlation ID

The system SHALL provide a `BaseProducer` abstraction that injects the current correlation ID into every job payload before enqueuing. Concrete producers SHALL extend `BaseProducer` and call `addJob(name, data)`.

#### Scenario: Job enqueued with correlation ID propagation

- **WHEN** a producer calls `addJob` with a job name and payload
- **THEN** the job is added to the queue with the correlation ID from the current CLS context merged into the payload

#### Scenario: Job enqueued without active correlation ID

- **WHEN** a producer calls `addJob` and no correlation ID exists in CLS
- **THEN** the job is added to the queue with `correlationId` undefined in the payload

---

### Requirement: Consumer processes jobs via WorkerHost dispatch

The system SHALL implement queue consumers by extending `WorkerHost` and dispatching on `job.name` inside the `process()` method. Each job type SHALL be handled by a dedicated private method.

#### Scenario: Known job type is dispatched

- **WHEN** a job arrives with a name matching a known `JOB_PATTERNS` constant
- **THEN** the corresponding handler method is invoked with the job

#### Scenario: Job processing failure is reported to Sentry

- **WHEN** a job fails after exhausting all retry attempts
- **THEN** `onFailed` is called and the error is captured via `SentryUtil.captureException` with job metadata (id, name, data, queue name)

---

### Requirement: Queue module configures retry with exponential backoff

The system SHALL configure all queues with 3 retry attempts, exponential backoff starting at 2000 ms, completed jobs removed on success, and failed jobs capped at 500 retained.

#### Scenario: Queue module registered with default job options

- **WHEN** `QueueModule.registerQueues([...])` is called in a feature module
- **THEN** all registered queues inherit the default job options (attempts: 3, backoff: exponential 2000 ms, removeOnComplete: true, removeOnFail: 500)

---

### Requirement: Redis connection is configured from environment

The system SHALL read `REDIS_HOST`, `REDIS_PORT`, and optionally `REDIS_PASSWORD` from the environment via `ConfigService` to establish the queue Redis connection.

#### Scenario: Valid Redis config connects successfully

- **WHEN** the application starts with valid `REDIS_HOST` and `REDIS_PORT` environment variables
- **THEN** the BullMQ connection is established and the worker begins processing

#### Scenario: Missing required Redis config throws at startup

- **WHEN** `REDIS_HOST` or `REDIS_PORT` is absent from the environment
- **THEN** `ConfigService.getOrThrow` throws and the application fails to start with a descriptive error
