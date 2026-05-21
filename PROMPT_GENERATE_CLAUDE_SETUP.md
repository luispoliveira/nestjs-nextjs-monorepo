# PROMPT GENERATE CLAUDE SETUP - Template for NestJs and Nextjs AP

Analisa esta codebase e gera/atualiza toda a documentação e estrutura de suporte para o Claude Code.

## Objetivo

Pretendo que compreendas profundamente a arquitetura do projeto 3Ms Online Plataform e cries os seguintes ficheiros, se ainda não existirem, ou os atualizes caso já existam:

- CLAUDE.md
- PROJECT_MAP.md
- ARCHITECTURE_OVERVIEW.md
- ENTRYPOINTS.md
- CONVENTIONS.md
- DEPENDENCY_GRAPH.md
- .claude/skills/\*
- .claude/commands/\*
- .claude/agents/\*

## Contexto do Projeto

### Nome

Nestjs Nextjs Monorepo Template

### Objetivo

Template monorepo para aplicações Nestjs e Nextjs, com foco em boas práticas, escalabilidade e facilidade de onboarding.

### Stack Tecnológica

- NestJs
- NextJs
- Better Auth
- PostgreSQL
- pnpm
- Redis
- Prisma
- Mongodb
- Docker
- turborepo
- pm2
- openspec para spec driven development

### Tipo de Aplicação

- Aplicação Nestjs Backend
- Aplicação Nextjs Frontend
- API REST
- Trpc
- Microserviços

### Arquitetura Atual

- Nestjs modular com microserviços
- Nextjs com API Routes e integração com Nestjs
- Mais de 100 ficheiros
- Mais de 5 módulos
- Existe código legado e oportunidades de melhoria

### Restrições

- Podes executar comandos locais e modificar ficheiros
- Não deves executar qualquer ação Git (commit, push, branch, PR)

## O que deves analisar

1. Estrutura de diretórios
2. Módulos
3. Controllers, Routers, Services
4. Components e Helpers
5. Migrations e schema PostgreSQL
6. API REST endpoints
7. Graphql endpoints
8. Dependências entre módulos
9. Gargalos de performance
10. Problemas de segurança
11. Código duplicado e oportunidades de refatoração

## Skills a Criar

Nota: segue o mesmo padrão de criação dos skills já existentes

- analyze-architecture
- trace-request-flow
- generate-docs
- review-security
- performance-audit
- find-entrypoints
- dependency-map
- onboard
- refactor-module
- tdd

## Agents a Criar

- architect
- security-reviewer
- performance-analyst
- documentation-writer

## Commands a Criar

Nota: segue o mesmo padrão de criação dos commands já existentes

Cria slash commands em .claude/commands para invocar cada skill.

## Ficheiros de Documentação

### CLAUDE.md

Deve conter:

- Resumo do projeto
- Stack tecnológica
- Estrutura de pastas
- Convenções
- Comandos úteis
- Restrições (sem Git)
- Fluxo típico de request

### PROJECT_MAP.md

Mapa da codebase com descrição de cada pasta principal.

### ARCHITECTURE_OVERVIEW.md

Descrição detalhada da arquitetura MVC, módulos, filas e integrações.

### ENTRYPOINTS.md

Lista de pontos de entrada:

- index.php
- console.php
- rotas REST
- jobs
- cron tasks

### DEPENDENCY_GRAPH.md

Mapa de dependências entre módulos.

### CONVENTIONS.md

Boas práticas e padrões recomendados para este projeto.

## Estratégia de Análise

1. Identificar entrypoints
2. Mapear módulos
3. Localizar modelos de dados
4. Seguir requests HTTP
5. Analisar filas assíncronas
6. Documentar dependências
7. Identificar melhorias

## Comandos Permitidos

Podes utilizar comandos como:

- find
- grep
- rg
- tree
- php
- composer
- ls
- cat

Não deves utilizar comandos Git.

## Resultado Esperado

Após a análise, devo conseguir:

- Compreender rapidamente a arquitetura
- Localizar qualquer funcionalidade
- Seguir um request do controller até à base de dados
- Identificar jobs e filas
- Detetar problemas de segurança e performance
- Refatorar módulos com segurança
- Criar documentação para onboarding

## Prioridades

1. Rapidez na compreensão da codebase
2. Documentação clara e navegável
3. Minimização do consumo de contexto
4. Reutilização através de skills e agents

## MCPs

Existem MCPs que podem ser úteis para esta tarefa e para futuras análises de codebases.
Podes adicionar estes MCPs ao Claude para melhorar a análise e documentação:

- Context7 MCP: https://github.com/upstash/context7

## Notas Finais

Como este projeto é um template pode ser necessário voltar a correr este prompt para atualizar a documentação e skills à medida que o template evolui. O objetivo é criar uma base sólida para futuros projetos Nestjs e Nextjs, facilitando o onboarding e a manutenção.
