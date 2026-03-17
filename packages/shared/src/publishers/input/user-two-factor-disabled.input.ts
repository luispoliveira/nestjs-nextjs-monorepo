import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const userTwoFactorDisabledInputSchema = z.object({
  userId: z.string(),
  email: z.email(),
});

export class UserTwoFactorDisabledInput extends createZodDto(
  userTwoFactorDisabledInputSchema,
) {}
