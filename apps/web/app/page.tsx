"use client";
import { authClient } from "@/lib/auth/client";

export default function Home() {

  const { data: session } = authClient.useSession();
  const handleLogin = async () => {
    await authClient.signIn.email({
      email: 'admin@admin.com',
      password: "Admin123!"
    })
  }

  const handleLogout = async () => {
    await authClient.signOut();
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
        Welcome to the NestJS + NextJS Monorepo!
      </h1>



      {session ? (
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
          Hello, {session.user.name}! You are logged in.
        </p>
      ) : (
        <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">
          You are not logged in. Please log in to access more features.
        </p>
      )}

      <div className="mt-6">
        {!session ? (
          <button
            onClick={handleLogin}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Log In
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Log Out
          </button>
        )}
      </div>

    </div>
  );
}
