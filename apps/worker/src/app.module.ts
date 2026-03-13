import { Module } from '@nestjs/common';
import { SharedModule } from '@repo/shared';

@Module({
  imports: [SharedModule.register()],
  controllers: [],
  providers: [],
})
export class AppModule {}
