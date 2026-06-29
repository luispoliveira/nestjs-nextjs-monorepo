# PROMPT — Gerar o `CLAUDE.md` do Projeto

> **Como usar:** cola este prompt numa sessão de Claude Code aberta **na raiz do projeto**.
> O agente vai (1) analisar a codebase, (2) fazer-me perguntas para preencher lacunas, e (3) gerar/atualizar
> o `CLAUDE.md` local e a documentação de suporte.

---

## 0. Modelo a usar para gerar

> **Gera este setup com o modelo `Opus`.** A análise de arquitetura, deteção de convenções e síntese de
> documentação são tarefas de alta complexidade e beneficiam do modelo mais capaz.
> Se eu estiver noutro modelo, **diz-me para trocar (`/model opus`)** antes de começares.
>
> No `CLAUDE.md` gerado, inclui obrigatoriamente a **diretiva de seleção automática de modelo** (ver secção 5).

---

## 1. Objetivo

Compreende profundamente a arquitetura deste projeto e **cria, se não existirem, ou atualiza, se existirem**, os seguintes ficheiros:

- `CLAUDE.md` (principal — ver estrutura na secção 5)
- `PROJECT_MAP.md` — mapa de pastas com descrição de cada uma
- `ARCHITECTURE_OVERVIEW.md` — camadas, módulos, filas, integrações, fluxos
- `ENTRYPOINTS.md` — pontos de entrada (web, CLI/console, jobs/workers, cron, rotas API)
- `CONVENTIONS.md` — naming, estilo, padrões, anti-padrões
- `DEPENDENCY_GRAPH.md` — dependências entre módulos e pacotes externos
- `.claude/CORNER_CASES.md` — **ficheiro de memória** do projeto: log vivo de corner cases / gotchas resolvidos (ver secção 8). Cria-o sempre, mesmo que comece vazio.
- `.claude/skills/*`, `.claude/agents/*`, `.claude/commands/*` — **só se o projeto justificar** skills/agents próprios (ver secção 9)

Mantém o `CLAUDE.md` enxuto e **referencia** os outros ficheiros em vez de duplicar conteúdo.

---

## 2. Restrições

- Podes executar comandos de **leitura/análise** e **criar/editar os ficheiros de documentação** acima.
- **NÃO** executes ações Git (`commit`, `push`, `branch`, `merge`, `rebase`, PR). Eu trato disso.
- **NÃO** leias nem modifiques segredos (`.env`, `*-local.php`, ficheiros de credenciais).
- Comandos permitidos para análise: `find`, `grep`, `rg`, `tree`, `ls`, `cat`, `php`, `composer`, `node`, `pnpm`, `npm`, e equivalentes de leitura. Sem comandos destrutivos.
- **Usa as skills/agents globais ou do projeto** quando forem aplicáveis (ex.: análise de arquitetura, revisão de segurança, geração de docs). Não reimplementes o que uma skill já faz.

---

## 3. Estratégia de Análise

Executa por esta ordem e regista o que descobres:

1. **Detetar a stack** — manifesto de dependências (`composer.json`, `package.json`, `pnpm-workspace.yaml`, `turbo.json`), versão de linguagem, framework.
2. **Identificar entrypoints** — `index.php` / `web/index.php`, `console.php`, `main.ts`, `bootstrap`, rotas, jobs/workers, cron.
3. **Mapear módulos / apps / packages** — estrutura de diretórios e fronteiras de domínio.
4. **Localizar modelos de dados** — models/entities, migrations, schema (PostgreSQL/Prisma/etc.), índices, extensões (ex.: PostGIS).
5. **Seguir um request** — do entrypoint → controller/handler → camada de dados → resposta/view.
6. **Filas assíncronas** — que tubes/queues existem, quem produz, quem consome, como se reiniciam os workers.
7. **Integrações externas** — SOAP/REST/3rd-party, auth (LDAP, better-auth, RBAC), e o que depende da rede.
8. **Convenções** — naming, organização por domínio, padrões repetidos, ficheiros gerados a ignorar.
9. **Dependências** — entre módulos e pacotes externos; patches aplicados; versões `@dev`/pinned e porquê.
10. **Riscos** — gargalos de performance, problemas de segurança, código duplicado, dívida técnica documentada (`tasks/`, TODOs).

Prioridades: (1) rapidez de compreensão, (2) docs claras e navegáveis, (3) minimizar consumo de contexto, (4) reutilização via skills/agents.

---

## 4. Perguntas a Fazer-me (antes de gerar)

Analisa primeiro o que conseguires sozinho. Depois, **faz-me as perguntas abaixo apenas para o que não for inferível do código** — usa botões de escolha quando possível. Não me perguntes o que já está claro na codebase.

- **Identidade:** nome do projeto, propósito numa frase, e cliente/dono (se aplicável).
- **Stack ambígua:** versões exatas quando o manifesto não as fixa; base de dados e extensões; ferramenta de filas.
- **Git:** _este projeto_ autoriza-te a fazer commits? Se sim, confirma o workflow: por **default o branching segue git flow** (`main`/`master` estável, `develop` de integração, `feature/*`, `release/*`, `hotfix/*`, `bugfix/*`). Pergunta também a convenção de mensagens (Conventional Commits?) e se há proibição de atribuição a IA. (Default: **não fazes Git**.)
- **Comandos:** quais os comandos canónicos de build / test / lint / type-check / migrate / correr workers? (Confirma os que inferiste.)
- **Ambiente:** corre em Docker? Comandos passam por `docker compose exec …`? Há scripts em `scripts/`?
- **Segredos & locais:** que ficheiros nunca tocar; como apontar integrações externas para mocks em local (ex.: `params-local.php`, `use_ldap`).
- **Gerados:** que pastas/ficheiros são gerados e não devem ser editados nem commitados.
- **Gotchas:** patches obrigatórios, versões `@dev` intencionais, breaking changes conhecidos, dívida técnica em curso (links para `tasks/`/PRDs).
- **CLAUDE.md por pasta:** queres que eu avalie se vale a pena `CLAUDE.md` em subpastas? (ver secção 6).

Se eu não responder a algo, assume o caminho mais razoável e **marca o pressuposto** no ficheiro gerado com `> ⚠️ PRESSUPOSTO:`.

---

## 5. Estrutura do `CLAUDE.md` a gerar

O ficheiro deve seguir o framework **WHAT / WHY / HOW** (dá contexto, define princípios, define workflows) e conter, por esta ordem:

1. **Cabeçalho de scope** — indicar que é scope _Project_, e a regra Global → Project → Folder (último scope vence).
2. **Resumo do projeto** — nome, propósito, modelo (monólito/microserviços/…), cliente.
3. **Stack tecnológica** — tabela camada → tecnologia + versão.
4. **Estrutura de pastas (alto nível)** — árvore curta + link para `PROJECT_MAP.md`.
5. **Diretiva de Seleção Automática de Modelo** — incluir **textualmente** o bloco da secção 5.1.
6. **Acesso a Skills/Agents** — incluir o bloco da secção 5.2.
7. **Ficheiro de Memória (Corner Cases)** — incluir **textualmente** o bloco da secção 5.3.
8. **Convenções (rápido)** — bullets + link para `CONVENTIONS.md`.
9. **Comandos úteis** — build, test, lint, type-check, DB/migrations, filas/workers, console. Específicos e copiáveis.
10. **Restrições para agentes** — Git (conforme a minha resposta), segredos, migrations, ficheiros gerados, restart de workers.
11. **Workflow de Git (git flow)** — **só se o Git for permitido neste projeto**, incluir **textualmente** o bloco da secção 5.4. Se o Git não for permitido, omitir e indicar nas restrições que nenhuma ação Git é executada.
12. **Fluxo típico de request** — Web / Job assíncrono / Console, passo a passo.
13. **Documentos relacionados** — tabela "quando consultar cada um" (incluir `.claude/CORNER_CASES.md`).
14. **Notas importantes / gotchas** — patches, versões especiais, integrações externas, dívida técnica.

Regras de qualidade (do guia "CLAUDE.md que funciona"):

- **Sê específico, não vago.** "Usa camelCase para variáveis" e não "escreve código limpo"; "`pnpm test`" e não "testa tudo".
- **Referencia, não dupliques.** Aponta para `package.json`/`composer.json`/`tsconfig` em vez de copiar conteúdos.
- **Mantém abaixo de ~500 linhas.** Demasiado longo = contexto ignorado. O detalhe vive nos ficheiros de apoio.
- Documento vivo: nota no fim que deve ser atualizado quando a arquitetura evoluir.

### 5.1. Bloco a inserir — Diretiva de Seleção Automática de Modelo

```markdown
## Seleção Automática de Modelo

O modelo ativo é escolhido pelo utilizador; este ficheiro **não** o troca sozinho. Esta diretiva instrui o
agente a **avaliar a complexidade da tarefa** e, quando não corresponder ao modelo ativo, **recomendar a troca
numa linha** antes de avançar.

| Complexidade | Modelo     | Exemplos neste projeto                                                                                                               |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Alta         | **Opus**   | refactor cross-module, decisões de arquitetura, debugging difícil, auditoria de segurança/performance, migrações de schema complexas |
| Média        | **Sonnet** | implementar feature definida, escrever testes, queries SQL não triviais, edição de docs                                              |
| Trivial      | **Haiku**  | renomear, formatação, tarefas mecânicas, perguntas de sintaxe                                                                        |

Regras: na dúvida entre dois níveis, escolhe o **mais alto**. Recomenda subir quando a tarefa exceder o modelo
atual; sugere descer só se a poupança for relevante. Não interrompas o fluxo por tarefas triviais isoladas.
```

_(Adapta os exemplos da tabela à realidade concreta deste projeto.)_

### 5.2. Bloco a inserir — Acesso a Skills/Agents

```markdown
## Skills, Agents e Commands

- Usa as **skills/agents instalados globalmente** quando aplicáveis (análise de arquitetura, revisão de
  segurança, geração de docs, testing strategy, etc.) em vez de reimplementar a lógica.
- Skills/agents/commands **deste projeto** (em `.claude/`) têm prioridade sobre os globais.
- Slash commands disponíveis: <listar os criados, se algum>. Caso contrário, indicar "nenhum específico do projeto".
```

### 5.3. Bloco a inserir — Ficheiro de Memória (Corner Cases)

```markdown
## Memória do Projeto — Corner Cases

**Lê `.claude/CORNER_CASES.md` no início de cada tarefa não trivial.**

É um log vivo de comportamentos não óbvios, gotchas e edge cases já resolvidos neste projeto — serve para eu
(agente) **não repetir os mesmos erros**. Está organizado por área (ex.: DB, framework, build, integrações).

Regras de manutenção:

- Sempre que **resolveres** um problema não óbvio (um bug com causa surpreendente, um workaround, uma armadilha
  de configuração, um comportamento contra-intuitivo de uma lib), **acrescenta uma entrada** na área certa.
- Antes de acrescentar, confirma que ainda não existe entrada equivalente; se existir, **melhora-a** em vez de duplicar.
- Mantém cada entrada concisa: um título curto + sintoma/contexto + causa + fix/workaround (1–5 linhas no total).
- Não registes problemas triviais nem coisas já cobertas pelas convenções; só o que pouparia tempo a um agente futuro.
- Nunca incluas segredos, dados pessoais ou credenciais nas entradas.
```

### 5.4. Bloco a inserir — Workflow de Git (git flow)

> Inclui este bloco **apenas se este projeto autorizar ações Git**. Caso contrário, omite-o e mantém a regra
> de "nenhuma ação Git" nas restrições.

```markdown
## Workflow de Git — git flow

Este projeto segue **git flow**. Branches:

| Branch          | Papel                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| `main`/`master` | Código estável, em produção. Nunca commitar diretamente.                      |
| `develop`       | Integração do trabalho em curso. Base das features.                           |
| `feature/*`     | Nova funcionalidade. Sai de `develop`, volta a `develop`.                     |
| `release/*`     | Preparação de release. Sai de `develop`, funde em `main` **e** `develop`.     |
| `hotfix/*`      | Correção urgente em produção. Sai de `main`, funde em `main` **e** `develop`. |
| `bugfix/*`      | Correção durante uma release. Sai de `release/*` (ou `develop`).              |

Regras para o agente:

- Trabalho novo → cria/usa um branch `feature/<descrição-curta>` a partir de `develop` (nunca commitar em `main`/`develop` diretamente).
- Nomes de branch em kebab-case e descritivos: `feature/export-csv-async`, `hotfix/login-ldap-timeout`.
- Merges seguem as direções da tabela; não saltar `develop` exceto em `hotfix`.
- **Não executo merges, pushes nem abro PRs por iniciativa própria** — preparo o branch/commits e o utilizador valida e dispara as ações de partilha.
- Mensagens de commit: <Conventional Commits, se aplicável>. Sem linhas de atribuição a IA.
```

_(Adapta os nomes de branch e a convenção de mensagens à realidade do projeto. Se for usado `git-flow` CLI, podes referir os comandos `git flow feature start/finish`.)_

---

## 6. Ficheiro de Memória — conteúdo inicial (`.claude/CORNER_CASES.md`)

Cria **sempre** este ficheiro, mesmo que comece praticamente vazio. Usa este esqueleto e, se já encontrares
gotchas durante a análise (ex.: patches obrigatórios, versões `@dev` intencionais, breaking changes conhecidos),
**semeia-os já** como primeiras entradas nas áreas certas:

```markdown
# CORNER_CASES.md — Memória do Projeto

Log vivo de corner cases e gotchas resolvidos neste projeto. Lido no início de cada tarefa não trivial pelo
agente, para não repetir erros. Acrescentar entradas concisas (título + sintoma + causa + fix). Sem segredos.

## Build / Dependências

<!-- ex.: patch obrigatório X aplicado via composer-patches; porquê; o que parte se for removido -->

## Base de Dados / Migrations

<!-- ex.: extensão PostGIS necessária; SRID 4326; armadilhas de migration -->

## Framework / Aplicação

<!-- ex.: comportamento não óbvio de config, RBAC, urlManager, módulos -->

## Filas / Workers

<!-- ex.: restart obrigatório após alterar jobs; tubes; idempotência -->

## Integrações Externas

<!-- ex.: endpoints SOAP/REST indisponíveis fora da rede; mocks locais -->

## Frontend / UI

<!-- ex.: gotchas de Next.js/server components, shadcn, temas -->

## Outros
```

Adapta as áreas à stack real do projeto (remove as que não se aplicam, acrescenta as que faltarem).

---

## 7. Análise: vale a pena `CLAUDE.md` por pasta?

Depois de gerar o `CLAUDE.md` principal, **avalia e recomenda** (não cries já) se subpastas justificam o seu próprio `CLAUDE.md` de scope _Folder_. Critérios para recomendar um:

- A pasta é um **domínio/módulo/app autónomo** com convenções próprias que divergem da raiz (ex.: `apps/web` Next.js vs `apps/auth` NestJS; `models/mw/` vs `models/mobile/`).
- Tem **gotchas locais** repetidos que poluiriam o ficheiro raiz.
- É **tocada com frequência** isoladamente, sem o resto do repo em contexto.

Não recomendes para pastas pequenas, triviais, ou cujas regras já cabem bem na raiz. Apresenta a recomendação como uma lista curta: `pasta → porquê → o que o ficheiro local cobriria`. Eu decido se avançamos.

---

## 8. Skills / Agents / Commands a criar (opcional)

Só cria artefactos em `.claude/` se trouxerem reutilização real neste projeto. Candidatos típicos:

- **Skills:** `analyze-architecture`, `trace-request-flow`, `generate-docs`, `review-security`, `performance-audit`, `find-entrypoints`, `dependency-map`, `onboard`, `refactor-module`, `tdd`.
- **Agents:** `architect`, `security-reviewer`, `performance-analyst`, `documentation-writer`.
- **Commands:** um slash command por skill, em `.claude/commands/`.

Se criares, mantém cada artefacto pequeno e com um `README` curto na respetiva pasta, e lista-os no bloco 5.2.

---

## 9. Resultado Esperado

No fim, eu devo conseguir: compreender a arquitetura depressa; localizar qualquer funcionalidade; seguir um
request do entrypoint até à base de dados; identificar jobs/filas; detetar riscos de segurança/performance;
refatorar com segurança; e fazer onboarding de um novo developer ou agente.

Termina com um **resumo do que criaste/atualizaste** (incluindo `.claude/CORNER_CASES.md`) e a **recomendação sobre `CLAUDE.md` por pasta** (secção 7).
