'use strict';

/**
 * PM2 Ecosystem — PROD / QA
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 start ecosystem.config.js --env qa
 *
 * Log rotation (install once per server):
 *   pm2 install pm2-logrotate
 *   pm2 set pm2-logrotate:max_size 20M
 *   pm2 set pm2-logrotate:retain 30
 *   pm2 set pm2-logrotate:compress true
 *   pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
 *   pm2 set pm2-logrotate:workerInterval 3600
 *
 * Env files per app (create before deploying):
 *   apps/auth/.env.production        apps/auth/.env.qa
 *   apps/api/.env.production         apps/api/.env.qa
 *   apps/notifications/.env.production  apps/notifications/.env.qa
 *   apps/worker/.env.production      apps/worker/.env.qa
 *   apps/web/.env.production         apps/web/.env.qa
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Loads environment variables from <appDir>/.env.<envName>.
 * Falls back to <appDir>/.env if the environment-specific file is missing.
 *
 * @param {string} appDir  - Relative path to the app folder (e.g. 'apps/auth')
 * @param {string} envName - Environment name ('production' | 'qa')
 * @returns {Record<string, string>}
 */
function loadEnv(appDir, envName) {
  const specificFile = path.resolve(appDir, `.env.${envName}`);
  const fallbackFile = path.resolve(appDir, '.env');

  const file = fs.existsSync(specificFile) ? specificFile : fallbackFile;

  if (!fs.existsSync(file)) {
    console.warn(`[PM2] WARNING: No env file found for ${appDir} (${envName})`);
    return {};
  }

  return dotenv.parse(fs.readFileSync(file));
}

// ---------------------------------------------------------------------------
// Shared defaults
// ---------------------------------------------------------------------------

/** Options forwarded to pm2-logrotate via file-level config */
const logRotate = {
  log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  merge_logs: true,
};

/**
 * HTTP NestJS services (auth, api, web) — stateless, cluster-safe.
 */
const httpServiceDefaults = {
  ...logRotate,
  instances: process.env.NODE_APP_INSTANCES || 2,
  exec_mode: 'cluster',
  autorestart: true,
  watch: false,
  max_memory_restart: '1G',
  restart_delay: 5000,
  max_restarts: 10,
  min_uptime: '10s',
  kill_timeout: 5000,
  listen_timeout: 10000,
  wait_ready: true,
};

/**
 * Bull queue consumer (worker).
 * Cluster is safe — Bull distributes jobs via Redis so each instance picks up
 * separate jobs (competing consumers). Scale instances to increase throughput.
 */
const workerDefaults = {
  ...logRotate,
  instances: process.env.NODE_APP_INSTANCES || 2,
  exec_mode: 'cluster',
  autorestart: true,
  watch: false,
  max_memory_restart: '512M',
  restart_delay: 5000,
  max_restarts: 10,
  min_uptime: '10s',
  kill_timeout: 5000,
  listen_timeout: 10000,
  wait_ready: true,
};

/**
 * Redis pub/sub transport (notifications).
 * MUST stay fork:1 — Redis pub/sub delivers each message to ALL subscribers,
 * so multiple instances would process every event N times (fan-out).
 */
const redisTransportDefaults = {
  ...logRotate,
  instances: 1,
  exec_mode: 'fork',
  autorestart: true,
  watch: false,
  max_memory_restart: '512M',
  restart_delay: 5000,
  max_restarts: 10,
  min_uptime: '10s',
  kill_timeout: 5000,
  listen_timeout: 10000,
  wait_ready: true,
};

// ---------------------------------------------------------------------------
// App definitions
// ---------------------------------------------------------------------------

const LOG_DIR = './logs';

module.exports = {
  apps: [
    // -------------------------------------------------------------------------
    // auth — HTTP + better-auth session management
    // -------------------------------------------------------------------------
    {
      ...httpServiceDefaults,
      name: 'auth',
      script: './apps/auth/dist/main.js',
      error_file: `${LOG_DIR}/auth-error.log`,
      out_file: `${LOG_DIR}/auth-out.log`,
      env_production: {
        NODE_ENV: 'production',
        ...loadEnv('apps/auth', 'production'),
      },
      env_qa: {
        NODE_ENV: 'qa',
        ...loadEnv('apps/auth', 'qa'),
      },
    },

    // -------------------------------------------------------------------------
    // api — tRPC / REST API gateway
    // -------------------------------------------------------------------------
    {
      ...httpServiceDefaults,
      name: 'api',
      script: './apps/api/dist/main.js',
      error_file: `${LOG_DIR}/api-error.log`,
      out_file: `${LOG_DIR}/api-out.log`,
      env_production: {
        NODE_ENV: 'production',
        ...loadEnv('apps/api', 'production'),
      },
      env_qa: {
        NODE_ENV: 'qa',
        ...loadEnv('apps/api', 'qa'),
      },
    },

    // -------------------------------------------------------------------------
    // notifications — Redis pub/sub transport, fork:1 (fan-out risk)
    // -------------------------------------------------------------------------
    {
      ...redisTransportDefaults,
      name: 'notifications',
      script: './apps/notifications/dist/main.js',
      error_file: `${LOG_DIR}/notifications-error.log`,
      out_file: `${LOG_DIR}/notifications-out.log`,
      env_production: {
        NODE_ENV: 'production',
        ...loadEnv('apps/notifications', 'production'),
      },
      env_qa: {
        NODE_ENV: 'qa',
        ...loadEnv('apps/notifications', 'qa'),
      },
    },

    // -------------------------------------------------------------------------
    // worker — Bull queue consumer, cluster-safe (competing consumers)
    // -------------------------------------------------------------------------
    {
      ...workerDefaults,
      name: 'worker',
      script: './apps/worker/dist/main.js',
      error_file: `${LOG_DIR}/worker-error.log`,
      out_file: `${LOG_DIR}/worker-out.log`,
      env_production: {
        NODE_ENV: 'production',
        ...loadEnv('apps/worker', 'production'),
      },
      env_qa: {
        NODE_ENV: 'qa',
        ...loadEnv('apps/worker', 'qa'),
      },
    },

    // -------------------------------------------------------------------------
    // web — Next.js (App Router, standalone output), cluster-safe
    // -------------------------------------------------------------------------
    {
      ...httpServiceDefaults,
      name: 'web',
      script: './apps/web/.next/standalone/apps/web/server.js',
      error_file: `${LOG_DIR}/web-error.log`,
      out_file: `${LOG_DIR}/web-out.log`,
      env_production: {
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0',
        ...loadEnv('apps/web', 'production'),
      },
      env_qa: {
        NODE_ENV: 'qa',
        HOSTNAME: '0.0.0.0',
        ...loadEnv('apps/web', 'qa'),
      },
    },
  ],
};
