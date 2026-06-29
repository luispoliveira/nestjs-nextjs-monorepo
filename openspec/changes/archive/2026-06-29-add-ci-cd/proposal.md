## Why

There are zero GitHub Actions workflows in this repository. PRs can merge with broken builds, type errors, or failing tests without anyone noticing. A CI quality gate is the lowest-cost safety net for a team working on this monorepo.

## What Changes

- Add `.github/workflows/ci.yml` — a single quality-gate workflow that runs on all PRs and pushes to `main`/`develop`
- The workflow runs: `pnpm install` → `db:generate` → `lint` → `check-types` → `build` → `test`
- GitHub Actions cache for both `pnpm store` and `.turbo/` to avoid redundant work across runs
- Commented deploy skeleton (PM2 and Docker Compose variants) for teams to uncomment and customise

## Capabilities

### New Capabilities

- `github-actions-ci`: Automated quality gate workflow — installs deps, generates Prisma client, lints, type-checks, builds, and runs unit tests on every PR and push to main/develop

### Modified Capabilities

_(none — this change only adds files, it does not alter existing application behaviour)_

## Impact

- New file: `.github/workflows/ci.yml`
- No changes to `apps/`, `packages/`, or any existing source files
- No new dependencies
- No new secrets required (Actions cache is free; deploy skeleton secrets are commented)
- `pnpm db:generate` in CI does NOT require a live database — reads only the Prisma schema
- Turborepo task graph already correct; CI uses the same commands as local dev
