# Git Helper — Cheat Sheet

> Cola rápida do Gitflow usado neste repo (modelo: [atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)). Ver [CLAUDE.md](CLAUDE.md#git-workflow) e [.github/git-commit-instructions.md](.github/git-commit-instructions.md) para o detalhe completo.
>
> **A única adaptação ao Gitflow "puro":** `main` e `develop` estão protegidos (push direto bloqueado), por isso todo o "merge" do modelo original vira **PR**. Nunca se usa `git flow * finish` — esse comando faz merge local direto, sem PR nem CI.

## O modelo

```
main       ────●─────────────────────●──────  (produção, tag em cada release)
                 \                   / \
release            \      release/x.y.z  \  hotfix/x
                     \    /           \    \
develop    ──●──●──●──●──●──●──●──●──●──●──●──  (integração)
              \        /
feature/x      ●──●──●
```

- **`main`** — histórico de produção. Cada commit representa uma release e fica taggeado.
- **`develop`** — branch de integração. Todas as branches de trabalho partem daqui e voltam para aqui.
- **`feature/*`** (neste repo: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`) — parte de `develop`, volta para `develop`.
- **`release/*`** — parte de `develop` quando há features suficientes para lançar; só leva ajustes de última hora (não features novas); vai para `main` **e** `develop`.
- **`hotfix/*`** — parte de `main` (única branch que ramifica direto de `main`); corrige algo urgente em produção; vai para `main` **e** `develop`.

## Nomes de branch

```text
feat/<scope>/<short-description>
fix/<scope>/<short-description>
chore/<scope>/<short-description>
docs/<scope>/<short-description>
refactor/<scope>/<short-description>
release/<versão>
hotfix/<scope>/<short-description>
```

Exemplos: `feat/auth/add-2fa-recovery`, `fix/worker/dlq-replay-timeout`, `release/1.4.0`, `hotfix/auth/session-leak`

## Feature branch — passo a passo

```bash
git checkout develop
git pull origin develop
git checkout -b feat/admin-api/add-skills-export

# ...trabalho, commits...

git push -u origin feat/admin-api/add-skills-export
gh pr create --base develop --title "feat(admin-api): add skills export"
```

- PR sempre com `--base develop`.
- CI (`quality` job) corre em todo o push/PR para `develop`/`main`: build, lint, check-types, test.
- Depois de aprovado, merge da PR e apaga a branch.

## Release branch — passo a passo

```bash
git checkout develop
git pull origin develop
git checkout -b release/1.4.0

# só ajustes de release (bump de versão, changelog, últimos fixes) — nada de features novas

git push -u origin release/1.4.0
gh pr create --base main --title "release: 1.4.0"
```

- PR `release/1.4.0` → `main` é o que dispara o job `e2e` (Testcontainers) no CI — é o gate de release.
- Depois de aprovado e mergeado, cria e empurra a tag em `main` — o workflow [`release.yml`](.github/workflows/release.yml) apanha o push da tag e cria a GitHub Release + atualiza o `CHANGELOG.md` automaticamente:

```bash
git checkout main && git pull origin main
git tag v1.4.0
git push origin v1.4.0
```

- **Não** uses `gh release create --target main` à mão — isso cria a tag e a release num só passo, o que também dispara o `release.yml` (push de tag) e falha com "Release.tag_name already exists".

- Faz merge de volta para `develop` (pode ter avançado desde que a release começou):

```bash
gh pr create --base develop --head release/1.4.0 --title "chore: merge release/1.4.0 into develop"
```

- Depois das duas PRs mergeadas, apaga a branch de release.

## Hotfix branch — passo a passo

Igual à release, mas parte de `main` em vez de `develop` (para corrigir produção sem esperar pelo próximo ciclo):

```bash
git checkout main
git pull origin main
git checkout -b hotfix/auth/session-leak

# ...fix...

git push -u origin hotfix/auth/session-leak
gh pr create --base main --title "fix(auth): session leak"
```

- Depois de aprovado e mergeado, tag em `main` (`git tag v1.4.1 && git push origin v1.4.1`) e PR de volta para `develop` (`gh pr create --base develop --head hotfix/auth/session-leak`) — exactamente como na release.

## Atalho: ferramenta `git flow` (CLI)

Configuração única (`git flow init`), a fazer corresponder aos prefixos deste repo:

```text
Branch name for production releases: main
Branch name for "next release" development: develop
Feature branch prefix: feat/
Release branch prefix: release/
Hotfix branch prefix: hotfix/
Support branch prefix: (deixa em branco)
Version tag prefix: v
```

Usa só `git flow feature|release|hotfix start <nome>` para criar a branch com o prefixo e a base certos — depois segue o fluxo manual acima (push + PR).

⚠️ **Nunca uses `git flow * finish`.** Esse comando faz o merge localmente (`git merge`) e apaga a branch — sem PR, sem CI, sem review, e o push a seguir seria bloqueado de qualquer forma.

O `git flow feature` só tem um prefixo configurável, por isso `fix/`, `chore/`, `docs/`, `refactor/` cria-se à mão (`git checkout -b fix/<scope>/<descr> develop`) — comportam-se exactamente como uma feature branch.

## Commits — Conventional Commits

```text
<tipo>(<scope>): <resumo no imperativo>
```

- Tipos: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`.
- Scopes: apps/packages (`api`, `admin-api`, `auth`, `notifications`, `worker`, `web`, `database`, `shared`, `shared-types`, `search`, `talent`, `mail`, `trpc`, `testing-utils`, `ci`, `docker`) ou domínio (`talent`, `solr`, `jobs`, `skills`).
- Subject ≤50 chars (máx. 72), minúsculas depois dos dois pontos, sem ponto final.
- Corpo explica o **porquê**, não o quê. Wrap a 72 chars.
- Breaking change: sufixo `!` + rodapé `BREAKING CHANGE:`.
- **Nunca** incluir linhas de atribuição a IA ("Generated with...", "Co-authored by Claude/Copilot").

```bash
git commit -m "$(cat <<'EOF'
fix(worker): retry DLQ replay on transient redis timeout

Timeout was too aggressive for cold connections after a redeploy,
causing valid jobs to land in the DLQ unnecessarily.
EOF
)"
```

## Checklist antes de abrir PR

- [ ] `pnpm build` passa
- [ ] `pnpm lint` passa
- [ ] `pnpm check-types` passa
- [ ] Testes adicionados/atualizados para a lógica alterada
- [ ] `.claude/CORNER_CASES.md` atualizado, se descobriste um gotcha novo
- [ ] Sem `process.env` fora de `main.ts`
- [ ] Sem nomes de filas/patterns/tokens hardcoded (usar constantes de `@repo/shared`)

## Regras que nunca se saltam

- Nunca commitar/push direto em `main` ou `develop` — sempre via branch + PR.
- Nunca `--force` push para `main`/`develop`.
- Nunca `--no-verify` / `--no-gpg-sign`.
- Preferir novo commit a `--amend`, exceto quando pedido explicitamente.
- Nunca incluir atribuição a IA nas mensagens de commit.
