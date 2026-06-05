## MODIFIED Requirements

### Requirement: Consumer processes jobs via WorkerHost dispatch
The system SHALL implement queue consumers by extending `WorkerHost` and dispatching on `job.name` inside the `process()` method. Each job type SHALL be handled by a dedicated private method. On job completion, the consumer SHALL record a `bullmq_job_duration_seconds` histogram sample and on final failure SHALL increment `bullmq_job_failures_total`, in addition to capturing the error via `SentryUtil.captureException`.

#### Scenario: Known job type is dispatched
- **WHEN** a job arrives with a name matching a known `JOB_PATTERNS` constant
- **THEN** the corresponding handler method is invoked with the job

#### Scenario: Job completion records duration metric
- **WHEN** a job completes successfully
- **THEN** `@OnWorkerEvent('completed')` fires and a duration sample is recorded in `bullmq_job_duration_seconds{queue, job_name}`

#### Scenario: Job processing failure is reported to Sentry and counted
- **WHEN** a job fails after exhausting all retry attempts
- **THEN** `onFailed` is called, the error is captured via `SentryUtil.captureException` with job metadata (id, name, data, queue name), AND `bullmq_job_failures_total{queue, job_name}` is incremented by 1
