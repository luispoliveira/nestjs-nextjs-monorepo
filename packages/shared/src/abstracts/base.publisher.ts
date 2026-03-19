import { Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ClsService } from 'nestjs-cls';
import { CLS_CORRELATION_ID } from '../constants';

export abstract class BasePublisher {
  protected readonly logger = new Logger(this.constructor.name);
  constructor(
    protected client: ClientProxy,
    protected clsService: ClsService,
  ) {}

  protected publish<T>(pattern: string, data: T) {
    const correlationId = this.clsService.get<string>(CLS_CORRELATION_ID);

    this.logger.debug(
      `Publishing event with pattern: ${pattern} and data: ${JSON.stringify(data)} and correlationId: ${correlationId}`,
    );

    this.client.emit(pattern, {
      ...data,
      correlationId,
    });
  }
}
