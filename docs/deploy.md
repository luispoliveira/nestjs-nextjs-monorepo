# Deploy em Produção — NestJS + Next.js Monorepo

Stack: NestJS monorepo (Turborepo + pnpm), sem Docker, PM2 como process manager.

---

## Índice

1. [Pré-requisitos na VPS](#1-pré-requisitos-na-vps)
2. [Configurar Node.js e pnpm](#2-configurar-nodejs-e-pnpm)
3. [Instalar PM2](#3-instalar-pm2)
4. [Instalar serviços de infraestrutura](#4-instalar-serviços-de-infraestrutura)
5. [Clonar o repositório](#5-clonar-o-repositório)
6. [Configurar variáveis de ambiente](#6-configurar-variáveis-de-ambiente)
7. [Instalar dependências e fazer build](#7-instalar-dependências-e-fazer-build)
8. [Correr migrações da base de dados](#8-correr-migrações-da-base-de-dados)
9. [Configurar o PM2](#9-configurar-o-pm2)
10. [Arrancar os serviços](#10-arrancar-os-serviços)
11. [Configurar Nginx (reverse proxy)](#11-configurar-nginx-reverse-proxy)
12. [Deploy de actualizações](#12-deploy-de-actualizações)

---

## 1. Pré-requisitos na VPS

- Ubuntu 22.04 LTS (ou superior)
- Acesso root ou utilizador com sudo
- Git instalado
- Portas abertas: 80, 443, e as internas dos serviços

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential
```

---

## 2. Configurar Node.js e pnpm

### Instalar nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
```

### Instalar Node.js 22

```bash
nvm install 22
nvm use 22
nvm alias default 22
node -v   # deve mostrar v22.x.x
```

### Instalar pnpm 10.33.0

```bash
npm install -g pnpm@10.33.0
pnpm -v   # deve mostrar 10.33.0
```

---

## 3. Instalar PM2

```bash
npm install -g pm2
pm2 -v
```

### Instalar logrotate (recomendado)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
pm2 set pm2-logrotate:workerInterval 3600
```

---

## 4. Instalar serviços de infraestrutura

Os serviços abaixo correm directamente na VPS (sem Docker).

### PostgreSQL 17

```bash
sudo apt install -y postgresql-17 postgresql-contrib

sudo systemctl enable postgresql
sudo systemctl start postgresql

# Criar utilizador e base de dados
sudo -u postgres psql <<EOF
CREATE USER appuser WITH PASSWORD 'ALTERAR_PASSWORD_FORTE';
CREATE DATABASE appdb OWNER appuser;
GRANT ALL PRIVILEGES ON DATABASE appdb TO appuser;
EOF
```

### Redis 8

```bash
sudo apt install -y lsb-release gpg
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt update
sudo apt install -y redis

sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verificar
redis-cli ping   # deve responder PONG
```

> **Nota:** Em produção, configura uma password no Redis em `/etc/redis/redis.conf` (`requirepass ALTERAR_PASSWORD`).

### MongoDB 6

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

sudo systemctl enable mongod
sudo systemctl start mongod

# Criar utilizador com autenticação
mongosh <<EOF
use admin
db.createUser({ user: "appuser", pwd: "ALTERAR_PASSWORD_FORTE", roles: [{ role: "readWrite", db: "appdb" }] })
EOF
```

---

## 5. Clonar o repositório

```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www

cd /var/www
git clone <URL_DO_REPOSITÓRIO> app
cd app
```

---

## 6. Configurar variáveis de ambiente

O `ecosystem.config.js` carrega um único ficheiro `.env.production` (ou `.env.qa`) na raiz do projecto e injeta-o em todas as apps. As variáveis específicas de cada app (`PORT`, `NODE_ENV`, `HOSTNAME`) estão definidas directamente no ecosystem.

> **NUNCA** commites ficheiros `.env.*` com credenciais reais.

### Portas por app (definidas no `ecosystem.config.js`)

| App           | Porta |
|---------------|-------|
| auth          | 3000  |
| api           | 3300  |
| notifications | 3100  |
| worker        | 3200  |
| web           | 3400  |

### `.env.production` (raiz do projecto)

```env
DATABASE_URL="postgresql://appuser:PASSWORD@localhost:5432/appdb?schema=public"

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=PASSWORD_REDIS

MONGO_URI="mongodb://appuser:PASSWORD@localhost:27017/appdb?authSource=admin"

CORS_ORIGIN=https://teu-dominio.com

BETTER_AUTH_SECRET=gerar_com_openssl_rand_hex_32
BETTER_AUTH_URL=https://teu-dominio.com/api/auth

ADMIN_EMAIL=admin@teu-dominio.com
ADMIN_PASSWORD=PASSWORD_FORTE

# Next.js (web)
AUTH_API_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_API_URL=https://teu-dominio.com
BACKEND_PROTOCOL=http
BACKEND_HOST=localhost
```

Para ambiente QA, cria um `.env.qa` com os valores correspondentes. O ecosystem carrega automaticamente o ficheiro certo conforme o `--env` passado ao PM2.

### `packages/database/.env`

```env
DATABASE_URL="postgresql://appuser:PASSWORD@localhost:5432/appdb?schema=public"
```

> O `prisma.config.ts` usa `dotenv/config`, que carrega o `.env` do próprio package. Necessário para que `prisma migrate deploy` encontre a `DATABASE_URL`.

---

## 7. Instalar dependências e fazer build

```bash
cd /var/www/app

# Instalar todas as dependências do monorepo
pnpm install --frozen-lockfile

# Gerar o cliente Prisma e fazer build de todos os pacotes e apps
pnpm build
```

O comando `pnpm build` executa `turbo run build`, que:
1. Gera o cliente Prisma (`db:generate`)
2. Compila os packages (`@repo/database`, `@repo/shared`, etc.)
3. Compila todas as apps NestJS (`nest build` → `dist/`) e o Next.js (`next build` → `.next/standalone/`)

Após o build, copiar os ficheiros estáticos do Next.js para o directório standalone (necessário para `output: standalone`):

```bash
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public apps/web/.next/standalone/apps/web/public
```

---

## 8. Correr migrações da base de dados

```bash
cd /var/www/app

# Aplicar migrações pendentes (seguro em produção — não apaga dados)
pnpm --filter @repo/database db:migrate:deploy
```

---

## 9. Configurar o PM2

O ficheiro `ecosystem.config.js` já existe no repositório. Lê automaticamente os ficheiros `.env.production` (ou `.env.qa`) de cada app via a função `loadEnv`.

Criar o directório de logs:

```bash
mkdir -p /var/www/app/logs
```

### Modos de execução por tipo de serviço

| App           | Modo    | Instâncias | Motivo |
|---------------|---------|------------|--------|
| auth          | cluster | 2          | HTTP stateless — escala horizontal |
| api           | cluster | 2          | HTTP stateless — escala horizontal |
| web           | cluster | 2          | Next.js standalone stateless |
| worker        | cluster | 2          | Bull usa competing consumers via Redis |
| notifications | fork    | 1          | Redis pub/sub: múltiplas instâncias processariam cada evento N vezes |

> O número de instâncias pode ser sobrescrito via variável de ambiente `NODE_APP_INSTANCES` na VPS.

---

## 10. Arrancar os serviços

```bash
cd /var/www/app

# Arrancar todos os processos com o env de produção
pm2 start ecosystem.config.js --env production

# Verificar estado
pm2 status

# Ver logs em tempo real
pm2 logs

# Ver logs de uma app específica
pm2 logs api
```

### Persistir os processos após reboot

```bash
# Guardar a lista de processos actual
pm2 save

# Gerar script de startup automático (segue as instruções que o comando imprime)
pm2 startup
# Copia e executa o comando que aparece no output (ex: sudo env PATH=... pm2 startup ...)
```

---

## 11. Configurar Nginx (reverse proxy)

Instalar Nginx:

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

Criar configuração em `/etc/nginx/sites-available/app`:

```nginx
server {
    listen 80;
    server_name teu-dominio.com;

    # Redirecionar HTTP para HTTPS (depois de configurar SSL)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name teu-dominio.com;

    # SSL — preencher após obter certificado (ex: Certbot)
    ssl_certificate /etc/letsencrypt/live/teu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/teu-dominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Auth service — mais específico, tem de vir antes de /api/
    location /api/auth/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API service
    location /api/ {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Next.js — frontend e _next/static
    location / {
        proxy_pass http://localhost:3400;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar o site e testar:

```bash
sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Certificado SSL com Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d teu-dominio.com
```

---

## 12. Deploy de actualizações

Script para cada novo deploy:

```bash
cd /var/www/app

# 1. Buscar alterações
git pull origin main

# 2. Instalar novas dependências (se houver)
pnpm install --frozen-lockfile

# 3. Fazer build
pnpm build

# 4. Correr migrações (seguro se não houver alterações)
pnpm --filter @repo/database db:migrate:deploy

# 5. Copiar ficheiros estáticos do Next.js
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public apps/web/.next/standalone/apps/web/public

# 6. Reiniciar os processos sem downtime
pm2 reload ecosystem.config.js --env production

# 7. Guardar estado do PM2
pm2 save
```

> **`pm2 reload`** faz rolling restart (zero-downtime para as apps em cluster). Usa `pm2 restart` se precisares de um restart completo.

---

## Comandos úteis de operação

```bash
# Estado de todos os processos
pm2 status

# Logs de uma app
pm2 logs api --lines 100

# Reiniciar uma app específica
pm2 restart api

# Parar uma app
pm2 stop worker

# Monitorização em tempo real
pm2 monit

# Verificar saúde dos serviços de infra
systemctl status postgresql
systemctl status redis-server
systemctl status mongod
redis-cli ping
```
