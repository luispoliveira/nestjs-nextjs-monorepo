import { ApplicationConfig } from '@nestjs/core';
import { INestApplication, VersioningType } from '@nestjs/common';
import { mapToExcludeRoute } from '@nestjs/core/middleware/utils.js';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '@repo/database';
import { TEST_PASSWORD, truncateDatabase } from '@repo/testing-utils';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';

describe('auth app (E2E)', () => {
  let app: INestApplication;
  let db: DatabaseService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api/auth');
    // Mirror production: exclude health from the global prefix so it's at /health/live
    // (better-auth intercepts all /api/auth/* so health must be outside that prefix)
    const appConfig = app.get(ApplicationConfig);
    const current = appConfig.getGlobalPrefixOptions();
    appConfig.setGlobalPrefixOptions({
      ...current,
      exclude: [
        ...(current.exclude ?? []),
        ...mapToExcludeRoute(['health', 'health/*path']),
      ],
    });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();

    db = module.get(DatabaseService);
  });

  afterAll(async () => {
    await truncateDatabase(db);
    await app.close();
  });

  describe('GET /health/live', () => {
    it('returns 200', async () => {
      await supertest(app.getHttpServer()).get('/health/live').expect(200);
    });
  });

  describe('GET /api/auth/list-accounts (protected better-auth route)', () => {
    it('returns 401 without a session cookie', async () => {
      const response = await supertest(app.getHttpServer()).get(
        '/api/auth/list-accounts',
      );

      expect([401, 403]).toContain(response.status);
    });

    it('returns 200 with a valid injected session', async () => {
      // Use better-auth sign-up to get a proper password hash, then verify email manually
      const testEmail = `e2e-${Date.now()}@example.com`;
      await supertest(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
          name: 'E2E Test User',
        });

      // Mark email as verified (bypass email verification for testing)
      await db.user.updateMany({
        where: { email: testEmail },
        data: { emailVerified: true },
      });

      // Sign in via the better-auth API to get a properly signed session cookie
      const signInRes = await supertest(app.getHttpServer())
        .post('/api/auth/sign-in/email')
        .send({ email: testEmail, password: TEST_PASSWORD });

      expect(signInRes.status).toBe(200);

      const cookies: string[] = Array.isArray(signInRes.headers['set-cookie'])
        ? signInRes.headers['set-cookie']
        : [signInRes.headers['set-cookie']].filter(Boolean);
      const sessionCookieHeader = cookies.find((c) =>
        c.startsWith('better-auth.session_token='),
      );
      const sessionToken = sessionCookieHeader?.match(
        /better-auth\.session_token=([^;]+)/,
      )?.[1];

      expect(sessionToken).toBeTruthy();

      await supertest(app.getHttpServer())
        .get('/api/auth/list-accounts')
        .set('Cookie', `better-auth.session_token=${sessionToken}`)
        .expect(200);
    });
  });
});
