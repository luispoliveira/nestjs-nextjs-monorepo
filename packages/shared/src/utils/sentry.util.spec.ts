import * as Sentry from '@sentry/nestjs';
import { SentryUtil } from './sentry.util';

jest.mock('@sentry/nestjs', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

describe('SentryUtil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SENTRY_DSN;
    delete process.env.NODE_ENV;
  });

  describe('init', () => {
    it('should not call Sentry.init when SENTRY_DSN is not set', () => {
      SentryUtil.init('my-app');
      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should call Sentry.init when SENTRY_DSN is set', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      SentryUtil.init('my-app');
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          initialScope: expect.objectContaining({ tags: { app: 'my-app' } }),
        }),
      );
    });

    it('should use NODE_ENV as environment when set', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.NODE_ENV = 'production';
      SentryUtil.init('worker');
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({ environment: 'production' }),
      );
    });

    it('should fall back to development when NODE_ENV is not set', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      SentryUtil.init('worker');
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({ environment: 'development' }),
      );
    });
  });

  describe('captureException', () => {
    it('should call Sentry.captureException with the exception', () => {
      const err = new Error('test error');
      SentryUtil.captureException(err);
      expect(Sentry.captureException).toHaveBeenCalledWith(err, undefined);
    });

    it('should forward extra context when provided', () => {
      const err = new Error('test');
      const ctx = { extra: { userId: '123' }, tags: { source: 'worker' } };
      SentryUtil.captureException(err, ctx);
      expect(Sentry.captureException).toHaveBeenCalledWith(err, ctx);
    });
  });
});
