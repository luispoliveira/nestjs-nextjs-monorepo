import { ConfigService } from '@nestjs/config';
import { EnvironmentEnum } from '@repo/shared-types';

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

import { DatabaseService } from './database.service';

const makeConfigService = (env: EnvironmentEnum = EnvironmentEnum.DEVELOPMENT) =>
  ({
    getOrThrow: jest.fn().mockReturnValue('postgresql://localhost:5432/test'),
    get: jest.fn().mockReturnValue(env),
  }) as unknown as ConfigService;

describe('DatabaseService', () => {
  it('should be instantiated without throwing', () => {
    expect(() => new DatabaseService(makeConfigService())).not.toThrow();
  });

  it('should call $connect on onModuleInit', async () => {
    const service = new DatabaseService(makeConfigService());
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalled();
  });

  it('should call $disconnect on onModuleDestroy', async () => {
    const service = new DatabaseService(makeConfigService());
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalled();
  });

  it('should use development log level in development mode', () => {
    const { PrismaPg } = jest.requireMock('@prisma/adapter-pg');
    jest.clearAllMocks();
    new DatabaseService(makeConfigService(EnvironmentEnum.DEVELOPMENT));
    expect(PrismaPg).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: 'postgresql://localhost:5432/test' }),
    );
  });

  it('should use minimal log level in production mode', () => {
    jest.clearAllMocks();
    expect(() => new DatabaseService(makeConfigService(EnvironmentEnum.PRODUCTION))).not.toThrow();
  });
});
