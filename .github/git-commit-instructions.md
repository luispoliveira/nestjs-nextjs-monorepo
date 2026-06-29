# Git Conventions

Follow **Gitflow** for branching and **Conventional Commits** for messages. Be terse and exact. Explain _why_, not _what_ — the diff shows what.

---

## Branching (Gitflow)

### Branch types

| Branch | Base | Merges into | Purpose |
| --- | --- | --- | --- |
| `main` | — | — | Production-ready releases only. Every commit is tagged with a version. |
| `develop` | `main` | — | Integration branch. Reflects the latest completed development. |
| `feature/<name>` | `develop` | `develop` | One branch per feature/story. Deleted after merge. |
| `release/<version>` | `develop` | `main` + `develop` | Release prep: bugfixes, version bumps, docs. No new features. |
| `hotfix/<name>` | `main` | `main` + `develop` | Urgent production fixes. Immediately tagged and released. |
| `bugfix/<name>` | `develop` | `develop` | Bug fixes that are not hot enough for a hotfix. |

### Naming rules

- Use **kebab-case** after the prefix: `feature/user-avatar-upload`, `hotfix/session-cookie-leak`.
- Version in release branches uses semver without the `v` prefix: `release/1.4.0`.
- Keep names short and descriptive — max ~40 chars total.

### Feature workflow

```
git checkout develop
git checkout -b feature/<name>
# work, commit…
git checkout develop
git merge --no-ff feature/<name>
git branch -d feature/<name>
git push origin develop
```

### Release workflow

```
git checkout develop
git checkout -b release/<version>
# bump version, changelog, last-minute fixes…
git checkout main
git merge --no-ff release/<version>
git tag -a v<version> -m "release v<version>"
git checkout develop
git merge --no-ff release/<version>
git branch -d release/<version>
```

### Hotfix workflow

```
git checkout main
git checkout -b hotfix/<name>
# fix…
git checkout main
git merge --no-ff hotfix/<name>
git tag -a v<patch> -m "hotfix v<patch>"
git checkout develop
git merge --no-ff hotfix/<name>
git branch -d hotfix/<name>
```

### Rules

- **Never commit directly to `main` or `develop`** — always go through a branch + pull request.
- **`main` is always deployable.** Only `release/*` and `hotfix/*` merge into it.
- **`feature/*` branches never interact with `main`** — only with `develop`.
- **Tag every merge to `main`** with a semver tag: `v1.0.0`, `v1.2.3`.
- Use **`--no-ff`** merges to preserve branch topology in history.
- Delete branches after merge.

---

## git-flow CLI

The `git-flow` extension wraps the manual steps above into single commands.

### Setup

```bash
# macOS
brew install git-flow-avh

# initialise in the repo (accept all defaults — branch names match this guide)
git flow init -d
```

`git flow init -d` configures:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Development branch | `develop` |
| Feature prefix | `feature/` |
| Release prefix | `release/` |
| Hotfix prefix | `hotfix/` |
| Bugfix prefix | `bugfix/` |
| Support prefix | `support/` |
| Version tag prefix | `v` |

---

### Feature

```bash
# start — branches off develop
git flow feature start user-avatar-upload

# publish to remote so others can collaborate
git flow feature publish user-avatar-upload

# pull a colleague's feature
git flow feature pull origin user-avatar-upload

# finish — merges into develop, deletes branch
git flow feature finish user-avatar-upload
```

Equivalent to:
```bash
git checkout -b feature/user-avatar-upload develop
# … work …
git checkout develop && git merge --no-ff feature/user-avatar-upload
git branch -d feature/user-avatar-upload
```

---

### Release

```bash
# start — branches off develop
git flow release start 1.4.0

# publish so CI/QA can access it
git flow release publish 1.4.0

# finish — merges into main + develop, creates tag v1.4.0, deletes branch
git flow release finish 1.4.0

git push origin develop main --tags
```

During a release branch only these changes are allowed: bugfixes, version bumps (`package.json`, `CHANGELOG.md`), and documentation. No new features.

---

### Hotfix

```bash
# start — branches off main
git flow hotfix start session-cookie-leak

# finish — merges into main + develop, creates tag, deletes branch
git flow hotfix finish session-cookie-leak

git push origin develop main --tags
```

Equivalent to:
```bash
git checkout -b hotfix/session-cookie-leak main
# … fix …
git checkout main && git merge --no-ff hotfix/session-cookie-leak
git tag -a v1.4.1 -m "hotfix v1.4.1"
git checkout develop && git merge --no-ff hotfix/session-cookie-leak
git branch -d hotfix/session-cookie-leak
```

---

### Bugfix

```bash
# start — branches off develop (or a release branch)
git flow bugfix start notification-queue-overflow

# finish — merges back into develop
git flow bugfix finish notification-queue-overflow
```

---

### Quick reference

| Command | What it does |
| --- | --- |
| `git flow init -d` | Initialise Gitflow with defaults |
| `git flow feature start <name>` | New feature branch from `develop` |
| `git flow feature finish <name>` | Merge feature → `develop`, delete branch |
| `git flow feature publish <name>` | Push feature branch to remote |
| `git flow release start <version>` | New release branch from `develop` |
| `git flow release finish <version>` | Merge release → `main` + `develop`, tag, delete |
| `git flow hotfix start <name>` | New hotfix branch from `main` |
| `git flow hotfix finish <name>` | Merge hotfix → `main` + `develop`, tag, delete |
| `git flow bugfix start <name>` | New bugfix branch from `develop` |
| `git flow bugfix finish <name>` | Merge bugfix → `develop`, delete branch |

After any `finish` that touches `main`, always push with tags:

```bash
git push origin develop main --tags
```

---

## Commit Message Format

### Format

```
<type>(<scope>): <imperative summary>

[optional body]

[optional footer(s)]
```

- `<scope>` is optional but recommended when the change is isolated to one module/package.
- Subject line: **≤50 chars** preferred, hard cap **72 chars**.
- No trailing period on the subject line.

---

### Types

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

### Subject Line Rules

- Use **imperative mood**: "add", "fix", "remove" — not "added", "adds", "adding"
- Lowercase after the colon: `feat(auth): add session expiry`
- No filler words: "now", "currently", "this commit does X"
- Breaking changes: append `!` after type/scope → `feat(api)!: rename endpoint`

---

### Body (only when needed)

Include a body when the subject alone doesn't explain:

- **Why** the change was made (non-obvious motivation)
- **Breaking changes** — must include `BREAKING CHANGE:` footer
- **Migration notes**
- **Security fixes**
- **Reverts** — reference the original commit SHA

Wrap body at **72 chars**. Use `-` for bullets, not `*`.

---

### Footers

```
Closes #42
Refs #17
Co-authored-by: Name <email>
BREAKING CHANGE: description of what breaks and migration path
```

---

### What NEVER goes in a commit message

- AI attribution ("Generated with...", "Co-authored by Claude/Copilot")
- "As requested by..."
- "I", "we", "our"
- Restating the file name when the scope already conveys it
- The word "refactoring" in a `feat` or `fix` commit

---

### Examples

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

### Scopes for this monorepo

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
