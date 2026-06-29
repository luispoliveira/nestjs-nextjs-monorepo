## 1. Workflow File

- [ ] 1.1 Create `.github/workflows/ci.yml` with the quality-gate job (triggers, concurrency, steps: checkout → pnpm setup → node setup → turbo cache → install → db:generate → lint → check-types → build → test)
- [ ] 1.2 Add the commented deploy skeleton (PM2 + Docker Compose variants) as a `deploy` job block at the end of `ci.yml`

## 2. Verification

- [ ] 2.1 Confirm the workflow YAML is valid (run `npx js-yaml .github/workflows/ci.yml` or check with `actionlint` if available)
- [ ] 2.2 Verify `pnpm db:generate` succeeds locally without a running database (confirms CI will not fail on that step)
