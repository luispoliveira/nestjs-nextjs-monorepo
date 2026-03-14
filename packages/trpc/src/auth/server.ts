import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({
  authRouter: t.router({
    greet: publicProcedure.input(z.object({
      name: z.string(),
      age: z.number().optional(),
    })).output(z.object({
      greeting: z.string(),
    })).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  })
});
export type AppRouter = typeof appRouter;

