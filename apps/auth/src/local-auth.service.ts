import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@repo/database';
import { AuthService } from '@thallesp/nestjs-better-auth';

@Injectable()
export class LocalAuthService implements OnModuleInit {
  private readonly logger = new Logger(LocalAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly databaseService: DatabaseService,
  ) {}

  async onModuleInit() {
    await this.ensureAdminUser();
  }

  async ensureAdminUser() {
    const adminEmail = this.configService.getOrThrow<string>('ADMIN_EMAIL');

    const existingUser = await this.databaseService.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      this.logger.log(`Admin user with email ${adminEmail} already exists.`);
      return;
    }

    const adminPassword =
      this.configService.getOrThrow<string>('ADMIN_PASSWORD');

    const adminUser = await this.authService.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: 'Admin',
      },
    });

    this.logger.log(`Admin user created with email ${adminEmail}.`);
  }
}
