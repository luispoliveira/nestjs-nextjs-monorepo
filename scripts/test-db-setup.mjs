#!/usr/bin/env node
/**
 * Creates the `nestjs_test` PostgreSQL database (if it does not exist) and
 * runs Prisma migrations against it.
 *
 * Usage: node scripts/test-db-setup.mjs
 * Prerequisites: Postgres must be running (pnpm docker:up)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load base DATABASE_URL from apps/auth/.env ────────────────────────────────
function loadEnvVar(envFile, key) {
  try {
    const content = readFileSync(resolve(ROOT, envFile), 'utf8');
    const match = content.match(new RegExp(`^${key}=["']?([^"'\n]+)["']?`, 'm'));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

const baseUrl =
  process.env.DATABASE_URL ||
  loadEnvVar('apps/auth/.env', 'DATABASE_URL') ||
  loadEnvVar('packages/database/.env', 'DATABASE_URL');

if (!baseUrl) {
  console.error(
    'Error: DATABASE_URL not found. Set it in process.env or apps/auth/.env',
  );
  process.exit(1);
}

// ── Parse the connection URL and replace db name with nestjs_test ─────────────
const url = new URL(baseUrl);
const adminUrl = new URL(baseUrl);
adminUrl.pathname = '/postgres'; // connect to postgres db to run CREATE DATABASE

const testDbName = 'nestjs_test';
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${testDbName}`;

// Preserve ?schema=public query param
const schemaParam = url.searchParams.get('schema');
if (schemaParam) {
  testUrl.searchParams.set('schema', schemaParam);
}

const testDatabaseUrl = testUrl.toString();

// ── Create the test database if it does not exist ────────────────────────────
const client = new pg.Client({ connectionString: adminUrl.toString() });

try {
  await client.connect();

  const { rows } = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [testDbName],
  );

  if (rows.length === 0) {
    // Database names cannot be parameterised
    await client.query(`CREATE DATABASE "${testDbName}"`);
    console.log(`✔ Created database: ${testDbName}`);
  } else {
    console.log(`✔ Database already exists: ${testDbName}`);
  }
} finally {
  await client.end();
}

// ── Run Prisma migrations against the test database ───────────────────────────
console.log(`Running prisma migrate deploy against ${testDbName}...`);
execSync('pnpm --filter @repo/database db:migrate:deploy', {
  cwd: ROOT,
  env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  stdio: 'inherit',
});

console.log(`✔ Test database ready: ${testDbName}`);
