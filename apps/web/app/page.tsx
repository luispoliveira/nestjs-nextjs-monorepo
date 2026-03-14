"use client";
import { trpc } from "@/lib/trpc/client";

export default function Home() {
  const auth = trpc.authRouter.greet.useQuery({ name: "World" });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
        Welcome to the NestJS + NextJS Monorepo!
      </h1>
    </div>
  );
}
