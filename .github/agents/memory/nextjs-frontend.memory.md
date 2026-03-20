# Next.js Frontend Expert — Memory & Lessons Learned

> This file is automatically maintained by the Next.js Frontend Expert agent.
> **Read at the start of every run. Update at the end of every run.**

---

## ⚠️ Known Pitfalls

<!-- Format:
### Pitfall: [Short title]
- **Context**: When/where does this happen?
- **What went wrong**: What was the mistake?
- **Fix/Avoid**: What to do instead
- **Project**: (optional) specific project where this occurred
- **Date**: YYYY-MM-DD
-->

### Pitfall: `generatePassword()` using window.crypto in shared utility

- **Context**: Utility functions that generate random values
- **What went wrong**: `lib/utils.ts` used `window.crypto.getRandomValues()` which breaks on server-side rendering
- **Fix/Avoid**: Use `crypto.getRandomValues()` via `globalThis.crypto` (works in Node 16+) or Node's `crypto.randomBytes()`. Ensure it's client-only if window-specific APIs are required.
- **Project**: nestjs-nextjs-monorepo
- **Date**: 2026-03-20

### Pitfall: Route protection in layouts instead of middleware

- **Context**: Protecting authenticated routes
- **What went wrong**: Auth checks done in `layout.tsx` cause flash of unauthorized content and redundant session fetches
- **Fix/Avoid**: Always use `middleware.ts` for route-level protection. Layouts should assume auth is already validated.
- **Project**: nestjs-nextjs-monorepo
- **Date**: 2026-03-20

### Pitfall: No environment variable validation

- **Context**: Accessing `process.env` directly without validation
- **What went wrong**: Runtime errors when env vars are missing or malformed; no type safety
- **Fix/Avoid**: Always create `lib/env.ts` with Zod schema validation before accessing any environment variables. Never use `process.env` directly in components or server code.
- **Project**: nestjs-nextjs-monorepo
- **Date**: 2026-03-20

### Pitfall: Client-side filtering on paginated server data

- **Context**: When implementing multiple filters on server-paginated data
- **What went wrong**: `users-client.tsx` applied role filter client-side when status filter was active, defeating server pagination benefits
- **Fix/Avoid**: Either support multiple filters in backend API or disable conflicting filters on the frontend. Never filter paginated data client-side.
- **Project**: nestjs-nextjs-monorepo
- **Date**: 2026-03-20

---

## ✅ Successful Patterns

<!-- Format:
### Pattern: [Short title]
- **Context**: When to apply this
- **Approach**: What worked well
- **Project**: (optional)
- **Date**: YYYY-MM-DD
-->

### Pattern: Server Component data fetching in page files

- **Context**: Loading initial data for pages
- **Approach**: Use async Server Components in `page.tsx` files to fetch data directly (no useEffect + fetch). Pass data as props to Client Components for interactivity. Keeps the page fast and SEO-friendly.
- **Project**: nestjs-nextjs-monorepo
- **Date**: 2026-03-20

### Pattern: Route groups for layout isolation

- **Context**: Different layouts for auth vs dashboard pages
- **Approach**: Use `(auth)` and `(dashboard)` route groups with separate `layout.tsx` files. Keeps auth pages minimal and dashboard pages consistent with sidebar/topbar.
- **Project**: nestjs-nextjs-monorepo
- **Date**: 2026-03-20

### Pattern: Better-auth admin client with useQuery

- **Context**: Using better-auth admin plugin for user management
- **Approach**: Wrap `authClient.admin.listUsers()` in TanStack Query's `useQuery` for caching, refetching, and loading states. Provides good DX without additional API layer.
- **Project**: nestjs-nextjs-monorepo
- **Date**: 2026-03-20

---

## 📋 Project-Specific Notes

<!-- Specific observations about codebases encountered, e.g.:
- Project X uses a custom shadcn/ui theme with non-standard colour tokens
- Project Y has a monorepo (Turborepo) — components live in packages/ui
- Project Z uses tRPC with a custom React Query wrapper
-->

### nestjs-nextjs-monorepo

- **Type**: Turborepo monorepo with pnpm workspaces
- **Backend**: NestJS microservices with tRPC
- **Frontend**: Next.js 16 App Router, Tailwind CSS v4, shadcn/ui
- **Auth**: better-auth (NOT Passport/JWT) with admin plugin
- **Validation**: Zod v4 throughout (use `.email()`, not `.string().email()`)
- **Shared types**: `@repo/shared-types` package for Zod schemas
- **tRPC**: `@repo/trpc` exports `AppRouter` type from auth app
- **Constants**: `@repo/shared` provides `SERVICES`, `QUEUES`, `EVENT_PATTERNS` — never hardcode
- **Component structure**: Feature-based folders (e.g., `components/users/`) instead of generic `components/common/`
- **Font setup**: Uses `next/font/google` with Plus Jakarta Sans + Geist Mono
- **Theme**: next-themes with custom shadcn/ui Tailwind v4 config via `@theme inline`
- **Current state**: No tests, no middleware, no env validation — prioritize these

---

## 📦 Package Version Compatibility

<!-- Track known version conflicts or compatibility issues. Format:
- `next-themes@X` requires `ThemeProvider` to be a Client Component wrapper
- `shadcn/ui` does not ship pre-built — always use `npx shadcn@latest add <component>`
-->

- **Next.js**: 16.1.6 (latest stable) — uses App Router exclusively
- **React**: 19.2.4 — requires React 19-compatible packages
- **Zod**: 4.3.6 (v4 API) — use `.meta({ id: '...' })` for schema IDs, `.email()` instead of `.string().email()`
- **Tailwind CSS**: v4 with `@tailwindcss/postcss` — uses `@theme inline` syntax
- **shadcn/ui**: v4 — installed via CLI (`npx shadcn@latest add`), not npm package
- **better-auth**: 1.5.5 — provides `authClient` with admin/twoFactor plugins
- **TanStack Query**: 5.90.21 — compatible with tRPC 11.12.0
- **tRPC**: 11.12.0 — uses `createTRPCReact` from `@trpc/react-query`
- **next-themes**: 0.4.6 — `ThemeProvider` must be a Client Component

---

## ♿ Accessibility Observations

<!-- Track accessibility decisions and patterns. Format:
- Project X: All modals use `aria-labelledby` pointing to the dialog title
- Pattern: Use `sr-only` class for visually-hidden but screen-reader-visible labels
-->

### Issues Found (nestjs-nextjs-monorepo - 2026-03-20)

- Form inputs use `aria-invalid` but missing `aria-describedby` linking to error messages
- Tables missing `<caption>` for screen reader context
- No `sr-only` labels for icon-only buttons in some places

### Required Fixes

- Add `aria-describedby="{fieldId}-error"` to all form inputs with validation errors
- Add `<caption className="sr-only">...</caption>` to all data tables
- Ensure all icon-only buttons have `aria-label` or visible tooltip
- Test keyboard navigation on all forms (Tab, Enter, Escape)
- Verify focus trap in dialogs/modals

---

## 🧪 Testing Patterns

<!-- Track effective test setup strategies. Format:
- RTL query order: prefer getByRole > getByLabelText > getByText > getByTestId
- Playwright: use `page.getByRole()` selectors — more resilient than CSS selectors
- Zustand: reset store state in `beforeEach` to avoid test pollution
-->

### Required Setup (nestjs-nextjs-monorepo)

- **Jest + RTL**: Need to configure for Next.js 16 (see next.config.ts for transpilePackages)
- **Playwright**: Set up with baseURL pointing to `http://localhost:8080` (dev port)
- **Coverage target**: 80% minimum

### Best Practices to Apply

- **RTL query priority**: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
- **Async queries**: Use `findBy*` for elements that appear after async operations
- **User events**: Use `@testing-library/user-event` instead of `fireEvent` for realistic interactions
- **Playwright selectors**: Use `page.getByRole()` for resilience; avoid CSS selectors
- **Component isolation**: Mock `authClient` calls in unit tests; use real auth in e2e tests
- **Zustand stores**: Reset state in `beforeEach` and test in isolation with custom store instances
- **tRPC mocking**: Use `trpc.createClient()` with custom links for test data
