import { BaseRouter } from '@repo/shared';
import { Input, Query, Router, UseMiddlewares } from 'nestjs-trpc-v2';
import { z } from 'zod';
import { AuthTrpcMiddleware } from './auth-trpc.middleware';

const greetInputSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
});

const greetOutputSchema = z.object({
  greeting: z.string(),
});

type GreetInput = z.infer<typeof greetInputSchema>;
type GreetOutput = z.infer<typeof greetOutputSchema>;

@Router()
@UseMiddlewares(AuthTrpcMiddleware)
export class AuthRouter extends BaseRouter {
  @Query({
    input: greetInputSchema,
    output: greetOutputSchema,
  })
  async greet(@Input() input: GreetInput): Promise<GreetOutput> {
    return {
      greeting: `Hello, ${input.name}!`,
    };
  }
}
