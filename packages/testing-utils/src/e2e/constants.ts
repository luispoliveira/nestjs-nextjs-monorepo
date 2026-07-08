// Jest loads globalSetup and globalTeardown as separate module instances, so
// state can't be shared via a module-level variable — only via process.env,
// which is the same OS process for both.
export const E2E_CONTAINERS_RUN_ID_ENV = '__E2E_CONTAINERS_RUN_ID__';
export const E2E_RUN_LABEL = 'monorepo-e2e-run';
