## Context

The monorepo has no `.github/workflows/` directory. Turborepo already defines the full task graph (`db:generate → build → test`, `lint`, `check-types`), so CI is a thin shell over `pnpm run <task>` commands. All unit tests are mocked — no Postgres, Redis, or MongoDB needed to run the quality gate.

Stack constraints: pnpm `10.33.0`, Node `>=22` (`.nvmrc` pins `v24.14.1`), Turborepo `2.x`.

## Goals / Non-Goals

**Goals:**
- Automated quality gate on all PRs and pushes to `main`/`develop`
- Actions-based cache for `pnpm store` + `.turbo/` — no external service required
- Commented deploy skeleton ready to uncomment (PM2 and Docker Compose variants)

**Non-Goals:**
- Vercel Remote Cache — opt-in per project, not set up here
- End-to-end / integration tests — those need service containers; addressed when E2E tests exist
- Actual deploy job — skeleton only, deployment is infrastructure-specific

## Decisions

### 1. Single job, not a matrix

A matrix of lint/types/build/test jobs would allow parallelism and independent failure messages, but adds ~30 s of runner startup per job and complicates cache sharing. Given Turborepo already parallelises within each command, a single linear job is sufficient.

_Alternative rejected_: parallel jobs with `needs:` graph — over-engineered for a template baseline.

### 2. `actions/setup-node` cache for pnpm, `actions/cache` for Turborepo

`actions/setup-node@v4` with `cache: pnpm` handles the pnpm content-addressable store natively (no manual `pnpm store path` needed). Turborepo's `.turbo/` directory requires a separate `actions/cache@v4` step because `setup-node` does not know about Turborepo.

Cache key strategy:
```
pnpm store : managed by setup-node (keyed on lockfile hash)
.turbo/    : ${{ runner.os }}-turbo-${{ github.sha }}
             restore: ${{ runner.os }}-turbo-
```

The `sha`-keyed save ensures each commit gets its own cache entry. The prefix-only restore key picks up the most recent prior entry (nearest ancestor on the same runner OS).

_Alternative rejected_: Vercel Remote Cache (`TURBO_TOKEN`) — requires an external account; not appropriate for a template default.

### 3. Node version from `.nvmrc`

`node-version-file: .nvmrc` rather than hardcoded `node-version: 24` — keeps CI version in sync with the dev machine without editing the workflow on every Node bump.

### 4. `pnpm install --frozen-lockfile`

Fails fast if someone edits `package.json` without regenerating `pnpm-lock.yaml`. The right behaviour for CI — surfaces the problem immediately rather than silently installing a different dep graph.

### 5. Deploy skeleton as commented YAML in the same file

A separate `deploy.yml` would be cleaner long-term, but an empty placeholder file causes confusion. Commented YAML in the same file is immediately visible without needing to know to look for a second file. Teams uncomment and move it when ready.

## Risks / Trade-offs

- **Cache poisoning across branches** → Turborepo restore key is prefix-only on `runner.os`, so a bad cache on one branch could be restored on another. Mitigation: Turborepo validates outputs by hash internally; a stale cache entry is ignored if the content hash mismatches.
- **`--frozen-lockfile` blocks renovate/dependabot PRs if they don't update the lockfile** → This is the intended behaviour — those PRs should update the lockfile.
- **Build time without remote cache** → Without Vercel Remote Cache, each run rebuilds all packages that Turborepo can't locally cache. For a fresh checkout (typical on first PR), full build runs. Acceptable for a template baseline.

## Open Questions

_(none — scope is clear and bounded)_
