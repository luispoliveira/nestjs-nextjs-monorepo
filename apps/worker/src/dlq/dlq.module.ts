import { Module } from '@nestjs/common';
import { QueueModule, QUEUES } from '@repo/shared';
import { DlqController } from './dlq.controller';
import { EmailDlqService } from './email.dlq.service';

@Module({
  imports: [QueueModule.registerQueues([QUEUES.EMAIL])],
  providers: [EmailDlqService],
  controllers: [DlqController],
  exports: [EmailDlqService],
})
export class DlqModule {}
