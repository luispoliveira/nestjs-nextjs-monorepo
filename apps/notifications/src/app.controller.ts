import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  EVENT_PATTERNS,
  UserCreatedInput,
  userCreatedInputSchema,
  UserPasswordChangedInput,
  userPasswordChangedInputSchema,
  UserPasswordResetRequestedInput,
  userPasswordResetRequestedInputSchema,
} from '@repo/shared';
import z from 'zod';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @EventPattern(EVENT_PATTERNS.USER_CREATED)
  async sendUserCreatedNotification(@Payload() data: UserCreatedInput) {
    const validated = z.parse(userCreatedInputSchema, data);
    this.logger.log(`Sending USER_CREATED notification to ${validated.email}`);
    await this.appService.sendUserCreatedNotification(validated.email);
  }

  @EventPattern(EVENT_PATTERNS.USER_PASSWORD_RESET_REQUESTED)
  sendPasswordResetNotification(
    @Payload() data: UserPasswordResetRequestedInput,
  ) {
    const validated = z.parse(userPasswordResetRequestedInputSchema, data);
    this.logger.log(
      `Sending USER_PASSWORD_RESET_REQUESTED notification to ${validated.email}`,
    );

    const { email, resetToken } = validated;
    return this.appService.sendPasswordResetNotification(email, resetToken);
  }

  @EventPattern(EVENT_PATTERNS.USER_PASSWORD_CHANGED)
  sendPasswordChangeConfirmation(@Payload() data: UserPasswordChangedInput) {
    const validated = z.parse(userPasswordChangedInputSchema, data);
    this.logger.log(
      `Sending USER_PASSWORD_CHANGED notification to ${validated.email}`,
    );
    return this.appService.sendPasswordChangeConfirmation(validated.email);
  }
}
