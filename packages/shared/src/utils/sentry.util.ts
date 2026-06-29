import * as Sentry from '@sentry/nestjs';

export class SentryUtil {
  static init(appName: string): void {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
        ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
        : 0,
      initialScope: {
        tags: { app: appName },
      },
    });
  }

  static captureException(
    exception: unknown,
    context?: {
      extra?: Record<string, unknown>;
      tags?: Record<string, string>;
    },
  ): void {
    Sentry.captureException(exception, context);
  }
}
