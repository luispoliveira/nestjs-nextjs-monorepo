---
name: "Commit"
description: "Gate-checked git commit — runs build, lint, check-types and tests, drafts a Conventional Commits message, and waits for approval before committing. Supports multiple commits from one verified diff."
category: Git
tags: [git, commit, conventional-commits, ci-gate]
---

Prepare and create a git commit in this monorepo.

**Input**: Optional hint — e.g. `/commit auth: fix session cookie`.

## Flow

1. `git status` / `git diff` / `git diff --staged` / current branch. Warn (don't silently proceed) if branch is `main` or `develop`.
2. Run gate checks once for the session — `pnpm build`, `pnpm lint`, `pnpm check-types`, and `pnpm --filter <pkg> test` if tests exist for the touched code. Stop and report on any failure; do not draft a message.
3. Stage only the relevant files (never `git add -A`).
4. Draft the commit message per [.github/git-commit-instructions.md](../../.github/git-commit-instructions.md) — `<type>(<scope>): <imperative summary>`, body only for non-obvious *why*, no AI attribution.
5. Show the exact message and **stop** — commit only after explicit user approval.
6. On approval, run `git commit` via heredoc, then `git status`.

## Multiple commits

If the user wants the change split into several commits: skip the checks (step 2) for follow-up commits as long as no new code was written since they last passed — just re-stage the next chunk (`git add -p` or specific paths), draft its message, and get approval again. Re-run checks if new edits land after the last check.

## Never

- Push, merge, or open a PR.
- `--no-verify`, `--amend` (unless explicitly asked), or `git add -A`.
- Commit without the user's explicit go-ahead on the message.
