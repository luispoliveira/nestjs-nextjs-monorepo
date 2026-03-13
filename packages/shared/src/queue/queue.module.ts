import { BullModule } from '@nestjs/bull';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProducer } from './producers';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: 500,
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class QueueModule {
  static registerQueues(queues: string[]): DynamicModule {
    return {
      imports: [
        ...queues.map((queue) => BullModule.registerQueue({ name: queue })),
      ],
      providers: [EmailProducer],
      exports: [EmailProducer],
      module: QueueModule,
    };
  }
}
