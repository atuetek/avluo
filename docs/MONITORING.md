# Softmatix Monitoring (Avluo)

Avluo ist im zentralen [Softmatix Monitoring](https://status.135-181-47-218.sslip.io/) (Gatus) eingetragen.

Konfiguration liegt in **at-leads** (nicht im Avluo-Repo):

`at-leads/infra/monitoring/gatus.yaml`

## Checks

| Group | Name | Typ |
|---|---|---|
| `avluo / production` | PWA | `https://app.avluo.app/` |
| `avluo / production` | API | `https://api.avluo.app/health` |
| `avluo / production` | API Liveness | `…/health/live` |
| `avluo / production` | API Readiness | `…/health/ready` (`database == connected`) |
| `avluo / cluster intern` | Redis | `tcp://redis.avluo-prod…:6379` |
| `avluo / cluster intern` | PostgreSQL | `tcp://postgres.avluo-prod…:5432` |
| `avluo / cluster intern` | API / PWA | ClusterIP HTTP |
| `avluo` | workloads | Watchdog-Heartbeat (Deployments/Pods) |

Alerts gehen über denselben Telegram-Bot wie sm-display / at-leads.

## Ressourcen-Footprint (Soft-Launch)

| Workload | Requests | Limits |
|---|---|---|
| API | 50m / 160Mi | 300m / 320Mi |
| PWA (nginx) | 10m / 16Mi | 50m / 48Mi |
| Redis | 15m / 24Mi | 100m / 64Mi (`maxmemory 48mb`) |
| Postgres | 50m / 128Mi | 250m / 256Mi (`shared_buffers 64MB`) |

Images: API via `pnpm deploy` (kein pnpm im Runtime), PWA via `nginxinc/nginx-unprivileged`.

## Deploy der Monitoring-Config

```bash
export KUBECONFIG=...
kubectl apply -f /Users/atuetek/Basefolder/at-leads/infra/monitoring/gatus.yaml
kubectl -n monitoring rollout restart deploy/gatus
```

Solange Avluo noch nicht deployed ist bzw. DNS fehlt, bleiben die Production-Checks rot — das ist erwartet. Cluster-interne Checks werden grün, sobald `avluo-prod` mit Postgres/Redis/API/PWA läuft.
