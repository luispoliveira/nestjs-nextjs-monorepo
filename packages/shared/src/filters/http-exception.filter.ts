import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod/v4';
import { CLS_CORRELATION_ID } from '../constants';
@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  constructor(private readonly clsService: ClsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const correlationId = this.clsService.get<string>(CLS_CORRELATION_ID);

    if (exception instanceof ZodValidationException) {
      return this.handleZodValidationException(
        exception,
        response,
        request,
        correlationId,
      );
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      correlationId,
    });
  }

  handleZodValidationException(
    exception: ZodValidationException,
    response: Response,
    request: Request,
    correlationId: string,
  ) {
    const zodError = exception.getZodError() as ZodError;

    this.logger.warn(
      `${request.method} ${request.url} - Validation failed`,
      JSON.stringify(zodError.issues),
    );

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: 'Validation failed',
      errors: zodError.issues,
      correlationId,
    });
  }
}
