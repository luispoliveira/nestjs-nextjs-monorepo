# Guia de Deploy em Produção — PM2 (sem Docker)

Este guia cobre o deploy da plataforma diretamente no servidor usando **PM2** como process manager, sem Docker para as aplicações. A infraestrutura (PostgreSQL, Redis, MongoDB) pode ser instalada nativa ou gerida separadamente.

---

## Pré-requisitos no Servidor

```bash
# Node.js 22
node --version   # deve ser >= 22

# pnpm
npm install -g pnpm

# PM2
npm install -g pm2

# (opcional) turbo global — acelera builds repetidos
npm install -g turbo
```

---

## 1. Instalar e Configurar a Infraestrutura

Instalar PostgreSQL, Redis e MongoDB no servidor ou apontar para instâncias geridas (RDS, ElastiCache, Atlas, etc.).

### PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib

sudo -u postgres psql -c "CREATE USER tx_home WITH PASSWORD '<PG_PASS>';"
sudo -u postgres psql -c "CREATE DATABASE tx_home OWNER tx_home;"
```

### Redis

```bash
sudo apt install redis-server

# Ativar password (recomendado em produção)
# Editar /etc/redis/redis.conf:
#   requirepass <REDIS_PASS>

sudo systemctl enable --now redis-server
```

### MongoDB

```bash
# Seguir instalação oficial para Ubuntu/Debian:
# https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/

sudo systemctl enable --now mongod

# Criar utilizador
mongosh --eval "
  db = db.getSiblingDB('tx_home');
  db.createUser({ user: 'tx_home', pwd: '<MONGO_PASS>', roles: [{ role: 'readWrite', db: 'tx_home' }] });
"
```

---

## 2. Clonar o Repositório

```bash
git clone <repo-url> /opt/tx-home
cd /opt/tx-home
```

---

## 3. Instalar Dependências e Fazer Build

```bash
cd /opt/tx-home

pnpm install --frozen-lockfile

pnpm build
```

O build corre para todos os packages e apps via Turborepo. Os artefactos ficam em `apps/*/dist/`.

O Next.js gera o output standalone em `apps/web/.next/`.

---

## 4. Configurar Variáveis de Ambiente

Criar um ficheiro `.env` em cada app. As variáveis são carregadas pelo PM2 via `env_production` no ecosystem file (secção 5).

### Gerar secrets

```bash
openssl rand -base64 32   # para BETTER_AUTH_SECRET
openssl rand -base64 32   # para ENCRYPTION_KEY  (usar o mesmo valor em todos os serviços)
```

> **Importante**: `BETTER_AUTH_SECRET` e `ENCRYPTION_KEY` têm de ser **iguais** em todos os serviços NestJS.

---

### `apps/auth/.env`

```dotenv
NODE_ENV=production
PORT=3000

DATABASE_URL=postgres://tx_home:<PG_PASS>@localhost:5432/tx_home?schema=public

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<REDIS_PASS>

MONGO_URI=mongodb://tx_home:<MONGO_PASS>@127.0.0.1:27017/tx_home?authSource=tx_home

BETTER_AUTH_SECRET=<gerar com openssl rand -base64 32>
BETTER_AUTH_URL=https://<dominio>/api/auth

UI_URL=https://<dominio>

ADMIN_EMAIL=admin@<empresa>.com
ADMIN_PASSWORD=<password forte>

CORS_ORIGIN=https://<dominio>

ENCRYPTION_KEY=<gerar com openssl rand -base64 32>

# Opcional — Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

### `apps/api/.env`

```dotenv
NODE_ENV=production
PORT=3300

DATABASE_URL=postgres://tx_home:<PG_PASS>@localhost:5432/tx_home?schema=public

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<REDIS_PASS>

MONGO_URI=mongodb://tx_home:<MONGO_PASS>@127.0.0.1:27017/tx_home?authSource=tx_home

BETTER_AUTH_SECRET=<mesmo valor que apps/auth>
BETTER_AUTH_URL=https://<dominio>/api/auth

CORS_ORIGIN=https://<dominio>

ENCRYPTION_KEY=<mesmo valor que apps/auth>

UPLISTING_URL=https://connect.uplisting.io

PUBLIC_API_URL=https://<dominio>
```

---

### `apps/notifications/.env`

```dotenv
NODE_ENV=production
PORT=3100

DATABASE_URL=postgres://tx_home:<PG_PASS>@localhost:5432/tx_home?schema=public

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<REDIS_PASS>

MONGO_URI=mongodb://tx_home:<MONGO_PASS>@127.0.0.1:27017/tx_home?authSource=tx_home

CORS_ORIGIN=https://<dominio>

ENCRYPTION_KEY=<mesmo valor que apps/auth>
```

---

### `apps/worker/.env`

```dotenv
NODE_ENV=production
PORT=3200

DATABASE_URL=postgres://tx_home:<PG_PASS>@localhost:5432/tx_home?schema=public

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<REDIS_PASS>

MONGO_URI=mongodb://tx_home:<MONGO_PASS>@127.0.0.1:27017/tx_home?authSource=tx_home

CORS_ORIGIN=https://<dominio>

ENCRYPTION_KEY=<mesmo valor que apps/auth>

UPLISTING_URL=https://connect.uplisting.io

BREVO_API_KEY=<API key do Brevo>
FROM_EMAIL=noreply@<dominio>
FROM_NAME=TX Home
DEV_EMAIL=
```

---

### `apps/web/.env`

```dotenv
NODE_ENV=production

# URLs internas — usadas pelos rewrites do next.config.ts (server-side)
AUTH_API_URL=http://127.0.0.1:3000
API_URL=http://127.0.0.1:3300

# URL pública — exposta ao browser
NEXT_PUBLIC_AUTH_API_URL=https://<dominio>
NEXT_PUBLIC_API_URL=https://<dominio>

BACKEND_PROTOCOL=https
BACKEND_HOST=<dominio>

# Opcional — CDN para imagens
NEXT_PUBLIC_STORAGE_URL=
```

---

## 5. Ecosystem File do PM2

Criar o ficheiro `ecosystem.config.cjs` na raiz do projeto:

```js
module.exports = {
  apps: [
    {
      name: 'auth',
      script: 'apps/auth/dist/main.js',
      cwd: '/opt/tx-home',
      instances: 1,
      exec_mode: 'fork',
      env_file: 'apps/auth/.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/tx-home/auth-error.log',
      out_file: '/var/log/tx-home/auth-out.log',
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'api',
      script: 'apps/api/dist/main.js',
      cwd: '/opt/tx-home',
      instances: 1,
      exec_mode: 'fork',
      env_file: 'apps/api/.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/tx-home/api-error.log',
      out_file: '/var/log/tx-home/api-out.log',
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'notifications',
      script: 'apps/notifications/dist/main.js',
      cwd: '/opt/tx-home',
      instances: 1,
      exec_mode: 'fork',
      env_file: 'apps/notifications/.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/tx-home/notifications-error.log',
      out_file: '/var/log/tx-home/notifications-out.log',
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'worker',
      script: 'apps/worker/dist/main.js',
      cwd: '/opt/tx-home',
      instances: 1,
      exec_mode: 'fork',
      env_file: 'apps/worker/.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/tx-home/worker-error.log',
      out_file: '/var/log/tx-home/worker-out.log',
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'web',
      script: 'node_modules/.bin/next',
      args: 'start --port 8080',
      cwd: '/opt/tx-home/apps/web',
      instances: 1,
      exec_mode: 'fork',
      env_file: '/opt/tx-home/apps/web/.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/tx-home/web-error.log',
      out_file: '/var/log/tx-home/web-out.log',
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
```

Criar a pasta de logs:

```bash
sudo mkdir -p /var/log/tx-home
sudo chown $USER:$USER /var/log/tx-home
```

---

## 6. Correr Migrações

```bash
cd /opt/tx-home

# Gerar cliente Prisma
pnpm db:generate

# Aplicar migrações na BD de produção
# (usa DATABASE_URL do .env na raiz ou exportar diretamente)
export DATABASE_URL="postgres://tx_home:<PG_PASS>@localhost:5432/tx_home?schema=public"
pnpm db:migrate

# Criar utilizador admin (usa ADMIN_EMAIL e ADMIN_PASSWORD do .env do auth)
pnpm db:seed
```

---

## 7. Iniciar os Serviços com PM2

```bash
cd /opt/tx-home

pm2 start ecosystem.config.cjs

# Ver estado de todos os processos
pm2 status

# Ver logs em tempo real
pm2 logs

# Logs de uma app específica
pm2 logs auth
pm2 logs api
```

### Ativar arranque automático no boot

```bash
pm2 startup        # gera e imprime o comando systemd — executar o comando impresso
pm2 save           # guarda a lista de processos actuais
```

---

## 8. Comandos PM2 Úteis

```bash
# Reiniciar um serviço
pm2 restart auth

# Reiniciar todos
pm2 restart all

# Recarregar sem downtime (graceful reload)
pm2 reload api

# Parar
pm2 stop worker

# Ver detalhes e métricas
pm2 show auth

# Monitorização em tempo real
pm2 monit

# Limpar logs
pm2 flush
```

---

## 9. Configurar Nginx como Reverse Proxy

```bash
sudo apt install nginx
```

Criar `/etc/nginx/sites-available/tx-home`:

```nginx
server {
    listen 80;
    server_name <dominio>;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name <dominio>;

    ssl_certificate     /etc/ssl/certs/<dominio>.crt;
    ssl_certificate_key /etc/ssl/private/<dominio>.key;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Auth API
    location /api/auth/ {
        proxy_pass http://127.0.0.1:3000/api/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API (tRPC + REST)
    location /api/ {
        proxy_pass http://127.0.0.1:3300/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tx-home /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

> O `notifications` (3100) e o `worker` (3200) **não devem ser expostos** — comunicam apenas internamente via Redis.

---

## 10. Workflow de Deploy de Atualizações

```bash
cd /opt/tx-home

# 1. Buscar código novo
git pull origin main

# 2. Instalar novas dependências (se houver)
pnpm install --frozen-lockfile

# 3. Build
pnpm build

# 4. Migrações (se houver alterações ao schema)
pnpm db:migrate

# 5. Recarregar processos sem downtime
pm2 reload all
```

---

## 11. Checklist de Deploy

- [ ] Node.js 22, pnpm e PM2 instalados
- [ ] PostgreSQL, Redis e MongoDB a correr
- [ ] `apps/auth/.env` criado e preenchido
- [ ] `apps/api/.env` criado e preenchido
- [ ] `apps/notifications/.env` criado e preenchido
- [ ] `apps/worker/.env` criado e preenchido
- [ ] `apps/web/.env` criado e preenchido
- [ ] `BETTER_AUTH_SECRET` igual em `auth` e `api`
- [ ] `ENCRYPTION_KEY` igual em `auth`, `api`, `notifications` e `worker`
- [ ] `CORS_ORIGIN` sem `*`, apenas o domínio de produção
- [ ] `PUBLIC_API_URL` definida em `apps/api`
- [ ] `UI_URL` definida em `apps/auth`
- [ ] `BREVO_API_KEY` válida em `apps/worker`
- [ ] `pnpm build` executado com sucesso
- [ ] `pnpm db:migrate` executado
- [ ] `pnpm db:seed` executado
- [ ] `ecosystem.config.cjs` criado na raiz
- [ ] `pm2 start ecosystem.config.cjs` executado
- [ ] `pm2 startup` + `pm2 save` configurados
- [ ] Nginx configurado e a servir HTTPS
- [ ] Portas 3000, 3100, 3200, 3300, 8080 **não expostas** diretamente ao exterior (apenas 80/443 via Nginx)
