# Prometheus + Grafana — Deploy (opcional)

Todas as apps NestJS (`auth`, `api`, `notifications`, `worker`, `cron`) expõem métricas
Prometheus em `/api/metrics` (ver `packages/shared/src/metrics/`) — usam o mesmo prefixo
`/api`; a distinção entre apps é feita pela porta, não pelo path. Prometheus e Grafana
correm em Docker mesmo em produção — não precisam de instalação nativa — enquanto as
apps continuam a correr no host via PM2.

---

## 1. Arrancar apenas os serviços de monitorização

O `docker-compose.yaml` do repositório já define `prometheus` e `grafana`. Numa VPS onde
as apps correm via PM2 (não em Docker), sobe só estes dois serviços:

```bash
cd /var/www/<app>
docker compose up -d prometheus grafana
```

---

## 2. Scrape config — alcançar as apps do host

`docker/prometheus/prometheus.yml` usa `host.docker.internal` para o contentor Prometheus
alcançar as apps que correm no host via PM2. Em Linux, o Docker não resolve
`host.docker.internal` por omissão — adiciona ao serviço `prometheus` no `docker-compose.yaml`:

```yaml
prometheus:
  extra_hosts:
    - 'host.docker.internal:host-gateway'
```

Se `METRICS_TOKEN` estiver definido no `.env.production` (recomendado em produção —
ver [../.env.example](../.env.example)), protege o scrape com o mesmo token:

```yaml
scrape_configs:
  - job_name: api
    metrics_path: /api/metrics
    authorization:
      credentials: '<METRICS_TOKEN>'
    static_configs:
      - targets: ['host.docker.internal:3100']
        labels:
          app: api
```

Repetir `authorization.credentials` para os jobs `auth`, `notifications`, `worker` e `cron`.

---

## 3. Aceder ao Grafana com segurança

Grafana corre em `3333:3000` (ver `docker-compose.yaml`) — **não abrir esta porta ao
exterior**. Duas opções:

- **Túnel SSH** (mais simples): `ssh -L 3333:localhost:3333 user@<vps>` e abrir
  `http://localhost:3333` na tua máquina.
- **Path no Nginx**, protegido por autenticação básica adicional:

  ```nginx
  location /grafana/ {
      auth_basic "Restrito";
      auth_basic_user_file /etc/nginx/.htpasswd;
      proxy_pass http://127.0.0.1:3333/;
  }
  ```

Em qualquer dos casos, mudar a password de admin por omissão
(`GF_SECURITY_ADMIN_PASSWORD=admin` no `docker-compose.yaml`) antes de expor o serviço.

---

## 4. Verificar

```bash
curl -s http://localhost:9090/-/healthy
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health}'
```

Todos os `job` (`auth`, `api`, `notifications`, `worker`, `cron`) devem aparecer com
`"health": "up"`. O datasource do Grafana já vem provisionado
(`docker/grafana/provisioning/datasources/prometheus.yaml`) a apontar para
`http://prometheus:9090`.
