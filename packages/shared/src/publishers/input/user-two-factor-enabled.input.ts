import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const userTwoFactorEnabledInputSchema = z.object({
  userId: z.string(),
  email: z.email(),
});

export class UserTwoFactorEnabledInput extends createZodDto(
  userTwoFactorEnabledInputSchema,
) {}
