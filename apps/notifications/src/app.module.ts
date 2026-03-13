import { Module } from '@nestjs/common';
import { QueueModule, QUEUES, SharedModule } from '@repo/shared';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    SharedModule.register(),
    QueueModule.registerQueues([QUEUES.EMAIL]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
