import { IncomingMessage } from 'http';
import { Params } from 'nestjs-pino';
import { EnvironmentEnum } from '../enums';

const isProduction = process.env.NODE_ENV === EnvironmentEnum.PRODUCTION;

// Paths that generate too much noise and should be excluded from request logs
const SILENT_PATHS = ['/health', '/metrics', '/favicon.ico'];

export const pinoConfig: Params = {
  pinoHttp: {
    // Use debug in development for richer output, info in production
    level: isProduction ? 'info' : 'debug',

    // pino-pretty for human-readable logs in dev; raw JSON in production
    transport: !isProduction
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
            // Keep logs compact by hiding low-value fields
            ignore: 'pid,hostname',
            messageFormat: '{context} - {msg}',
          },
        }
      : undefined,

    // Attach a request-scoped context label to every HTTP log entry
    customProps: (req: IncomingMessage) => ({
      context: 'HTTP',
      requestId: (req as IncomingMessage & { id?: string | number }).id,
      correlationId:
        (req as unknown as Record<string, unknown>).correlationId ?? undefined,
    }),

    // Concise one-line message for successful requests
    customSuccessMessage: (
      req: IncomingMessage,
      res: { statusCode: number },
    ) => {
      const { method, url } = req as IncomingMessage & { url: string };
      return `${method} ${url} ${res.statusCode}`;
    },

    // Include the error message for failed requests
    customErrorMessage: (
      req: IncomingMessage,
      res: { statusCode: number },
      error: Error,
    ) => {
      const { method, url } = req as IncomingMessage & { url: string };
      return `${method} ${url} ${res.statusCode} - ${error.message}`;
    },

    // Escalate log level based on HTTP status: 4xx → warn, 5xx / errors → error
    customLogLevel: (
      _req: IncomingMessage,
      res: { statusCode: number },
      error?: Error,
    ) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },

    // Only log the request fields that are actually useful
    serializers: {
      req(req: {
        id: string;
        method: string;
        url: string;
        query: unknown;
        params: unknown;
        remoteAddress: string;
        remotePort: number;
      }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
        };
      },
      res(res: { statusCode: number }) {
        return { statusCode: res.statusCode };
      },
    },

    // Skip health-check and metrics endpoints to reduce log noise
    autoLogging: {
      ignore: (req: IncomingMessage) => SILENT_PATHS.includes(req.url ?? ''),
    },

    // Redact sensitive values so they never appear in logs
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
  },
};
