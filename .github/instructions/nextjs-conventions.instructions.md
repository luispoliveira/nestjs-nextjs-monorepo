---
description: 'Use when creating or modifying Next.js frontend code. Covers component patterns, tRPC client usage, authentication with better-auth, routing, and UI conventions for the web app.'
applyTo: 'apps/web/**/*.{ts,tsx}'
---

# Next.js Frontend Conventions

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix UI)
- **Data fetching**: tRPC + TanStack Query (`@trpc/react-query`)
- **Auth**: better-auth React client
- **Forms**: React Hook Form + Zod resolvers (`@hookform/resolvers`)
- **Themes**: `next-themes` (light/dark mode)

## tRPC

Use the tRPC client from `@/lib/trpc` for all backend API calls. Always prefer tRPC queries/mutations over raw `fetch`.

```typescript
// Query
const { data, isLoading } = trpc.users.list.useQuery();

// Mutation
const mutation = trpc.users.create.useMutation();
await mutation.mutateAsync({ name, email });
```

Wrap the entire app in `TrpcProvider` (already set up in `app/layout.tsx`).

## Components

- UI primitives live in `components/ui/` — use shadcn/ui components, do not reinvent.
- Page-specific components go in `components/<feature>/`.
- Keep server components as the default; only add `"use client"` when interactivity or hooks are needed.

## Forms

Use React Hook Form with Zod validation. Import schemas from `@repo/shared-types` when the same Zod schema is shared with the backend.

```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateUserSchema } from '@repo/shared-types';

const form = useForm({
  resolver: zodResolver(CreateUserSchema),
});
```

## Routing & Layout

- App Router conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`.
- Route groups with `(groupName)/` for feature organization.
- `app/layout.tsx` is the root layout — already includes `ThemeProvider` and `TrpcProvider`.

## Authentication

Use `better-auth`'s React/Next.js client. Do NOT implement custom session management.

```typescript
import { authClient } from '@/lib/auth/auth-client';

const { data: session } = authClient.useSession();
await authClient.signIn.email({ email, password });
await authClient.signOut();
```

## Styling

- Use Tailwind utility classes directly on JSX elements.
- Use `cn()` from `@/lib/utils` to conditionally merge classes.
- Use `class-variance-authority` (`cva`) for component variants.

```typescript
import { cn } from '@/lib/utils';

<div className={cn('base-class', isActive && 'active-class')} />
```

## Images

Use the `image` helper from `@/lib/image` instead of raw `<img>` tags (handles optimization).
