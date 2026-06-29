## 1. Dependência

- [x] 1.1 Instalar `conventional-changelog-cli` como `devDependency` na raiz — supersedido: pacote deprecated, abordagem alterada para `gh release view --json body`
- [x] 1.2 Adicionar script `"changelog"` ao `package.json` raiz — supersedido: CHANGELOG gerado via `gh` CLI no workflow, sem script npm

## 2. Workflow

- [x] 2.1 Criar `.github/workflows/release.yml` com trigger `on: push: tags: ['v*']`
- [x] 2.2 Adicionar step de checkout com `fetch-depth: 0` (necessário para histórico de commits)
- [x] 2.3 Adicionar step de setup pnpm + node (mesmos versions que `ci.yml`) — supersedido: workflow não precisa de pnpm install
- [x] 2.4 Adicionar step `pnpm install --frozen-lockfile` — supersedido: sem deps de runtime no workflow
- [x] 2.5 Adicionar step que gera `CHANGELOG.md` via `gh release view --json body` e faz push para main
- [x] 2.6 Adicionar step `gh release create ${{ github.ref_name }} --generate-notes`
- [x] 2.7 Declarar `permissions: contents: write` no job

## 3. Validação

- [x] 3.1 Verificar que `release.yml` é YAML válido (js-yaml parse ok)
- [x] 3.2 Confirmar que `conventional-changelog-cli` não está no `pnpm-lock.yaml` (correto — removido)
