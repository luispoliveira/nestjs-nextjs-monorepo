import { execSync } from 'node:child_process';
import { E2E_CONTAINERS_RUN_ID_ENV, E2E_RUN_LABEL } from './constants';

export default async function globalTeardown(): Promise<void> {
  const runId = process.env[E2E_CONTAINERS_RUN_ID_ENV];
  if (!runId) return;

  const ids = execSync(
    `docker ps -aq --filter "label=${E2E_RUN_LABEL}=${runId}"`,
  )
    .toString()
    .trim();

  if (!ids) return;

  try {
    execSync(`docker rm -f ${ids.split('\n').join(' ')}`, { stdio: 'ignore' });
  } catch {
    // Already removed (e.g. by Testcontainers' own Ryuk reaper) — safe to ignore.
  }
}
