import { Module } from '@nestjs/common';
import { QueueModule, QUEUES, SharedModule } from '@repo/shared';
import { EmailConsumer } from './consumer/email.consumer';

@Module({
  imports: [
    SharedModule.register(),
    QueueModule.registerQueues([QUEUES.EMAIL]),
  ],
  controllers: [],
  providers: [EmailConsumer],
})
export class AppModule {}
