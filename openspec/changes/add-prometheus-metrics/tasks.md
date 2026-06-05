## 1. Dependencies

- [ ] 1.1 Add `@willsoto/nestjs-prometheus` and `prom-client` to `packages/shared/package.json` dependencies
- [ ] 1.2 Run `pnpm install` to lock and hoist the new packages

## 2. Shared Metrics Module

- [ ] 2.1 Create `packages/shared/src/metrics/metrics.module.ts` — wraps `PrometheusModule.register()` with `defaultMetrics: true` and accepts `appName` for `defaultLabels`
- [ ] 2.2 Create `packages/shared/src/metrics/metrics.controller.ts` — extends `PrometheusController`, decorated with `@Public()` and `@Controller({ version: VERSION_NEUTRAL, path: 'metrics' })`
- [ ] 2.3 Create `packages/shared/src/metrics/metrics-auth.guard.ts` — reads `METRICS_TOKEN` from `ConfigService`; returns 401 when set and token mismatches; open when unset
- [ ] 2.4 Create `packages/shared/src/metrics/http-metrics.interceptor.ts` — global interceptor recording `http_request_duration_seconds` histogram and `http_requests_total` counter, using `request.route?.path` for the `route` label; skips non-HTTP contexts; uses `[unknown]` for unmatched routes
- [ ] 2.5 Export all metrics types from `packages/shared/src/metrics/index.ts`

## 3. SharedModule Integration

- [ ] 3.1 Update `SharedModule.register()` in `packages/shared/src/modules/shared.module.ts` to accept an optional `metrics?: { appName: string }` param and conditionally import `MetricsModule`
- [ ] 3.2 Register `HttpMetricsInterceptor` as an `APP_INTERCEPTOR` alongside `LoggingInterceptor` and `CorrelationInterceptor`
- [ ] 3.3 Register `MetricsController` in `SharedModule` controllers array (alongside `HealthController`)

## 4. Per-App Wiring

- [ ] 4.1 Update `apps/auth/src/app.module.ts` to pass `metrics: { appName: 'auth' }` to `SharedModule.register()`
- [ ] 4.2 Update `apps/api/src/app.module.ts` to pass `metrics: { appName: 'api' }` to `SharedModule.register()`
- [ ] 4.3 Update `apps/notifications/src/app.module.ts` to pass `metrics: { appName: 'notifications' }` to `SharedModule.register()`
- [ ] 4.4 Update `apps/worker/src/app.module.ts` to pass `metrics: { appName: 'worker' }` to `SharedModule.register()`

## 5. Queue Metrics (Worker)

- [ ] 5.1 Create `apps/worker/src/metrics/queue-metrics.service.ts` — registers `bullmq_queue_depth{queue,state}` Gauge with a `collect()` callback that calls `queue.getJobCounts()` at scrape time; no timer
- [ ] 5.2 Update `apps/worker/src/consumer/email.consumer.ts` — add `@OnWorkerEvent('completed')` handler that records `bullmq_job_duration_seconds{queue,job_name}` histogram sample using `job.finishedOn - job.processedOn`
- [ ] 5.3 Update `apps/worker/src/consumer/email.consumer.ts` — update existing `@OnWorkerEvent('failed')` handler to also increment `bullmq_job_failures_total{queue,job_name}` counter

## 6. Docker Compose — Local Observability Stack

- [ ] 6.1 Create `docker/prometheus/prometheus.yml` with scrape configs for all four apps via `host.docker.internal`; include the Linux `extra_hosts` comment
- [ ] 6.2 Create `docker/grafana/provisioning/datasources/prometheus.yaml` provisioning the Prometheus datasource
- [ ] 6.3 Update `docker-compose.yaml` to add `prometheus` service (port 9090, volume mount `docker/prometheus`) and `grafana` service (port 3333, volume mount `docker/grafana/provisioning`)

## 7. Environment & Documentation

- [ ] 7.1 Add `METRICS_TOKEN=` (empty, documented) to `.env.example` with a comment explaining production usage
- [ ] 7.2 Run `pnpm build` and confirm all apps compile without errors
- [ ] 7.3 Run `pnpm docker:up` and verify Prometheus at `localhost:9090` and Grafana at `localhost:3333` start successfully
- [ ] 7.4 `curl http://localhost:<port>/api/<prefix>/metrics` for each app and confirm Prometheus text format response
