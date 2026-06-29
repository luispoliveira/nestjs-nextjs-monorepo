## Context

The monorepo runs four NestJS apps (`auth`, `api`, `notifications`, `worker`) all bootstrapped through the same `SharedModule.register()` pattern. `packages/shared` already centralises global concerns — filters, interceptors, guards, health — making it the natural home for a metrics abstraction. The pino config already silences `/metrics` in logs, signalling this path was anticipated. `@willsoto/nestjs-prometheus` 6.1.0 explicitly supports `@nestjs/common ^11`, so no compatibility risk.

## Goals / Non-Goals

**Goals:**

- Expose a Prometheus-compatible `GET /metrics` endpoint on every app, always-on with no per-app opt-in
- Collect HTTP latency histograms and request counters labelled by route pattern (not raw URL)
- Collect BullMQ queue depth (waiting/active/delayed/failed) and job duration in the worker app
- Include Prometheus + Grafana in `docker-compose.yaml` for local development
- Support optional bearer-token protection for the `/metrics` endpoint via `METRICS_TOKEN` env var

**Non-Goals:**

- Distributed tracing (Sentry tracing remains at `tracesSampleRate: 0`)
- OpenTelemetry (OTel migration deferred; prom-client is the endpoint, not a gateway)
- Custom Grafana dashboards (provisioned datasource is sufficient; dashboards are ops responsibility)
- Exposing metrics from Next.js `apps/web` (not a NestJS app, different runtime)

## Decisions

### Decision 1: `@willsoto/nestjs-prometheus` over raw `prom-client` or `nestjs-otel`

`@willsoto/nestjs-prometheus` follows the same thin-wrapper pattern as `nestjs-pino`, `nestjs-zod`, `nestjs-cls` — it wires `prom-client` into NestJS DI without hiding the underlying API. `nestjs-otel` bundles distributed tracing, which is explicitly out of scope and would pull in a large SDK. Raw `prom-client` requires writing ~30 lines of DI plumbing already solved by the wrapper.

### Decision 2: `SharedModule` is always-on, `appName` threads the label

`TerminusModule` and `HealthController` have no per-app opt-in — metrics follow the same model. `SharedModule.register()` gains a `metrics?: { appName: string }` option; when present, the `PrometheusModule` is initialised with `defaultLabels: { app: appName }`. This is optional to avoid breaking the existing API; apps that don't pass it still get metrics (without the `app` label).

The string already exists per-app as the first argument to `SentryUtil.init('auth')` — caller responsibility, same as Sentry.

### Decision 3: Route-pattern labels via `ExecutionContext`, not raw URL

The HTTP interceptor uses `request.route?.path` (Express) which gives `/users/:id` not `/users/123`, preventing cardinality explosion. Microservice contexts (Redis transport) are skipped — the interceptor checks `context.getType() === 'http'` before collecting.

### Decision 4: Bearer-token guard reads `METRICS_TOKEN` env, fails open when unset

When `METRICS_TOKEN` is not set, the endpoint is open — appropriate for local dev and private-network scraping. When set, the `MetricsAuthGuard` checks `Authorization: Bearer <token>`. Prometheus's `scrape_config` supports `authorization.credentials` natively, so no client-side custom headers needed.

```
METRICS_TOKEN unset  →  open (local dev, private network)
METRICS_TOKEN set    →  requires Authorization: Bearer <token>
```

### Decision 5: Queue depth gathered at scrape time, not on a timer

`prom-client` Gauge `collect()` callback runs synchronously at scrape time. Calling `queue.getJobCounts()` inside this callback avoids timers, eliminates drift, and costs nothing when no scraper is active. Job duration uses BullMQ `@OnWorkerEvent('completed')` — the `job.finishedOn - job.processedOn` delta is already available on the job object.

### Decision 6: Separate `docker/prometheus/` config directory

Prometheus config (`prometheus.yml`) is written to `docker/prometheus/prometheus.yml` — not inline in `docker-compose.yaml` — so scrape targets can be edited without touching the compose file. Grafana provisioning goes to `docker/grafana/provisioning/datasources/prometheus.yaml`.

## Risks / Trade-offs

- **Cardinality creep from custom routes** → Mitigation: interceptor uses `request.route?.path`; if undefined (e.g., 404), falls back to a bucketed `[unknown]` label rather than the raw URL.
- **`host.docker.internal` not available on Linux** → Mitigation: `prometheus.yml` uses `host.docker.internal` with a comment noting Linux contributors should add `extra_hosts: ["host.docker.internal:host-gateway"]` to the Prometheus service in compose.
- **`/metrics` publicly accessible when `METRICS_TOKEN` unset** → Mitigation: documented in `.env.example`; default metrics expose process info (heap, versions) but not business data. For production the env var is expected to be set.
- **Per-app `appName` is opt-in** → Mitigation: `SharedModule.register()` keeps `metrics` optional so existing code doesn't break; CLAUDE.md will document passing `appName` as a convention.

## Migration Plan

1. Add dependencies to `packages/shared/package.json` and run `pnpm install`
2. Add `MetricsModule`, `MetricsController`, `MetricsAuthGuard`, `HttpMetricsInterceptor` to `packages/shared/src/metrics/`
3. Wire into `SharedModule.register()` — no existing app modules change structure
4. Update each app's `AppModule` to pass `appName` to `SharedModule.register()`
5. Update `apps/worker` `EmailConsumer` with queue metrics
6. Add `docker/prometheus/prometheus.yml` and `docker/grafana/provisioning/datasources/prometheus.yaml`
7. Update `docker-compose.yaml` with Prometheus + Grafana services
8. Update `.env.example` with `METRICS_TOKEN` docs
9. Verify `pnpm build` passes, `docker:up` starts prometheus + grafana, and `curl localhost:3000/api/auth/metrics` returns prom text

Rollback: remove the `metrics` import from `SharedModule` — the endpoint disappears, all other behaviour unchanged.

## Open Questions

- Should Grafana's default admin password be overridden via env var in compose, or left as the default `admin/admin` for local dev?
- Are there any apps running in PM2 cluster mode that would need aggregated metrics (pushgateway pattern)?
