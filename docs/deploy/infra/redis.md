# Redis — Instalação e Configuração de Produção

---

## Instalação (Ubuntu 22.04)

```bash
sudo apt install -y lsb-release gpg

curl -fsSL https://packages.redis.io/gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] \
  https://packages.redis.io/deb $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/redis.list

sudo apt update && sudo apt install -y redis
sudo systemctl enable --now redis-server

redis-cli ping   # PONG
```

---

## Configuração de produção

Ficheiro: `/etc/redis/redis.conf`

### Autenticação (obrigatório em produção)

```ini
requirepass <REDIS_PASSWORD>
```

### Bind — apenas localhost

```ini
bind 127.0.0.1 ::1
protected-mode yes
```

Não expor ao exterior:

```bash
sudo ufw deny 6379/tcp
```

### Memória

```ini
maxmemory 512mb                    # ajustar ao RAM disponível; reservar espaço para o OS
maxmemory-policy allkeys-lru       # expulsar chaves LRU quando maxmemory é atingido
```

> Este monorepo usa Redis como transport de microservices (NestJS Redis transport), cache e BullMQ.
> A política `allkeys-lru` é adequada — BullMQ tolera perda de jobs no pior caso (já tem retries e DLQ,
> ver `QUEUES.EMAIL_DLQ` em `packages/shared/src/constants/queues.ts`).
> Para zero-loss em produção crítica, considerar `noeviction` + alarme de memória.

### Persistência

```ini
# RDB snapshot (recomendado para BullMQ + microservices)
save 900 1
save 300 10
save 60 10000

# AOF — mais durável mas mais I/O
appendonly no
```

> Se a durabilidade dos jobs BullMQ for crítica, habilitar `appendonly yes` + `appendfsync everysec`.

### Desabilitar comandos perigosos

```ini
rename-command FLUSHALL ""
rename-command FLUSHDB  ""
rename-command DEBUG    ""
rename-command CONFIG   "CONFIG_<token-aleatorio>"
```

Aplicar mudanças:

```bash
sudo systemctl restart redis-server
redis-cli -a <REDIS_PASSWORD> ping
```

---

## Verificar configuração

```bash
redis-cli -a <REDIS_PASSWORD> CONFIG GET maxmemory
redis-cli -a <REDIS_PASSWORD> CONFIG GET requirepass
redis-cli -a <REDIS_PASSWORD> INFO server | grep redis_version
redis-cli -a <REDIS_PASSWORD> INFO memory | grep used_memory_human
```

---

## Monitorização

```bash
# Comandos em tempo real
redis-cli -a <REDIS_PASSWORD> MONITOR

# Stats
redis-cli -a <REDIS_PASSWORD> INFO stats

# Fila de email (BullMQ) — contagem de jobs
redis-cli -a <REDIS_PASSWORD> LLEN bull:email-queue:wait
redis-cli -a <REDIS_PASSWORD> LLEN bull:email-queue-dlq:wait
```

---

## Backup

Redis escreve RDB snapshots em `/var/lib/redis/dump.rdb`. Para backup:

```bash
# Forçar snapshot imediato
redis-cli -a <REDIS_PASSWORD> BGSAVE

# Copiar para backup
cp /var/lib/redis/dump.rdb /var/backups/redis/dump-$(date +%Y-%m-%d).rdb
```

---

## Comandos úteis

```bash
sudo systemctl status redis-server
sudo journalctl -u redis-server -n 50

# Memória usada
redis-cli -a <REDIS_PASSWORD> INFO memory | grep used_memory_human

# Número de clientes ligados
redis-cli -a <REDIS_PASSWORD> CLIENT LIST | wc -l
```
