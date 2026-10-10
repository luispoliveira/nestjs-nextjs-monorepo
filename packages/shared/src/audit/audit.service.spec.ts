import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CLS_CORRELATION_ID } from '../constants/cls';
import { MongoService } from '../mongo/mongo.service';
import { SentryUtil } from '../utils/sentry.util';
import { AuditService } from './audit.service';

jest.mock('../utils/sentry.util', () => ({
  SentryUtil: { captureException: jest.fn() },
}));

const NOW = new Date('2026-10-10T10:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('AuditService', () => {
  let mongo: { createAuditEvent: jest.Mock };
  let config: { get: jest.Mock };
  let cls: { get: jest.Mock };
  let logger: jest.SpyInstance;
  let service: AuditService;

  const build = (retentionDays?: number) => {
    config = { get: jest.fn().mockReturnValue(retentionDays) };
    service = new AuditService(
      mongo as unknown as MongoService,
      config as unknown as ConfigService,
      cls as unknown as ClsService,
    );
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    mongo = { createAuditEvent: jest.fn().mockResolvedValue({}) };
    cls = { get: jest.fn().mockReturnValue('corr-cls') };
    logger = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    (SentryUtil.captureException as jest.Mock).mockClear();
    build(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const stored = () => mongo.createAuditEvent.mock.calls[0]![0] as Record<string, unknown>;

  describe('retention', () => {
    it('defaults to 365 days when AUDIT_RETENTION_DAYS is not set', async () => {
      await service.record({ action: 'auth.sign-in', outcome: 'success' });

      expect(config.get).toHaveBeenCalledWith('AUDIT_RETENTION_DAYS');
      expect(stored().occurredAt).toEqual(NOW);
      expect(stored().expireAt).toEqual(new Date(NOW.getTime() + 365 * DAY_MS));
    });

    it('uses AUDIT_RETENTION_DAYS when set', async () => {
      build(90);

      await service.record({ action: 'auth.sign-in', outcome: 'success' });

      expect(stored().expireAt).toEqual(new Date(NOW.getTime() + 90 * DAY_MS));
    });
  });

  describe('correlation id', () => {
    it('is filled from the CLS context when the input has none', async () => {
      await service.record({ action: 'auth.sign-in', outcome: 'success' });

      expect(cls.get).toHaveBeenCalledWith(CLS_CORRELATION_ID);
      expect(stored().correlationId).toBe('corr-cls');
    });

    it('keeps an explicit correlation id', async () => {
      await service.record({ action: 'auth.sign-in', outcome: 'success', correlationId: 'corr-explicit' });

      expect(stored().correlationId).toBe('corr-explicit');
    });

    it('still records when there is no CLS context', async () => {
      cls.get.mockImplementation(() => {
        throw new Error('no cls context');
      });

      await service.record({ action: 'auth.sign-in', outcome: 'success' });

      expect(stored().correlationId).toBeUndefined();
    });
  });

  describe('changes', () => {
    it('keeps only the safe fields and never stores unsafe values', async () => {
      await service.record({
        action: 'admin.user.update',
        outcome: 'success',
        changedFields: ['role', 'email', 'password', 'name'],
        changes: { role: 'admin', email: 'x@y.z', password: 'secret', name: 'Ana', banned: true },
      });

      expect(stored().changes).toEqual({ role: 'admin', banned: true });
      expect(stored().changedFields).toEqual(['role', 'email', 'password', 'name']);
      expect(JSON.stringify(stored())).not.toMatch(/secret|x@y\.z|Ana/);
    });

    it('omits `changes` when no safe field remains', async () => {
      await service.record({
        action: 'customer.update',
        outcome: 'success',
        changedFields: ['taxId'],
        changes: { taxId: '123456789' },
      });

      expect(stored()).not.toHaveProperty('changes');
      expect(JSON.stringify(stored())).not.toContain('123456789');
    });
  });

  describe('best-effort', () => {
    it('never rethrows when the storage fails, and reports it with action and correlation id', async () => {
      const boom = new Error('mongo down');
      mongo.createAuditEvent.mockRejectedValue(boom);

      await expect(service.record({ action: 'admin.user.ban', outcome: 'success' })).resolves.toBeUndefined();

      expect(logger).toHaveBeenCalled();
      expect(SentryUtil.captureException).toHaveBeenCalledWith(
        boom,
        expect.objectContaining({
          extra: expect.objectContaining({ action: 'admin.user.ban', correlationId: 'corr-cls' }),
        }),
      );
    });

    it('does not throw when building the event itself fails', async () => {
      config.get.mockImplementation(() => {
        throw new Error('config broke');
      });

      await expect(service.record({ action: 'auth.sign-in', outcome: 'success' })).resolves.toBeUndefined();

      expect(SentryUtil.captureException).toHaveBeenCalled();
      expect(mongo.createAuditEvent).not.toHaveBeenCalled();
    });
  });

  it('passes the identifying fields through unchanged', async () => {
    await service.record({
      action: 'admin.user.set-role',
      outcome: 'failure',
      errorCode: '403',
      actorId: 'a1',
      actorEmail: 'a@x.y',
      impersonatedById: 'a0',
      targetType: 'user',
      targetId: 'u1',
      ip: '10.0.0.1',
      userAgent: 'jest',
    });

    expect(stored()).toMatchObject({
      action: 'admin.user.set-role',
      outcome: 'failure',
      errorCode: '403',
      actorId: 'a1',
      actorEmail: 'a@x.y',
      impersonatedById: 'a0',
      targetType: 'user',
      targetId: 'u1',
      ip: '10.0.0.1',
      userAgent: 'jest',
    });
  });
});
