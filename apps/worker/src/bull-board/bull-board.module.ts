import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { QUEUES } from '@repo/shared';
import { BullBoardAuthMiddleware } from './bull-board-auth.middleware';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUES.EMAIL,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUES.EMAIL_DLQ,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [BullBoardAuthMiddleware],
})
export class BullBoardNestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(BullBoardAuthMiddleware).forRoutes('/admin/queues*');
  }
}
