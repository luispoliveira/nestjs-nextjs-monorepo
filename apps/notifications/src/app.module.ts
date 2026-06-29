import { Module } from '@nestjs/common';
import { QueueModule, QUEUES, SharedModule } from '@repo/shared';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { notificationsEnvSchema } from './env';

@Module({
  imports: [
    SharedModule.register({ validate: (c) => notificationsEnvSchema.parse(c) }),
    QueueModule.registerQueues([QUEUES.EMAIL]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
