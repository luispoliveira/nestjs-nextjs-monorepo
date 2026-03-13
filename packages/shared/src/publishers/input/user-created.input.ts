import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const userCreatedInputSchema = z
  .object({
    userId: z.number(),
    email: z.email(),
  })
  .meta({ id: 'UserCreated' });

export class UserCreatedInput extends createZodDto(userCreatedInputSchema) {}
