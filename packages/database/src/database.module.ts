import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseSeederService } from './database-seeder.service';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DatabaseService, DatabaseSeederService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
