import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const userEmailVerificationRequestedSchema = z.object({
  userId: z.string(),
  email: z.email(),
  verificationLink: z.url(),
});

export class UserEmailVerificationRequestedInput extends createZodDto(
  userEmailVerificationRequestedSchema,
) {}
