import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { DatabaseService } from '@repo/database';
import { Public } from '../decorators';

@Controller({
  version: VERSION_NEUTRAL,
  path: 'health',
})
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly dbService: DatabaseService,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly configService: ConfigService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get('live')
  @Public()
  isAlive() {
    return {
      status: 'ok',
    };
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', this.dbService),
      () =>
        this.microservice.pingCheck('microservice', {
          transport: Transport.REDIS,
          options: {
            host: this.configService.getOrThrow<string>('REDIS_HOST'),
            port: this.configService.getOrThrow<number>('REDIS_PORT'),
          },
        }),
      () => this.memory.checkHeap('memory_heap', 250 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk_health', {
          thresholdPercent: 0.7,
          path: '/',
        }),
    ]);
  }
}
