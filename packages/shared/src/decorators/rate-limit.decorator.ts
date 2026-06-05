import { UseGuards, applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { THROTTLE_TIERS } from '../constants/throttler';
import { CustomThrottlerGuard } from '../guards/custom-throttler.guard';

export const RateLimit = (tier: keyof typeof THROTTLE_TIERS = 'default') =>
  applyDecorators(
    UseGuards(CustomThrottlerGuard),
    Throttle({ default: THROTTLE_TIERS[tier] }),
  );
