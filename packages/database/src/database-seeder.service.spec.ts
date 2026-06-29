jest.mock('../generated/prisma/client', () => ({
  PrismaClient: class MockPrismaClient {
    $connect = jest.fn().mockResolvedValue(undefined);
    $disconnect = jest.fn().mockResolvedValue(undefined);
    constructor(_opts?: unknown) {}
  },
}));

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseSeederService } from './database-seeder.service';
import { DatabaseService } from './database.service';

describe('DatabaseSeederService', () => {
  let service: DatabaseSeederService;

  beforeEach(async () => {
    const mockDatabaseService = {
      getOrThrow: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseSeederService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<DatabaseSeederService>(DatabaseSeederService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should complete onModuleInit without errors', async () => {
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
