import { AppRouter } from '@repo/trpc/auth';
import { QueryClient } from '@tanstack/react-query';
import {
  createTRPCReact,
  CreateTRPCReact,
  httpBatchLink,
} from '@trpc/react-query';

export const trpc: CreateTRPCReact<AppRouter, object> = createTRPCReact<
  AppRouter,
  object
>();

export const queryClient = new QueryClient();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/auth/trpc',
    }),
  ],
});
