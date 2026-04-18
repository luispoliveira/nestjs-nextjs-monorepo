# Guia de Deploy em Produção

Este guia cobre o deploy completo da plataforma num servidor Linux usando Docker Compose.

---

## Visão Geral da Arquitetura

```
[Internet]
    │
[Reverse Proxy — Traefik / Nginx]
    │
    ├── /               → web       (Next.js, porta 8080)
    ├── /api/auth/*     → auth      (NestJS, porta 3000)
    ├── /api/trpc/*     → api       (NestJS, porta 3300)
    ├── /api/...        → api       (NestJS, porta 3300)
    └── /api/notifications/* → notifications (NestJS, porta 3100)
                                   worker (NestJS, porta 3200 — interno)
[Infraestrutura interna]
    ├── PostgreSQL  (porta 5432)
    ├── Redis       (porta 6379)
    └── MongoDB     (porta 27017)
```

Os serviços comunicam entre si via Redis transport (microservices NestJS) e Bull queues.

---

## Pré-requisitos

- Docker Engine ≥ 24 + Docker Compose V2
- Node.js 22 (apenas para correr migrações localmente, se necessário)
- `pnpm` instalado globalmente (`npm install -g pnpm`)
- Domínio configurado com DNS apontado para o servidor
- Portas 80 e 443 abertas (se usar Traefik/Nginx com TLS)

---

## 1. Clonar o Repositório

```bash
git clone <repo-url> /opt/tx-home
cd /opt/tx-home
```

---

## 2. Configurar Variáveis de Ambiente de Infraestrutura

### `docker/postgres.env`

```bash
cp docker/postgres.env.example docker/postgres.env
```

Editar `docker/postgres.env`:

| Variável            | Valor de Produção      | Notas                           |
| ------------------- | ---------------------- | ------------------------------- |
| `POSTGRES_DB`       | `tx_home`              | Nome da base de dados           |
| `POSTGRES_USER`     | `tx_home`              | Utilizador do PostgreSQL        |
| `POSTGRES_PASSWORD` | **gerar — ver abaixo** | Mínimo 32 caracteres, aleatório |

### `docker/mongo.env`

```bash
cp docker/mongo.env.example docker/mongo.env
```

Editar `docker/mongo.env`:

| Variável                     | Valor de Produção      | Notas                           |
| ---------------------------- | ---------------------- | ------------------------------- |
| `MONGO_INITDB_ROOT_USERNAME` | `tx_home`              | Utilizador root do MongoDB      |
| `MONGO_INITDB_ROOT_PASSWORD` | **gerar — ver abaixo** | Mínimo 32 caracteres, aleatório |
| `MONGO_INITDB_DATABASE`      | `tx_home`              | Base de dados inicial           |

### Gerar passwords seguras

```bash
# Gerar uma password aleatória (32 chars)
openssl rand -base64 32

# Gerar a BETTER_AUTH_SECRET (base64, 32+ bytes)
openssl rand -base64 32

# Gerar a ENCRYPTION_KEY (base64, exatamente 32 bytes → 44 chars em base64)
openssl rand -base64 32
```

> **Atenção**: `BETTER_AUTH_SECRET` e `ENCRYPTION_KEY` têm de ser **iguais** em todos os serviços NestJS que os usam. Use o mesmo valor gerado em todos.

---

## 3. Configurar Variáveis de Ambiente dos Serviços

Criar um ficheiro `.env.production` para cada app. Em produção, o Docker deve injetar estas variáveis via `env_file` ou via secrets do orquestrador (Kubernetes, Swarm, etc.).

---

### `apps/auth/.env` (porta 3000)

| Variável               | Valor de Produção                                                     | Obrigatório | Notas                                                                |
| ---------------------- | --------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| `NODE_ENV`             | `production`                                                          | ✅          |                                                                      |
| `PORT`                 | `3000`                                                                | ✅          |                                                                      |
| `DATABASE_URL`         | `postgres://tx_home:<PG_PASS>@postgres:5432/tx_home?schema=public`    | ✅          | Host `postgres` = nome do serviço Docker                             |
| `REDIS_HOST`           | `redis`                                                               | ✅          | Nome do serviço Docker                                               |
| `REDIS_PORT`           | `6379`                                                                | ✅          |                                                                      |
| `REDIS_PASSWORD`       | `<REDIS_PASS>`                                                        | ⚠️ opcional | Definir se Redis tiver auth ativada                                  |
| `MONGO_URI`            | `mongodb://tx_home:<MONGO_PASS>@mongo:27017/tx_home?authSource=admin` | ✅          | Host `mongo` = nome do serviço Docker                                |
| `BETTER_AUTH_SECRET`   | `<gerar com openssl rand -base64 32>`                                 | ✅          | **Mínimo 32 caracteres. Igual em todos os serviços.**                |
| `BETTER_AUTH_URL`      | `https://<dominio>/api/auth`                                          | ✅          | URL pública completa do endpoint de auth                             |
| `UI_URL`               | `https://<dominio>`                                                   | ✅          | URL do frontend — usado para links de email (reset password, verify) |
| `ADMIN_EMAIL`          | `admin@<empresa>.com`                                                 | ✅          | Email do utilizador administrador inicial (criado no seed)           |
| `ADMIN_PASSWORD`       | **password segura**                                                   | ✅          | Password do admin — mín. 12 chars, maiúsculas, números, símbolos     |
| `CORS_ORIGIN`          | `https://<dominio>`                                                   | ✅          | Sem `*` em produção. Separar múltiplos com vírgula.                  |
| `ENCRYPTION_KEY`       | `<gerar com openssl rand -base64 32>`                                 | ✅          | **Igual em todos os serviços. Mínimo 32 caracteres.**                |
| `GOOGLE_CLIENT_ID`     | `<id do Google Cloud>`                                                | ⚠️ opcional | Apenas se usar login com Google                                      |
| `GOOGLE_CLIENT_SECRET` | `<secret do Google Cloud>`                                            | ⚠️ opcional | Apenas se usar login com Google                                      |

---

### `apps/api/.env` (porta 3300)

| Variável             | Valor de Produção                                                     | Obrigatório | Notas                                                                                                           |
| -------------------- | --------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | `production`                                                          | ✅          |                                                                                                                 |
| `PORT`               | `3300`                                                                | ✅          |                                                                                                                 |
| `DATABASE_URL`       | `postgres://tx_home:<PG_PASS>@postgres:5432/tx_home?schema=public`    | ✅          |                                                                                                                 |
| `REDIS_HOST`         | `redis`                                                               | ✅          |                                                                                                                 |
| `REDIS_PORT`         | `6379`                                                                | ✅          |                                                                                                                 |
| `REDIS_PASSWORD`     | `<REDIS_PASS>`                                                        | ⚠️ opcional |                                                                                                                 |
| `MONGO_URI`          | `mongodb://tx_home:<MONGO_PASS>@mongo:27017/tx_home?authSource=admin` | ✅          |                                                                                                                 |
| `BETTER_AUTH_SECRET` | `<mesmo valor que apps/auth>`                                         | ✅          | **Tem de ser igual ao da app auth**                                                                             |
| `BETTER_AUTH_URL`    | `https://<dominio>/api/auth`                                          | ✅          |                                                                                                                 |
| `CORS_ORIGIN`        | `https://<dominio>`                                                   | ✅          |                                                                                                                 |
| `ENCRYPTION_KEY`     | `<mesmo valor que apps/auth>`                                         | ✅          | **Tem de ser igual em todos os serviços**                                                                       |
| `UPLISTING_URL`      | `https://connect.uplisting.io`                                        | ✅          | URL base da API Uplisting — não alterar                                                                         |
| `PUBLIC_API_URL`     | `https://<dominio>`                                                   | ✅          | URL pública da API — usada para construir URLs de webhooks. **A app falha ao iniciar se não estiver definida.** |

---

### `apps/notifications/.env` (porta 3100)

| Variável         | Valor de Produção                                                     | Obrigatório | Notas |
| ---------------- | --------------------------------------------------------------------- | ----------- | ----- |
| `NODE_ENV`       | `production`                                                          | ✅          |       |
| `PORT`           | `3100`                                                                | ✅          |       |
| `DATABASE_URL`   | `postgres://tx_home:<PG_PASS>@postgres:5432/tx_home?schema=public`    | ✅          |       |
| `REDIS_HOST`     | `redis`                                                               | ✅          |       |
| `REDIS_PORT`     | `6379`                                                                | ✅          |       |
| `REDIS_PASSWORD` | `<REDIS_PASS>`                                                        | ⚠️ opcional |       |
| `MONGO_URI`      | `mongodb://tx_home:<MONGO_PASS>@mongo:27017/tx_home?authSource=admin` | ✅          |       |
| `CORS_ORIGIN`    | `https://<dominio>`                                                   | ✅          |       |
| `ENCRYPTION_KEY` | `<mesmo valor que apps/auth>`                                         | ✅          |       |

---

### `apps/worker/.env` (porta 3200)

| Variável         | Valor de Produção                                                     | Obrigatório | Notas                                                     |
| ---------------- | --------------------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| `NODE_ENV`       | `production`                                                          | ✅          |                                                           |
| `PORT`           | `3200`                                                                | ✅          |                                                           |
| `DATABASE_URL`   | `postgres://tx_home:<PG_PASS>@postgres:5432/tx_home?schema=public`    | ✅          |                                                           |
| `REDIS_HOST`     | `redis`                                                               | ✅          |                                                           |
| `REDIS_PORT`     | `6379`                                                                | ✅          |                                                           |
| `REDIS_PASSWORD` | `<REDIS_PASS>`                                                        | ⚠️ opcional |                                                           |
| `MONGO_URI`      | `mongodb://tx_home:<MONGO_PASS>@mongo:27017/tx_home?authSource=admin` | ✅          |                                                           |
| `CORS_ORIGIN`    | `https://<dominio>`                                                   | ✅          |                                                           |
| `ENCRYPTION_KEY` | `<mesmo valor que apps/auth>`                                         | ✅          |                                                           |
| `UPLISTING_URL`  | `https://connect.uplisting.io`                                        | ✅          |                                                           |
| `BREVO_API_KEY`  | `<API key do Brevo>`                                                  | ✅          | Obter em app.brevo.com → API Keys                         |
| `FROM_EMAIL`     | `noreply@<dominio>`                                                   | ✅          | Endereço de email remetente                               |
| `FROM_NAME`      | `TX Home`                                                             | ✅          | Nome do remetente nos emails                              |
| `DEV_EMAIL`      | `<email da equipa>`                                                   | ⚠️ opcional | Em produção pode ficar em branco ou igual ao `FROM_EMAIL` |

---

### `apps/web/.env` (porta 8080)

| Variável                   | Valor de Produção           | Obrigatório | Notas                                                                                    |
| -------------------------- | --------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `AUTH_API_URL`             | `http://auth:3000`          | ✅          | URL **interna** (container-to-container) do serviço auth                                 |
| `API_URL`                  | `http://api:3300`           | ✅          | URL **interna** do serviço api — usada para rewrite de `/api/trpc/*`                     |
| `NEXT_PUBLIC_AUTH_API_URL` | `https://<dominio>`         | ✅          | URL **pública** do auth — exposta ao browser (prefixo `NEXT_PUBLIC_`)                    |
| `NEXT_PUBLIC_API_URL`      | `https://<dominio>`         | ⚠️ opcional | URL pública do API — usada para construir URLs de imagens no cliente                     |
| `NEXT_PUBLIC_STORAGE_URL`  | `https://storage.<dominio>` | ⚠️ opcional | Se usar CDN/storage externo para imagens; caso contrário o `NEXT_PUBLIC_API_URL` é usado |
| `BACKEND_PROTOCOL`         | `https`                     | ✅          |                                                                                          |
| `BACKEND_HOST`             | `<dominio>`                 | ✅          |                                                                                          |

> **Nota**: `AUTH_API_URL` e `API_URL` são usadas nos rewrites do `next.config.ts` — devem ser os hostnames internos Docker. `NEXT_PUBLIC_*` são expostas ao browser e devem ser URLs públicas HTTPS.

---

## 4. Variáveis Partilhadas entre Serviços

As seguintes variáveis **têm de ter o mesmo valor** em todos os serviços NestJS que as usam:

| Variável             | Serviços                                 | Razão                                             |
| -------------------- | ---------------------------------------- | ------------------------------------------------- |
| `BETTER_AUTH_SECRET` | `auth`, `api`                            | Validação de sessões — secret partilhado          |
| `ENCRYPTION_KEY`     | `auth`, `api`, `notifications`, `worker` | Encriptação/desencriptação de credenciais AES-256 |
| `DATABASE_URL`       | `auth`, `api`, `notifications`, `worker` | Todos acedem à mesma BD PostgreSQL                |
| `REDIS_HOST/PORT`    | `auth`, `api`, `notifications`, `worker` | Mesmo broker Redis para microservices e filas     |
| `MONGO_URI`          | `auth`, `api`, `notifications`, `worker` | Mesmo MongoDB para logs/audit                     |

---

## 5. Configurar o `docker-compose.yaml` para Produção

O ficheiro `docker-compose.yaml` existente tem os serviços das apps comentados (usados apenas em dev). Para produção, descomentar e ajustar conforme necessário.

Exemplo mínimo de configuração de produção para o serviço `auth`:

```yaml
auth:
  image: tx-home-auth:latest # ou build com target: production
  build:
    context: .
    dockerfile: ./apps/auth/Dockerfile
    target: production
  restart: unless-stopped
  ports:
    - '3000:3000'
  env_file:
    - ./apps/auth/.env
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    mongo:
      condition: service_healthy
  networks:
    - app
  healthcheck:
    test:
      [
        'CMD-SHELL',
        'wget -qO /dev/null http://localhost:3000/api/auth/ok || exit 1',
      ]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 30s
```

Repetir o padrão para `api` (porta 3300), `notifications` (porta 3100), `worker` (porta 3200) e `web` (porta 8080 → exposta conforme o reverse proxy).

> Para os volumes do PostgreSQL e MongoDB em produção, substituir os caminhos absolutos locais (`/Volumes/SSD-DEV/...`) por caminhos no servidor, por exemplo `/data/tx-home/postgres` e `/data/tx-home/mongo`.

---

## 6. Build e Deploy

### 6.1 Build das imagens

```bash
# Build de todas as apps em modo produção
docker compose build --no-cache
```

Ou por app individual:

```bash
docker compose build auth
docker compose build api
docker compose build notifications
docker compose build worker
docker compose build web
```

### 6.2 Iniciar infraestrutura

```bash
# Apenas PostgreSQL, Redis e MongoDB
docker compose up -d postgres redis mongo

# Aguardar healthchecks passarem
docker compose ps
```

### 6.3 Correr migrações da base de dados

As migrações têm de ser corridas **antes** de iniciar as apps, a partir da máquina com acesso à BD:

```bash
# Com DATABASE_URL apontado para a BD de produção
export DATABASE_URL="postgres://tx_home:<PG_PASS>@<host>:5432/tx_home?schema=public"

pnpm db:generate   # Gerar cliente Prisma
pnpm db:migrate    # Aplicar migrações
pnpm db:seed       # Criar utilizador admin (usa ADMIN_EMAIL e ADMIN_PASSWORD)
```

> **Atenção**: `pnpm db:seed` cria o utilizador administrador usando `ADMIN_EMAIL` e `ADMIN_PASSWORD` do ambiente. Garantir que estas variáveis estão definidas antes de correr o seed.

### 6.4 Iniciar os serviços

```bash
docker compose up -d auth api notifications worker web
```

### 6.5 Verificar saúde dos serviços

```bash
# Health checks
curl https://<dominio>/api/auth/health/ready
curl https://<dominio>/api/health/ready
curl https://<dominio>/api/notifications/health/ready

# Logs
docker compose logs -f auth
docker compose logs -f api
```

---

## 7. Reverse Proxy (Traefik / Nginx)

O `docker-compose.yaml` já tem configuração Traefik comentada como referência. Em alternativa, usar Nginx:

```nginx
server {
    listen 443 ssl;
    server_name <dominio>;

    # TLS (Let's Encrypt / certificado próprio)
    ssl_certificate     /etc/ssl/certs/<dominio>.crt;
    ssl_certificate_key /etc/ssl/private/<dominio>.key;

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth API
    location /api/auth/ {
        proxy_pass http://localhost:3000/api/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API (tRPC + REST)
    location /api/ {
        proxy_pass http://localhost:3300/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> O serviço `worker` (porta 3200) **não deve ser exposto publicamente** — comunica apenas via Redis internamente.
> O serviço `notifications` (porta 3100) também é tipicamente interno.

---

## 8. Segurança em Produção

- **Nunca expor** PostgreSQL (5432), Redis (6379) ou MongoDB (27017) à internet — ficam na rede interna Docker.
- **Redis com password**: Configurar `requirepass` no Redis e definir `REDIS_PASSWORD` em todos os serviços.
- **`CORS_ORIGIN`**: Nunca usar `*` em produção. Usar o domínio exato: `https://<dominio>`.
- **`BETTER_AUTH_SECRET`** e **`ENCRYPTION_KEY`**: Mínimo 32 caracteres, gerados com `openssl rand -base64 32`. Guardar num gestor de secrets (Vault, AWS Secrets Manager, etc.).
- **Swagger/OpenAPI**: Está desativado automaticamente quando `NODE_ENV=production`.
- **`ADMIN_PASSWORD`**: Usar uma password forte e alterar no primeiro login.
- **Google OAuth** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`): Configurar apenas se o login social estiver ativo. Obter em [Google Cloud Console](https://console.cloud.google.com/).

---

## 9. Checklist de Deploy

- [ ] `docker/postgres.env` criado com passwords seguras
- [ ] `docker/mongo.env` criado com passwords seguras
- [ ] `apps/auth/.env` criado e preenchido
- [ ] `apps/api/.env` criado e preenchido
- [ ] `apps/notifications/.env` criado e preenchido
- [ ] `apps/worker/.env` criado e preenchido
- [ ] `apps/web/.env` criado e preenchido
- [ ] `BETTER_AUTH_SECRET` igual em `auth` e `api`
- [ ] `ENCRYPTION_KEY` igual em `auth`, `api`, `notifications` e `worker`
- [ ] `DATABASE_URL` aponta para host Docker interno (`postgres`) em todos os serviços
- [ ] `REDIS_HOST` é `redis` (nome do serviço Docker) em todos os serviços
- [ ] `CORS_ORIGIN` sem `*`, apenas o domínio de produção
- [ ] `PUBLIC_API_URL` definida em `apps/api` com URL pública HTTPS
- [ ] `UI_URL` definida em `apps/auth` com URL pública HTTPS do frontend
- [ ] `BREVO_API_KEY` válida em `apps/worker`
- [ ] Infraestrutura iniciada e healthchecks a passar
- [ ] Migrações corridas (`pnpm db:migrate`)
- [ ] Seed executado (`pnpm db:seed`)
- [ ] Reverse proxy configurado com TLS
- [ ] Portas 5432, 6379, 27017 **não expostas** ao exterior
