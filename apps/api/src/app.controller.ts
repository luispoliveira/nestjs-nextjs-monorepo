import { Controller, Get } from '@nestjs/common';
import { RateLimit } from '@repo/shared';

@Controller()
@RateLimit('default')
export class AppController {
  @Get()
  getHello(): string {
    return 'Hello, world!';
  }
}
