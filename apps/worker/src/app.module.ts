import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from '@repo/mail';
import { QueueModule, QUEUES, SharedModule } from '@repo/shared';
import { EmailConsumer } from './consumer/email.consumer';

@Module({
  imports: [
    SharedModule.register(),
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
  ],
  controllers: [],
  providers: [EmailConsumer],
})
export class AppModule {}
