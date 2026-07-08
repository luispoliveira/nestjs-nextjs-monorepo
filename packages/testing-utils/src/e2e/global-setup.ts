import { execSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait } from 'testcontainers';
import { E2E_CONTAINERS_RUN_ID_ENV, E2E_RUN_LABEL } from './constants';

export default async function globalSetup(): Promise<void> {
  const runId = String(process.pid);

  const postgres = await new PostgreSqlContainer('postgres:17-alpine')
    .withLabels({ [E2E_RUN_LABEL]: runId })
    .start();

  const mongo = await new GenericContainer('mongo:6.0')
    .withExposedPorts(27017)
    .withWaitStrategy(Wait.forLogMessage(/Waiting for connections/))
    .withLabels({ [E2E_RUN_LABEL]: runId })
    .start();

  const databaseUrl = `${postgres.getConnectionUri()}?schema=public`;
  const mongoUri = `mongodb://${mongo.getHost()}:${mongo.getMappedPort(27017)}`;

  // Reuses the same command scripts/test-db-setup.mjs runs locally, just
  // pointed at the ephemeral container instead of a fixed database.
  execSync('pnpm --filter @repo/database db:migrate:deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
    timeout: 120_000,
  });

  process.env.DATABASE_URL = databaseUrl;
  process.env.MONGO_URI = mongoUri;
  process.env[E2E_CONTAINERS_RUN_ID_ENV] = runId;
}
