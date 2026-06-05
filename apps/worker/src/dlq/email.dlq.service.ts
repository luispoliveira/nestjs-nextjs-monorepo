import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { BaseDlqService, QUEUES } from '@repo/shared';
import { Queue } from 'bullmq';

@Injectable()
export class EmailDlqService extends BaseDlqService {
  constructor(
    @InjectQueue(QUEUES.EMAIL_DLQ) dlqQueue: Queue,
    @InjectQueue(QUEUES.EMAIL) originalQueue: Queue,
  ) {
    super(dlqQueue, originalQueue);
  }
}
