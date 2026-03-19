import { AppRouter } from '@repo/trpc/auth';
import { QueryClient } from '@tanstack/react-query';
import {
  createTRPCReact,
  CreateTRPCReact,
  httpBatchLink,
} from '@trpc/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }

  if (!browserQueryClient) browserQueryClient = makeQueryClient();

  return browserQueryClient;
}

export const trpc: CreateTRPCReact<AppRouter, object> = createTRPCReact<
  AppRouter,
  object
>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/auth/trpc',
    }),
  ],
});
