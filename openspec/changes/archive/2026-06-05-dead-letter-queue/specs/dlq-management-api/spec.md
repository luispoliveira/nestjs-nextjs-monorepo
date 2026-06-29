## ADDED Requirements

### Requirement: DLQ message patterns are defined as constants
`packages/shared/src/constants/events.ts` (or `message-patterns.ts`) SHALL define `MESSAGE_PATTERNS.DLQ_LIST`, `MESSAGE_PATTERNS.DLQ_REPLAY`, and `MESSAGE_PATTERNS.DLQ_PURGE` constants for use by the worker microservice and the auth app caller.

#### Scenario: DLQ message pattern constants are importable
- **WHEN** a NestJS module imports `MESSAGE_PATTERNS` from `@repo/shared`
- **THEN** `DLQ_LIST`, `DLQ_REPLAY`, and `DLQ_PURGE` are available as typed string constants

### Requirement: Worker app exposes DLQ message pattern handlers
`apps/worker/src/dlq/dlq.controller.ts` SHALL implement `@MessagePattern` handlers for `DLQ_LIST`, `DLQ_REPLAY`, and `DLQ_PURGE`. Each handler SHALL delegate to `EmailDlqService` and return a serialisable result over the Redis microservice transport.

#### Scenario: DLQ_LIST returns current DLQ job list
- **WHEN** `DLQ_LIST` is received with `{ queue: 'email-queue', page: number, limit: number }`
- **THEN** the handler returns `{ jobs: DlqJobDto[], total: number }`

#### Scenario: DLQ_REPLAY replays a specific job
- **WHEN** `DLQ_REPLAY` is received with `{ queue: 'email-queue', jobId: string }`
- **THEN** the handler calls `EmailDlqService.replay(jobId)` and returns `{ success: true }`
- **WHEN** the job id does not exist in the DLQ
- **THEN** the handler returns an error response (job not found)

#### Scenario: DLQ_PURGE removes all DLQ jobs for a queue
- **WHEN** `DLQ_PURGE` is received with `{ queue: 'email-queue' }`
- **THEN** the handler calls `EmailDlqService.purge()` and returns `{ removed: number }`

### Requirement: Bull Board is mounted in the worker app at /admin/queues
The worker app SHALL mount the Bull Board NestJS adapter at the path `/admin/queues`. Both `email-queue` and `email-queue:dlq` SHALL be visible in the Bull Board UI.

#### Scenario: Bull Board shows both queues
- **WHEN** an authenticated admin user navigates to `/admin/queues`
- **THEN** the Bull Board UI renders with `email-queue` and `email-queue:dlq` listed

#### Scenario: Unauthenticated access is rejected
- **WHEN** a request without a valid admin session accesses `/admin/queues`
- **THEN** the server responds with 401 Unauthorized

#### Scenario: Bull Board allows manual job replay
- **WHEN** an admin selects a failed job in `email-queue:dlq` and triggers replay via the UI
- **THEN** the job is re-queued to `email-queue` and removed from the DLQ

### Requirement: EmailDlqService extends BaseDlqService for the email queue
`apps/worker/src/dlq/email.dlq.service.ts` SHALL extend `BaseDlqService`, injecting `QUEUES.EMAIL_DLQ` as the DLQ queue and `QUEUES.EMAIL` as the original queue.

#### Scenario: EmailDlqService is injectable in the worker app
- **WHEN** `DlqModule` is imported in `AppModule`
- **THEN** `EmailDlqService` is available via NestJS dependency injection in the worker app
