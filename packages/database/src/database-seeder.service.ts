import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit() {
    this.logger.log('Starting database seeding process...');

    this.logger.log('Database seeding completed successfully.');
  }
}
