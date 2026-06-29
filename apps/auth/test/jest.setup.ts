import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  // process.cwd() is the package root (apps/auth/) in both CJS and ESM modes
  path: path.resolve(process.cwd(), '.env.test'),
  override: true,
});

// Ensure critical env vars are set for all test suites
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://nestjs:nestjs@localhost:5432/nestjs_test?schema=public';

process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ??
  'test-secret-for-jest-do-not-use-in-production';

process.env.MONGO_URI =
  process.env.MONGO_URI ??
  'mongodb://nestjs:nestjs@localhost:27017/nestjs?authSource=admin';

process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
