## Why

Production backends need runtime observability beyond logs and error tracking — specifically request latency per endpoint, error rates, and queue throughput. The stack already silences `/metrics` in pino logs (anticipating this endpoint) but no metrics collection exists, leaving operations blind to performance degradation until users report it.

## What Changes

- Add `@willsoto/nestjs-prometheus` + `prom-client` to `packages/shared`
- Add a `MetricsModule` to `packages/shared` (always-on, like `TerminusModule`) exposing `GET /metrics` via a `@Public()` controller with optional bearer-token guard
- Add a global HTTP latency interceptor (histogram + counter, labelled by route pattern)
- Extend `SharedModule.register()` to accept `appName` and wire it into metric default labels
- Add BullMQ queue-depth gauges and job-duration histogram to `apps/worker` email consumer
- Add Prometheus + Grafana services to `docker-compose.yaml` with local scrape config targeting all four apps via `host.docker.internal`

## Capabilities

### New Capabilities

- `prometheus-metrics`: Prometheus-compatible `/metrics` endpoint, global HTTP metrics interceptor, optional bearer-token auth, and always-on process/runtime defaults — registered via `SharedModule`
- `queue-metrics`: BullMQ queue depth gauges and job duration histograms in the worker app, collected at scrape time (no polling timers)
- `local-observability-stack`: Prometheus + Grafana added to `docker-compose.yaml` with provisioned datasource and scrape targets for all apps

### Modified Capabilities

- `background-job-processing`: Worker email consumer gains `@OnWorkerEvent('completed')` alongside existing `failed` handler to populate job metrics

## Impact

- **`packages/shared`**: new `MetricsModule`, `MetricsController`, `HttpMetricsInterceptor`; `SharedModule.register()` gains `appName` param
- **`apps/auth`, `apps/api`, `apps/notifications`, `apps/worker`**: each `AppModule` passes `appName` to `SharedModule.register()`
- **`apps/worker`**: `EmailConsumer` gains completed/failed metric hooks and queue-depth gauge
- **`docker-compose.yaml`**: Prometheus + Grafana services; new `docker/prometheus/prometheus.yml` scrape config
- **New dependencies**: `@willsoto/nestjs-prometheus`, `prom-client` (both in `packages/shared/package.json`)
- **No breaking changes** — `SharedModule.register()` keeps existing behaviour when `appName` is omitted
