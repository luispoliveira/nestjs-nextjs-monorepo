# PostgreSQL — Instalação e Configuração de Produção

---

## Instalação (Ubuntu 22.04)

```bash
# Repositório oficial PostgreSQL para versão 17
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc

sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'

sudo apt update && sudo apt install -y postgresql-17

sudo systemctl enable --now postgresql
```

---

## Criar utilizador e base de dados

```bash
sudo -u postgres psql <<'EOF'
CREATE USER appuser WITH PASSWORD '<PG_PASSWORD>';
CREATE DATABASE appdb OWNER appuser;
GRANT ALL PRIVILEGES ON DATABASE appdb TO appuser;
-- Permitir que appuser crie schemas (necessário para o Prisma)
ALTER USER appuser CREATEDB;
EOF
```

Verificar:

```bash
sudo -u postgres psql -c "\l" | grep appdb
```

---

## Configuração de produção (`postgresql.conf`)

Localização: `/etc/postgresql/17/main/postgresql.conf`

### Memória (ajustar ao RAM disponível)

```ini
# Para 4 GB de RAM:
shared_buffers = 1GB               # 25% do RAM
effective_cache_size = 3GB         # 75% do RAM
work_mem = 16MB                    # por operação de sort/hash (cuidado com conexões paralelas)
maintenance_work_mem = 256MB       # para VACUUM, CREATE INDEX

# Para 8 GB de RAM: shared_buffers=2GB, effective_cache_size=6GB, work_mem=32MB
```

### Write-Ahead Log

```ini
wal_level = replica                # mínimo para replicação futura
max_wal_size = 1GB
min_wal_size = 80MB
checkpoint_completion_target = 0.9
```

### Conexões

```ini
max_connections = 100              # ajustar ao número de workers PM2 × instâncias
```

> Com PM2 em cluster mode (2 instâncias × N apps HTTP), terás vários processos a fazer pool.
> O Prisma abre por defeito `max(num_cpus, 2)` conexões por processo.
> Fórmula: `max_connections ≥ (num_processos × conexões_por_processo) + 10`.

### Logging

```ini
log_min_duration_statement = 500   # log de queries lentas (ms)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_lock_waits = on
```

Aplicar mudanças:

```bash
sudo systemctl reload postgresql
```

---

## Segurança (`pg_hba.conf`)

Localização: `/etc/postgresql/17/main/pg_hba.conf`

Garantir que a app só liga em localhost (scram-sha-256):

```
# TYPE  DATABASE  USER     ADDRESS       METHOD
local   all       postgres               peer
host    appdb     appuser  127.0.0.1/32  scram-sha-256
host    appdb     appuser  ::1/128       scram-sha-256
```

Não expor o porto 5432 ao exterior:

```bash
sudo ufw deny 5432/tcp
```

---

## Backups

### Backup diário com pg_dump

```bash
# Criar script em /usr/local/bin/pg-backup.sh
cat > /usr/local/bin/pg-backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +%Y-%m-%d)
mkdir -p "$BACKUP_DIR"
PGPASSWORD="<PG_PASSWORD>" pg_dump -U appuser appdb \
  | gzip > "$BACKUP_DIR/appdb-$DATE.sql.gz"
# Manter apenas os últimos 30 dias
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/pg-backup.sh

# Cron diário às 02:00
echo "0 2 * * * /usr/local/bin/pg-backup.sh" | sudo crontab -
```

### Restaurar

```bash
gunzip -c /var/backups/postgres/appdb-YYYY-MM-DD.sql.gz \
  | PGPASSWORD="<PG_PASSWORD>" psql -U appuser appdb
```

---

## Comandos úteis

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
sudo -u postgres psql -c "SELECT pid, query_start, state, query FROM pg_stat_activity WHERE datname='appdb';"

# Tamanho da BD
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('appdb'));"

# Queries lentas (últimas 10)
sudo -u postgres psql appdb -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC LIMIT 10;"
```

> Para `pg_stat_statements`, adicionar `pg_stat_statements` em `shared_preload_libraries` no `postgresql.conf` e executar `CREATE EXTENSION pg_stat_statements;` na BD.
