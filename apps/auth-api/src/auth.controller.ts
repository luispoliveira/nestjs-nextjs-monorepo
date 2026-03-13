import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from '@repo/shared';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  @MessagePattern(MESSAGE_PATTERNS.AUTH_AUTHENTICATE)
  authenticate(@Payload() data: { user: unknown }) {
    return data.user;
  }
}
