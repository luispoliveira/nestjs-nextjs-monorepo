---
description: 'Use when creating or modifying Next.js frontend code. Covers component patterns, tRPC client usage, authentication with better-auth, routing, and UI conventions for the web app.'
applyTo: 'apps/web/**/*.{ts,tsx}'
---

# Next.js Frontend Conventions

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix UI primitives)
- **Data fetching**: tRPC + TanStack Query (`@trpc/react-query`)
- **Auth client**: `better-auth` React client (`authClient` from `@/lib/auth/client`)
- **Forms**: React Hook Form + Zod resolvers (`@hookform/resolvers/zod`)
- **Themes**: `next-themes` (light/dark)
- **Notifications**: `sonner` (`<Toaster />` in root layout)
- **Fonts**: Plus Jakarta Sans (sans) + Geist Mono (mono)

## Project Structure

```
app/
  (auth)/          # Unauthenticated routes (sign-in, etc.)
  (dashboard)/     # Authenticated routes — layout checks session server-side
components/
  ui/              # shadcn/ui primitives — do not modify directly
  <feature>/       # Feature-specific components
hooks/             # Custom React hooks
lib/
  auth/
    client.ts      # better-auth React/browser client
    server.ts      # getServerSession() for server components
    schema.ts      # loginSchema (Zod v4)
  trpc/
    client.ts      # trpc client + TrpcProvider component
  utils.ts         # cn(), generatePassword()
  image.ts         # Next.js Image helper
```

## Server vs Client Components

- Default to **server components** — only add `'use client'` when hooks, event handlers, or browser APIs are needed.
- Route layouts (e.g., `(dashboard)/layout.tsx`) should be server components that check auth via `getServerSession()` and redirect if unauthenticated.
- Data-fetching, auth checks, and redirects belong in server components or server actions.

## Authentication

### Client-side (browser)

```typescript
import { authClient } from '@/lib/auth/client';

// Read session (hook — use client only)
const { data: session } = authClient.useSession();

// Sign in
await authClient.signIn.email({ email, password, callbackURL: '/dashboard' });

// Sign out
await authClient.signOut({
  fetchOptions: { onSuccess: () => router.push('/sign-in') },
});
```

The auth client is configured with `basePath: '/api/auth'` and includes `twoFactorClient()` and `adminClient()` plugins.

### Server-side (server components / server actions)

```typescript
import { getServerSession } from '@/lib/auth/server';

// In a server component or layout:
const session = await getServerSession();
if (!session) redirect('/sign-in');
```

`getServerSession()` fetches the session from the auth service (`AUTH_API_URL/api/auth/get-session`) with forwarded cookies. It has a 5-second timeout and returns `AuthSession | null`.

> **Never** implement custom session management or JWT handling. Always use `authClient` or `getServerSession()`.

## Role-Based Access

Use `RoleEnum` from `@repo/shared-types` for role checks:

```typescript
import { RoleEnum } from '@repo/shared-types';

if (session.user.role !== RoleEnum.ADMIN) redirect('/dashboard');
```

## Forms

Use React Hook Form with Zod v4 validation. Import shared schemas from `@repo/shared-types` when the same schema is used in the backend.

```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginSchema } from '@/lib/auth/schema'; // or from @repo/shared-types

type LoginFormData = z.infer<typeof loginSchema>;

const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
});
```

## tRPC

Use the tRPC client from `@/lib/trpc/client` for all backend API calls. Always prefer tRPC over raw `fetch` for typed API communication.

The root layout already wraps the app in `TrpcProvider` — do not add it again.

```typescript
'use client';
import { trpc } from '@/lib/trpc/client';

// Query (auto-caches via TanStack Query)
const { data, isLoading } = trpc.users.list.useQuery({ skip: 0, take: 20 });

// Mutation
const mutation = trpc.users.create.useMutation({
  onSuccess: () => {
    /* invalidate cache, show toast, etc. */
  },
});
await mutation.mutateAsync({ name, email, role: 'user' });
```

The tRPC client sends requests to `/api/auth/trpc` via `httpBatchLink`.

## UI Components

- Use **shadcn/ui** components from `components/ui/` — do not reinvent buttons, dialogs, inputs, etc.
- Use `cn()` from `@/lib/utils` for conditional class merging.
- Use `class-variance-authority` (`cva`) for component variants.

```typescript
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

<Button variant="outline" className={cn('w-full', isLoading && 'opacity-50')}>
  Submit
</Button>
```

## Routing & Layout Conventions

- Use App Router file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Group authenticated routes under `(dashboard)/` — its `layout.tsx` protects the entire group
- Group unauthenticated routes under `(auth)/`
- Route group `layout.tsx` files are the right place for auth redirects, not middleware

```typescript
// app/(dashboard)/layout.tsx — server component
import { getServerSession } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession();
  if (!session) redirect('/sign-in');
  return <>{children}</>;
}
```

## Styling

- Use Tailwind utility classes directly on JSX elements.
- Theme variables are CSS custom properties — use `bg-background`, `text-foreground`, etc.
- For dark mode, `next-themes` is already configured in root layout via `ThemeProvider`.
- Avoid inline `style` props — use Tailwind or CSS variables.

## Images

Use the `image` helper from `@/lib/image` instead of raw `<img>` tags (handles Next.js image optimization).

## Security Considerations

- Never expose secrets or API keys in client components or `use client` files.
- Use server components / server actions for any operation touching sensitive data.
- The `generatePassword()` utility in `@/lib/utils` uses `crypto.getRandomValues` for cryptographic randomness — always prefer this over `Math.random()` for security-sensitive values.
