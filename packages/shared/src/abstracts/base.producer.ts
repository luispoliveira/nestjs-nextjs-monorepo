import { Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { ClsService } from 'nestjs-cls';

export abstract class BaseProducer {
  protected readonly logger = new Logger(this.constructor.name);
  constructor(
    private readonly queue: Queue,
    protected clsService: ClsService,
  ) {}

  protected async addJob<T>(name: string, data: T) {
    const correlationId = this.clsService.get<string>('correlationId');

    this.logger.debug(
      `Adding job to queue with name: ${name} and data: ${JSON.stringify(data)} and correlationId: ${correlationId}`,
    );

    await this.queue.add(name, {
      ...data,
      correlationId,
    });
  }
}
