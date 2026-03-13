import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const userPasswordChangedInputSchema = z
  .object({
    userId: z.number(),
    email: z.email(),
    reason: z.string(),
  })
  .meta({ id: 'UserPasswordChanged' });

export class UserPasswordChangedInput extends createZodDto(
  userPasswordChangedInputSchema,
) {}
