import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from '@repo/shared';
import { AuthService } from '@thallesp/nestjs-better-auth';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @MessagePattern(MESSAGE_PATTERNS.AUTH_AUTHENTICATE)
  async authenticate(@Payload() data: { token: string }) {
    try {
      const session = await this.authService.api.getSession({
        headers: new Headers({
          cookie: `better-auth.session_token=${data.token}`,
          authorization: `Bearer ${data.token}`,
        }),
      });

      if (!session) {
        throw new RpcException({ status: 401, message: 'Unauthorized' });
      }

      return session.user;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error('Session validation failed', error);
      throw new RpcException({ status: 401, message: 'Unauthorized' });
    }
  }
}
