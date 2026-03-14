"use client";

import { queryClient, trpc, trpcClient } from "@/lib/trpc/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren } from "react";

export default function TrpcProvider({ children }: PropsWithChildren) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}