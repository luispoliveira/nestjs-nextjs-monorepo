import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@repo/database';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
