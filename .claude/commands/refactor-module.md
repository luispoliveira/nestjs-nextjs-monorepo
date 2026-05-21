---
name: "Refactor Module"
description: "Safely refactor a NestJS module or Next.js component — improve structure, fix convention deviations, without changing behavior. Validates build after changes."
category: Refactoring
tags: [refactor, module, service, component, cleanup]
---

Refactor a module, service, or component in this monorepo. Improve the code without changing behavior.

**Input**: What to refactor. Examples:
- `apps/api/src/users` — refactor the users module
- `apps/auth/src/local-auth.service.ts` — refactor a service
- `packages/shared/src/utils` — refactor utilities

## Refactoring Principles

1. **No behavior changes** — only structure and names
2. **Follow conventions** — code must comply with CLAUDE.md after changes
3. **Build must pass** — run `pnpm check-types && pnpm build` after changes
4. **Plan before changing** — outline all changes and affected files upfront

## Common Convention Violations to Fix

- `process.env` outside `main.ts` → `ConfigService.getOrThrow()`
- Hardcoded queue names / event patterns → import from `@repo/shared`
- `PrismaClient` injected directly → use `DatabaseService`
- BullMQ imports → Bull v4
- Zod v3 APIs → Zod v4 (`z.email()` not `z.string().email()`)
- `ZodValidationPipe` registered per-module → remove (it's global)
- `console.log` → `this.logger.log()` or `this.logger.debug()`
- Files over 500 lines → split
- Duplicate publisher/producer logic → extend `BasePublisher`/`BaseProducer`

## Validation After Changes

```bash
pnpm check-types
pnpm build
pnpm --filter <affected-package> test
```
