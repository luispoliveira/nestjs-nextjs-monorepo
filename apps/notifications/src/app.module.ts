import { Module } from '@nestjs/common';
import { QueueModule, QUEUES, SharedModule } from '@repo/shared';

@Module({
  imports: [
    SharedModule.register(),
    QueueModule.registerQueues([QUEUES.EMAIL]),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
