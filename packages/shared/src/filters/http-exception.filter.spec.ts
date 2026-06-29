import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ClsService } from 'nestjs-cls';
import { ZodValidationException } from 'nestjs-zod';
import { AllExceptionFilter } from './http-exception.filter';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

const makeHttpContext = (overrides: Record<string, unknown> = {}) => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status, ...overrides };
  const request = { method: 'GET', url: '/test', ...overrides };

  return {
    json,
    status,
    response,
    request,
    host: {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost,
  };
};

describe('AllExceptionFilter', () => {
  let filter: AllExceptionFilter;
  let clsService: jest.Mocked<ClsService>;

  beforeEach(() => {
    clsService = { get: jest.fn().mockReturnValue('corr-123') } as unknown as jest.Mocked<ClsService>;
    filter = new AllExceptionFilter(clsService);
    jest.clearAllMocks();
  });

  describe('HTTP context', () => {
    it('should return structured JSON for an HttpException', () => {
      const { host, status, json } = makeHttpContext();
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, host);

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          correlationId: 'corr-123',
          path: '/test',
        }),
      );
    });

    it('should return 500 for unknown errors', () => {
      const { host, status, json } = makeHttpContext();
      const exception = new Error('Something went wrong');

      filter.catch(exception, host);

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 500 }),
      );
    });

    it('should call Sentry.captureException for 5xx errors', () => {
      const { host } = makeHttpContext();
      const exception = new HttpException('Server error', 500);

      filter.catch(exception, host);

      expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    });

    it('should NOT call Sentry.captureException for 4xx errors', () => {
      const { host } = makeHttpContext();
      const exception = new HttpException('Bad request', 400);

      filter.catch(exception, host);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should return 400 with errors array for ZodValidationException', () => {
      const { host, status, json } = makeHttpContext();
      const zodError = { issues: [{ message: 'Required', path: ['email'] }] };
      const exception = {
        getZodError: jest.fn().mockReturnValue(zodError),
      } as unknown as ZodValidationException;

      Object.setPrototypeOf(exception, ZodValidationException.prototype);
      filter.catch(exception, host);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Validation failed',
          errors: zodError.issues,
        }),
      );
    });
  });

  describe('RPC context', () => {
    it('should re-throw and capture exception in RPC context', () => {
      const exception = new Error('RPC error');
      const host = {
        getType: jest.fn().mockReturnValue('rpc'),
      } as unknown as ArgumentsHost;

      expect(() => filter.catch(exception, host)).toThrow(exception);
      expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    });
  });
});
