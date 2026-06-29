import { baseEnvSchema } from '@repo/shared';
import z from 'zod';

export const workerEnvSchema = baseEnvSchema.extend({
  CORS_ORIGIN: z.string().min(1),
  BREVO_API_KEY: z.string().min(1),
  FROM_EMAIL: z.email(),
  FROM_NAME: z.string().default(''),
  DEV_EMAIL: z.email().optional(),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;
