import z from 'zod';

const webEnvSchema = z.object({
  AUTH_API_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3100'),
  NEXT_PUBLIC_AUTH_API_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_STORAGE_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_BASE_PATH: z.string().optional().default(''),
  BACKEND_PROTOCOL: z.enum(['http', 'https']).default('http'),
  BACKEND_HOST: z.string().min(1).default('localhost'),
});

export const env = webEnvSchema.parse(process.env);
