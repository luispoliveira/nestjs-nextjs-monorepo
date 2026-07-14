# Primeiro Deploy — VPS

Guia passo-a-passo para instalar o monorepo num servidor Ubuntu 22.04 novo.

---

## 1. Pré-requisitos no servidor

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential
```

### Node.js 22 (via nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

nvm install 22
nvm use 22
nvm alias default 22
node -v   # v22.x.x
```

### pnpm 10.33.0

```bash
npm install -g pnpm@10.33.0
pnpm -v   # 10.33.0
```

### PM2

```bash
npm install -g pm2

pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
pm2 set pm2-logrotate:workerInterval 3600
```

---

## 2. Instalar infraestrutura

Seguir os guias em `infra/`:

- [postgres.md](infra/postgres.md) — PostgreSQL 17
- [redis.md](infra/redis.md) — Redis 8

### MongoDB 6

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc \
  | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod

# Criar utilizador com autenticação
mongosh admin --eval "
  db.createUser({
    user: 'appuser',
    pwd: '<MONGO_PASSWORD>',
    roles: [{ role: 'readWrite', db: 'appdb' }]
  });
"
```

---

## 3. Clonar o repositório

```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone <URL_DO_REPOSITÓRIO> app
cd app
```

---

## 4. Variáveis de ambiente

O `ecosystem.config.js` carrega um único ficheiro `.env.production` (ou `.env.qa`) na
raiz e injeta-o em todas as apps. `PORT` e `NODE_ENV` de cada app já estão definidos
no ecosystem.

Copiar [.env.example](.env.example) para a raiz como `.env.production` e preencher os
valores marcados `PREENCHER`:

```bash
cp docs/deploy/.env.example .env.production
nano .env.production
```

Gerar secrets:

```bash
openssl rand -hex 32   # BETTER_AUTH_SECRET
```

### `packages/database/.env`

```dotenv
DATABASE_URL="postgres://appuser:<PG_PASSWORD>@localhost:5432/appdb?schema=public"
```

> O `prisma.config.ts` usa `dotenv/config`, que carrega o `.env` do próprio package.
> Necessário para que `prisma migrate deploy` encontre a `DATABASE_URL`.

---

## 5. Instalar dependências e fazer build

```bash
cd /var/www/app

pnpm install --frozen-lockfile
pnpm build
```

`pnpm build` corre `turbo run build`, que gera o cliente Prisma, compila os packages e
compila todas as apps NestJS + o Next.js (`output: standalone`).

Copiar os ficheiros estáticos do Next.js para o directório standalone (necessário
sempre que se faz build):

```bash
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public apps/web/.next/standalone/apps/web/public
```

---

## 6. Correr migrações da base de dados

```bash
cd /var/www/app

# Aplicar migrações pendentes (seguro em produção — não apaga dados)
pnpm --filter @repo/database db:migrate:deploy
```

---

## 7. Criar directório de logs e arrancar PM2

```bash
mkdir -p /var/www/app/logs

cd /var/www/app
pm2 start ecosystem.config.js --env production

pm2 status   # todos devem estar "online"
pm2 logs     # verificar ausência de erros de arranque
```

### Persistir após reboot

```bash
pm2 save
pm2 startup
# Copiar e executar o comando que o pm2 startup imprime
```

---

## 8. Nginx

Instalar Nginx e Certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
```

Copiar e adaptar o template (agnóstico — ver comentários no próprio ficheiro para o
caso de deploy num subpath):

```bash
sudo cp /var/www/app/docs/deploy/nginx/app.conf /etc/nginx/sites-available/app

# Substituir <dominio> pelo domínio real
sudo nano /etc/nginx/sites-available/app

sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
```

Obter certificado SSL:

```bash
sudo certbot --nginx -d <dominio>
sudo systemctl reload nginx
```

---

## 9. Monitorização (opcional)

Ver [infra/monitoring.md](infra/monitoring.md) para deploy de Prometheus + Grafana via
Docker ao lado do PM2.

---

## 10. Verificações finais

```bash
# PM2
pm2 status

# Health endpoints — todas as apps usam o mesmo prefixo (/api); a distinção é pela porta
curl -s http://localhost:3000/api/health/live  | jq .   # auth
curl -s http://localhost:3100/api/health/live  | jq .   # api
curl -s http://localhost:3200/api/health/live  | jq .   # cron
curl -s http://localhost:3300/api/health/live  | jq .   # notifications
curl -s http://localhost:3400/api/health/live  | jq .   # worker

# Nginx → HTTPS
curl -I https://<dominio>
```

Portas internas (3000, 3100, 3200, 3300, 3400, 8080) **não devem ser acessíveis** do
exterior — só 80/443 via Nginx.

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
