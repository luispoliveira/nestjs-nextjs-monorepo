import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoService } from './mongo.service';
import { EmailLog, EmailLogSchema } from './schema/email-log.schema';
import { Log, LogSchema } from './schema/log.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
    MongooseModule.forFeature([
      { name: EmailLog.name, schema: EmailLogSchema },
    ]),
  ],
  providers: [MongoService],
  exports: [MongoService],
})
export class MongoModule {}
