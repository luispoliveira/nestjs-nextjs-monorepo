"use client";

import { apiTrpc, getQueryClient, trpcApiClient } from "@/lib/trpc/api-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";

export default function ApiTrpcProvider({ children }: PropsWithChildren) {
  const queryClient = getQueryClient();
  return (
    <apiTrpc.Provider client={trpcApiClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </apiTrpc.Provider>
  )
}