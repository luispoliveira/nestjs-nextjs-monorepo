## 1. Dependência

- [ ] 1.1 Instalar `conventional-changelog-cli` como `devDependency` na raiz
- [ ] 1.2 Adicionar script `"changelog": "conventional-changelog -p angular -i CHANGELOG.md -s"` ao `package.json` raiz

## 2. Workflow

- [ ] 2.1 Criar `.github/workflows/release.yml` com trigger `on: push: tags: ['v*']`
- [ ] 2.2 Adicionar step de checkout com `fetch-depth: 0` (necessário para histórico de commits)
- [ ] 2.3 Adicionar step de setup pnpm + node (mesmos versions que `ci.yml`)
- [ ] 2.4 Adicionar step `pnpm install --frozen-lockfile`
- [ ] 2.5 Adicionar step que corre `pnpm changelog`, commita `CHANGELOG.md` e faz push
- [ ] 2.6 Adicionar step `gh release create ${{ github.ref_name }} --generate-notes`
- [ ] 2.7 Declarar `permissions: contents: write` no job

## 3. Validação

- [ ] 3.1 Verificar que `release.yml` passa `actionlint` ou equivalente (YAML válido, sintaxe GitHub Actions correta)
- [ ] 3.2 Confirmar que `conventional-changelog-cli` está no `pnpm-lock.yaml` após install
