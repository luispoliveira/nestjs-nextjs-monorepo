## Context

O repositório segue Gitflow: `develop → release/x.x.x → main → tag vX.Y.Z`. Os tags semver já existem (`v1.0.0` → `v1.2.2`) mas não há nada que os converta em GitHub Releases. O CI (`ci.yml`) tem um quality gate mas zero CD — intencionalmente, o deploy é responsabilidade do utilizador do template.

## Goals / Non-Goals

**Goals:**
- Criar GitHub Release automaticamente quando um tag `v*` é pushed para `main`
- Gerar release notes a partir dos commits Conventional entre o tag atual e o anterior
- Gerar e commitar `CHANGELOG.md` atualizado como parte do processo

**Non-Goals:**
- Deploy/CD — fora do scope do template
- Publicação de packages npm — não é um monorepo de packages públicos
- Automatizar o bump de versão ou a criação do tag — esse passo mantém-se manual (gitflow release branch)

## Decisions

**D1 — `gh release create --generate-notes` em vez de `conventional-changelog-cli`**

GitHub gera release notes nativamente a partir do histórico de commits quando o repositório tem Conventional Commits. O resultado é equivalente mas sem dependência extra. `conventional-changelog-cli` seria necessário apenas se precisarmos de formato customizado no `CHANGELOG.md`.

Decisão: usar `gh release create --generate-notes` para as release notes do GitHub Release. Para o `CHANGELOG.md`, usar `conventional-changelog-cli` como `devDependency` — é o standard do ecossistema e produz o ficheiro em formato correto.

**D2 — Trigger: `push` em `tags: ['v*']`**

Alternativa seria trigger em `push` para `main`. O tag é mais preciso — só cria release quando o utilizador decide explicitamente que é um release. Evita releases acidentais de hotfixes ou merges diretos.

**D3 — `CHANGELOG.md` gerado no CI, commitado via workflow**

O workflow gera o changelog e faz commit via `GITHUB_TOKEN` com `git push`. Alternativa: gerar localmente antes do tag. CI é preferível — não requer que o developer tenha `conventional-changelog-cli` instalado localmente.

## Risks / Trade-offs

- **GITHUB_TOKEN write permissions**: O workflow precisa de `contents: write` para criar releases e pushes. Repositórios com branch protection em `main` que bloqueia pushes diretos precisarão de ajuste — documentado como nota no workflow.
- **Primeiro CHANGELOG gerado pode ser grande**: Se o histórico for longo, a primeira geração inclui todos os commits anteriores. Aceitável para um template.
- **Release notes vs CHANGELOG duplicação**: O GitHub Release e o `CHANGELOG.md` terão conteúdo similar. É intencional — Release notes são para consumo no GitHub UI, CHANGELOG é para consumo no repo.

## Migration Plan

1. Instalar `conventional-changelog-cli` como `devDependency`
2. Adicionar script `changelog` ao `package.json` raiz
3. Criar `.github/workflows/release.yml`
4. Fazer push de um tag de teste para validar
