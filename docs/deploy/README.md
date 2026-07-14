# Deploy — NestJS + Next.js Monorepo

Stack: NestJS monorepo (Turborepo + pnpm) + PM2 numa VPS Ubuntu, sem Docker para as apps.
PostgreSQL, Redis e MongoDB correm nativos na VPS; Prometheus e Grafana (opcionais) correm
em Docker ao lado do PM2.

---

## Documentos

| Ficheiro                                   | Quando usar                                                          |
| ------------------------------------------ | -------------------------------------------------------------------- |
| [01-first-deploy.md](01-first-deploy.md)   | Primeiro deploy num servidor novo                                    |
| [.env.example](.env.example)               | Todas as variáveis de ambiente a preencher (`.env.production`)       |
| [02-update.md](02-update.md)               | Cada atualização de código                                           |
| [nginx/app.conf](nginx/app.conf)           | Configuração Nginx (template agnóstico — substituir placeholders)    |
| [infra/postgres.md](infra/postgres.md)     | Instalação e hardening de PostgreSQL                                 |
| [infra/redis.md](infra/redis.md)           | Instalação e hardening de Redis                                      |
| [infra/monitoring.md](infra/monitoring.md) | Deploy opcional de Prometheus + Grafana (via Docker, ao lado do PM2) |

---

## Serviços e portas

| Processo PM2  | Porta | Exposto via Nginx            |
| ------------- | ----- | ---------------------------- |
| auth          | 3000  | `/api/auth/`                 |
| api           | 3100  | `/api/`                      |
| cron          | 3200  | — (interno, health/metrics)  |
| notifications | 3300  | — (interno via Redis)        |
| worker        | 3400  | — (interno via Redis/BullMQ) |
| web           | 8080  | `/`                          |

**Infraestrutura** (não exposta ao exterior — só localhost):

| Serviço    | Porta |
| ---------- | ----- |
| PostgreSQL | 5432  |
| Redis      | 6379  |
| MongoDB    | 27017 |

**Monitorização** (opcional, ver [infra/monitoring.md](infra/monitoring.md)):

| Serviço    | Porta |
| ---------- | ----- |
| Prometheus | 9090  |
| Grafana    | 3333  |

### Deploy num subpath (ex: `/admin`)

O `nginx/app.conf` assume por omissão que o `web` (Next.js) é servido na raiz do domínio.
Se precisares de o servir sob um subpath (ex: quando o domínio raiz já serve outra app),
define `NEXT_PUBLIC_BASE_PATH=/admin` no `.env.production` e segue os comentários no
próprio `nginx/app.conf` para adaptar o `location`. O `basePath` do Next tem de bater
certo com o path do Nginx — caso contrário os assets `_next/*` resolvem para a raiz e
dão 404 atrás do proxy.

---

## Checklist rápida (primeiro deploy)

- [ ] Ubuntu 22.04, Node 22, pnpm 10.33.0, PM2 instalados
- [ ] PostgreSQL instalado e configurado ([infra/postgres.md](infra/postgres.md))
- [ ] Redis instalado e configurado ([infra/redis.md](infra/redis.md))
- [ ] MongoDB instalado e configurado
- [ ] Repositório clonado em `/var/www/<app>`
- [ ] `.env.production` criado na raiz com todos os valores
- [ ] `packages/database/.env` criado com `DATABASE_URL`
- [ ] `pnpm install --frozen-lockfile` executado
- [ ] `pnpm build` executado com sucesso
- [ ] Ficheiros estáticos Next.js copiados (`cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static`)
- [ ] `pnpm --filter @repo/database db:migrate:deploy` executado
- [ ] `pm2 start ecosystem.config.js --env production` executado
- [ ] `pm2 startup` + `pm2 save` configurados
- [ ] Nginx configurado e HTTPS ativo
- [ ] (Opcional) Prometheus + Grafana no ar ([infra/monitoring.md](infra/monitoring.md))
