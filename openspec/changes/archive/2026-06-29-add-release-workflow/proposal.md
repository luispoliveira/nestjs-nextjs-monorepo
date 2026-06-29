## Why

O template usa Gitflow + Conventional Commits e já cria tags (`v1.0.0` → `v1.2.2`) manualmente, mas não há nada que converta esses tags em GitHub Releases visíveis. O output do processo de release existe mas não é capturado.

## What Changes

- Adicionar `.github/workflows/release.yml` que dispara em push de tags `v*`
- O workflow cria uma GitHub Release com release notes auto-geradas a partir dos commits entre o tag atual e o anterior
- O CHANGELOG.md é gerado via `conventional-changelog-cli` e commitado como parte do release

## Capabilities

### New Capabilities

- `github-release`: Workflow que converte um tag semver em GitHub Release com notas geradas dos commits Conventional

### Modified Capabilities

(nenhuma — sem alterações a specs existentes)

## Impact

- Novo ficheiro: `.github/workflows/release.yml`
- Novo ficheiro: `CHANGELOG.md` (gerado e mantido pelo workflow)
- Sem alterações ao código das apps ou packages
- Sem novas dependências de runtime — `conventional-changelog-cli` instalado como `devDependency`
