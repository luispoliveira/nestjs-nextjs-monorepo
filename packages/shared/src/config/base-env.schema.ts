import z from 'zod';

export const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  MONGO_URI: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
