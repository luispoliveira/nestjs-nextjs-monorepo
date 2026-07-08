import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedModule } from '@repo/shared';
import { cronEnvSchema } from './env';
import { ExampleCronService } from './example/example-cron.service';

@Module({
  imports: [
    SharedModule.register({
      validate: (c) => cronEnvSchema.parse(c),
      metrics: { appName: 'cron' },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [ExampleCronService],
})
export class AppModule {}
