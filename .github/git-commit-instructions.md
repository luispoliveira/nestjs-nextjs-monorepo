# Git Commit Message Instructions

Follow **Conventional Commits** format. Be terse and exact. Explain _why_, not _what_ — the diff shows what.

---

## Format

```
<type>(<scope>): <imperative summary>

[optional body]

[optional footer(s)]
```

- `<scope>` is optional but recommended when the change is isolated to one module/package.
- Subject line: **≤50 chars** preferred, hard cap **72 chars**.
- No trailing period on the subject line.

---

## Types

| Type       | When to use                                               |
| ---------- | --------------------------------------------------------- |
| `feat`     | New feature or capability                                 |
| `fix`      | Bug fix                                                   |
| `refactor` | Code restructuring with no behavior change                |
| `perf`     | Performance improvement                                   |
| `docs`     | Documentation only                                        |
| `test`     | Adding or updating tests                                  |
| `chore`    | Tooling, deps, config — nothing that affects runtime code |
| `build`    | Build system or external dependency changes               |
| `ci`       | CI/CD pipeline changes                                    |
| `style`    | Formatting, whitespace — no logic change                  |
| `revert`   | Reverting a prior commit                                  |

---

## Subject Line Rules

- Use **imperative mood**: "add", "fix", "remove" — not "added", "adds", "adding"
- Lowercase after the colon: `feat(auth): add session expiry`
- No filler words: "now", "currently", "this commit does X"
- Breaking changes: append `!` after type/scope → `feat(api)!: rename endpoint`

---

## Body (only when needed)

Include a body when the subject alone doesn't explain:

- **Why** the change was made (non-obvious motivation)
- **Breaking changes** — must include `BREAKING CHANGE:` footer
- **Migration notes**
- **Security fixes**
- **Reverts** — reference the original commit SHA

Wrap body at **72 chars**. Use `-` for bullets, not `*`.

---

## Footers

```
Closes #42
Refs #17
Co-authored-by: Name <email>
BREAKING CHANGE: description of what breaks and migration path
```

---

## What NEVER goes in a commit message

- AI attribution ("Generated with...", "Co-authored by Claude/Copilot")
- "As requested by..."
- "I", "we", "our"
- Restating the file name when the scope already conveys it
- The word "refactoring" in a `feat` or `fix` commit

---

## Examples

**Simple feature:**

```
feat(users): add avatar upload endpoint
```

**Fix with context:**

```
fix(auth): clear session cookie on password change

Previous flow invalidated the DB token but left the browser cookie
intact, allowing replayed requests with stale credentials.

Closes #204
```

**Breaking change:**

```
feat(api)!: rename /v1/orders to /v1/checkout

BREAKING CHANGE: /v1/orders is removed. Clients must migrate to
/v1/checkout before 2026-09-01. Old route returns 410 after that date.
```

**Chore (no body needed):**

```
chore(deps): bump prisma to 7.1.0
```

**Revert:**

```
revert: feat(notifications): add push provider

Reverts commit a3f9c12. Push provider introduced a memory leak
under high concurrency. Removing until root cause is fixed.

Refs #318
```

---

## Scopes for this monorepo

Use the package or app name as scope:

| Scope           | Maps to                          |
| --------------- | -------------------------------- |
| `auth`          | `apps/auth`                      |
| `notifications` | `apps/notifications`             |
| `worker`        | `apps/worker`                    |
| `web`           | `apps/web`                       |
| `api`           | `apps/api`                       |
| `database`      | `packages/database`              |
| `shared`        | `packages/shared`                |
| `shared-types`  | `packages/shared-types`          |
| `mail`          | `packages/mail`                  |
| `trpc`          | `packages/trpc`                  |
| `ci`            | `.github/` workflows             |
| `docker`        | `docker/`, `docker-compose.yaml` |
