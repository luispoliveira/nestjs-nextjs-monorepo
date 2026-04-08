#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { createInterface } from 'readline/promises';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── ANSI helpers ────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
};
const log = (msg) => process.stdout.write(msg + '\n');
const step = (msg) => log(`\n${c.bold}${c.cyan}▸ ${msg}${c.reset}`);
const ok = (msg) => log(`  ${c.green}✔${c.reset} ${msg}`);
const skip = (msg) => log(`  ${c.yellow}⚠${c.reset}  ${msg}`);

// ─── Prompt helper ───────────────────────────────────────────────────────────
async function prompt(rl, question, defaultValue) {
  const hint = defaultValue ? ` ${c.dim}(${defaultValue})${c.reset}` : '';
  const answer = await rl.question(`    ${question}${hint}: `);
  return answer.trim() || defaultValue || '';
}

// ─── Replace DB credentials in an .env file content ──────────────────────────
function applyCredentials(content, pg, mongo) {
  // postgres://USER:PASS@HOST:PORT/DB?query
  content = content.replace(
    /(postgres:\/\/)[^:@]+:[^@]*@([^/]+)\/[^?'"\s]*/g,
    (_, proto, host) =>
      `${proto}${encodeURIComponent(pg.user)}:${encodeURIComponent(pg.password)}@${host}/${pg.db}`,
  );
  // mongodb://USER:PASS@HOST:PORT/DB?query  (preserve ?authSource=admin)
  content = content.replace(
    /(mongodb:\/\/)[^:@]+:[^@]*@([^/]+)\/([^?'"\s]*)(\?[^'"\s]*)?/g,
    (_, proto, host, _db, qs) =>
      `${proto}${encodeURIComponent(mongo.user)}:${encodeURIComponent(mongo.password)}@${host}/${mongo.db}${qs ?? ''}`,
  );
  return content;
}

// ─── Files to copy & patch ───────────────────────────────────────────────────
const APP_ENV_FILES = [
  ['.env.example', '.env'],
  ['apps/auth/.env.example', 'apps/auth/.env'],
  ['apps/api/.env.example', 'apps/api/.env'],
  ['apps/notifications/.env.example', 'apps/notifications/.env'],
  ['apps/worker/.env.example', 'apps/worker/.env'],
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  log(`\n${c.bold}${c.cyan}╔══════════════════════════════════╗`);
  log(`║      Project Setup Wizard        ║`);
  log(`╚══════════════════════════════════╝${c.reset}`);

  // 1. Project name ────────────────────────────────────────────────────────
  step('Project name');
  const pkgPath = resolve(ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const projectName = await prompt(rl, 'Name', pkg.name);

  // 2. PostgreSQL ──────────────────────────────────────────────────────────
  step('PostgreSQL');
  const pgDb = await prompt(rl, 'Database name', 'nestjs');
  const pgUser = await prompt(rl, 'Username', 'nestjs');
  const pgPassword = await prompt(rl, 'Password', 'change-me');

  // 3. MongoDB ─────────────────────────────────────────────────────────────
  step('MongoDB');
  const mongoDb = await prompt(rl, 'Database name', 'nestjs');
  const mongoUser = await prompt(rl, 'Username', 'nestjs');
  const mongoPassword = await prompt(rl, 'Password', 'change-me');

  rl.close();

  const pg = { db: pgDb, user: pgUser, password: pgPassword };
  const mongo = { db: mongoDb, user: mongoUser, password: mongoPassword };

  // ── Apply ────────────────────────────────────────────────────────────────
  step('Applying changes');

  // Update package.json name
  if (projectName !== pkg.name) {
    pkg.name = projectName;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    ok(`package.json  name → "${projectName}"`);
  }

  // App .env files
  for (const [src, dest] of APP_ENV_FILES) {
    const srcPath = resolve(ROOT, src);
    const destPath = resolve(ROOT, dest);
    if (!existsSync(srcPath)) {
      skip(`${src} not found, skipping`);
      continue;
    }
    if (existsSync(destPath)) {
      skip(`${dest} already exists, skipping`);
      continue;
    }
    const content = applyCredentials(readFileSync(srcPath, 'utf8'), pg, mongo);
    writeFileSync(destPath, content);
    ok(`${src} → ${dest}`);
  }

  // docker/postgres.env
  {
    const srcPath = resolve(ROOT, 'docker/postgres.env.example');
    const destPath = resolve(ROOT, 'docker/postgres.env');
    if (!existsSync(srcPath)) {
      skip('docker/postgres.env.example not found, skipping');
    } else if (existsSync(destPath)) {
      skip('docker/postgres.env already exists, skipping');
    } else {
      const content = readFileSync(srcPath, 'utf8')
        .replace(/^POSTGRES_DB=.*/m, `POSTGRES_DB="${pg.db}"`)
        .replace(/^POSTGRES_USER=.*/m, `POSTGRES_USER="${pg.user}"`)
        .replace(
          /^POSTGRES_PASSWORD=.*/m,
          `POSTGRES_PASSWORD="${pg.password}"`,
        );
      writeFileSync(destPath, content);
      ok('docker/postgres.env.example → docker/postgres.env');
    }
  }

  // docker/mongo.env
  {
    const srcPath = resolve(ROOT, 'docker/mongo.env.example');
    const destPath = resolve(ROOT, 'docker/mongo.env');
    if (!existsSync(srcPath)) {
      skip('docker/mongo.env.example not found, skipping');
    } else if (existsSync(destPath)) {
      skip('docker/mongo.env already exists, skipping');
    } else {
      const content = readFileSync(srcPath, 'utf8')
        .replace(
          /^MONGO_INITDB_ROOT_USERNAME=.*/m,
          `MONGO_INITDB_ROOT_USERNAME=${mongo.user}`,
        )
        .replace(
          /^MONGO_INITDB_ROOT_PASSWORD=.*/m,
          `MONGO_INITDB_ROOT_PASSWORD=${mongo.password}`,
        )
        .replace(
          /^MONGO_INITDB_DATABASE=.*/m,
          `MONGO_INITDB_DATABASE=${mongo.db}`,
        );
      writeFileSync(destPath, content);
      ok('docker/mongo.env.example → docker/mongo.env');
    }
  }

  log(`\n${c.bold}${c.green}✔ Setup complete!${c.reset}`);
  log(`${c.dim}  Next steps: pnpm docker:up && pnpm dev${c.reset}\n`);
}

main().catch((err) => {
  process.stderr.write(`\n\x1b[31mError: ${err.message}\x1b[0m\n`);
  process.exit(1);
});
