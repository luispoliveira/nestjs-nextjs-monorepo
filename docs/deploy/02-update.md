# Atualizar o Deploy

Workflow para cada atualização de código em produção.

---

## Deploy rápido (sem migrações, sem mudanças de infra)

```bash
cd /var/www/app

git pull origin main
pnpm install --frozen-lockfile
pnpm build

cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public apps/web/.next/standalone/apps/web/public

pm2 reload ecosystem.config.js --env production
pm2 save
```

> `pm2 reload` faz rolling restart (zero-downtime nos processos em cluster). Usa
> `pm2 restart` se precisares de um restart completo e imediato.

---

## Deploy com migrações de schema

```bash
cd /var/www/app

git pull origin main
pnpm install --frozen-lockfile
pnpm build

# Aplicar migrações (seguro se não houver alterações pendentes)
pnpm --filter @repo/database db:migrate:deploy

cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public apps/web/.next/standalone/apps/web/public

pm2 reload ecosystem.config.js --env production
pm2 save
```

---

## Rollback

```bash
cd /var/www/app

git log --oneline -10          # identificar o commit anterior
git checkout <commit-hash>

pnpm install --frozen-lockfile
pnpm build

pm2 reload ecosystem.config.js --env production
pm2 save
```

> Migrações de BD **não fazem rollback automático**. Se houve migração, avalia se é
> necessário reverter manualmente.

---

## Comandos PM2 úteis

```bash
pm2 status                    # estado de todos os processos
pm2 logs api --lines 100      # logs de uma app
pm2 logs --err                # apenas erros
pm2 reload api                # reload sem downtime
pm2 restart worker            # restart completo
pm2 show auth                 # métricas e detalhes
pm2 monit                     # dashboard em tempo real
pm2 flush                     # limpar logs
```

---

## Verificar saúde após deploy

```bash
pm2 status

curl -s http://localhost:3000/api/health/live  | jq .status   # auth
curl -s http://localhost:3100/api/health/live  | jq .status   # api
curl -s http://localhost:3200/api/health/live  | jq .status   # cron
curl -s http://localhost:3300/api/health/live  | jq .status   # notifications
curl -s http://localhost:3400/api/health/live  | jq .status   # worker
```
