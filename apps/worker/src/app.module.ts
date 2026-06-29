import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from '@repo/mail';
import { QueueModule, QUEUES, SharedModule } from '@repo/shared';
import { EmailConsumer } from './consumer/email.consumer';
import { workerEnvSchema } from './env';
import { DlqModule } from './dlq/dlq.module';
import { QueueMetricsService } from './metrics/queue-metrics.service';

@Module({
  imports: [
    SharedModule.register({ validate: (c) => workerEnvSchema.parse(c), metrics: { appName: 'worker' } }),
    QueueModule.registerQueues([QUEUES.EMAIL]),
    MailModule.forRootAsync({
      provider: 'brevo',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        apiKey: configService.getOrThrow<string>('BREVO_API_KEY'),
        fromEmail: configService.getOrThrow<string>('FROM_EMAIL'),
        fromName: configService.get<string>('FROM_NAME', ''),
        devEmail: configService.get<string>('DEV_EMAIL', ''),
      }),
      inject: [ConfigService],
    }),
    DlqModule,
  ],
  controllers: [],
  providers: [EmailConsumer, QueueMetricsService],
})
export class AppModule {}
