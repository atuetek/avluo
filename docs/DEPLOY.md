# Avluo Production Deploy (GitLab → Hetzner K3s)

Analog zu **sm-display**: Images in GitLab Registry, manuelles Helm-Deploy auf Kubernetes (Traefik + cert-manager).

## Architektur

| Komponente | Host | Image |
|---|---|---|
| PWA (nginx) | `https://app.avluo.app` | `$CI_REGISTRY_IMAGE/pwa` |
| API (Nest) | `https://api.avluo.app` | `$CI_REGISTRY_IMAGE/api` |
| Postgres | ClusterIP `postgres:5432` | `postgres:16-alpine` (Manifest) |
| Redis | ClusterIP `redis:6379` | Helm chart |
| Media | Hetzner Object Storage (S3) | — |

Namespace: `avluo-prod`

## Ressourcen (Soft-Launch)

| Workload | Requests | Limits | Image-Hinweis |
|---|---|---|---|
| API | 50m / 160Mi | 300m / 320Mi | `pnpm deploy`, `NODE_OPTIONS=--max-old-space-size=192` |
| PWA | 10m / 16Mi | 50m / 48Mi | `nginx-unprivileged`, 1 worker |
| Redis | 15m / 24Mi | 100m / 64Mi | `maxmemory 48mb`, `allkeys-lru` |
| Postgres | 50m / 128Mi | 250m / 256Mi | `shared_buffers=64MB`, PVC 5Gi |

## Einmalig auf dem Cluster

```bash
export KUBECONFIG=...
export GITLAB_REGISTRY_USER=...
export GITLAB_REGISTRY_TOKEN=...   # Deploy Token read_registry

# Passwort in infra/k8s/postgres-prod.yaml anpassen!
bash infra/scripts/setup-prod-once.sh
```

DNS: `app.avluo.app` + `api.avluo.app` → Traefik LoadBalancer EXTERNAL-IP.  
ClusterIssuer `letsencrypt-prod` und IngressClass `traefik` müssen existieren (wie sm-display).

## GitLab CI Variables

| Variable | Bedeutung |
|---|---|
| `KUBECONFIG_PROD` | base64 kubeconfig (Protected + Masked) |
| `KUBERNETES_CONTEXT_PROD` | optional, default `default` |
| `GITLAB_REGISTRY_USER` / `GITLAB_REGISTRY_TOKEN` | Pull-Secret für Nodes |
| `AVLUO_DATABASE_URL` | `postgresql://avluo:…@postgres:5432/avluo` |
| `AVLUO_JWT_SECRET` | mind. 32 Zeichen |
| `AVLUO_S3_ENDPOINT` | z.B. `fsn1.your-objectstorage.com` |
| `AVLUO_S3_ACCESS_KEY` / `AVLUO_S3_SECRET_KEY` | Object Storage |
| `AVLUO_MEDIA_PUBLIC_BASE_URL` | öffentliche Base-URL der Buckets |

## Pipeline (nur prod)

1. Push auf `main` / `master`
2. `test:unit` läuft automatisch
3. `docker:api` + `docker:pwa` bauen & pushen Images
4. Manuell: `deploy:prod:redis` → `deploy:prod:api` → `deploy:prod:pwa`

API-InitContainer führt `prisma migrate deploy` aus.

## Nach dem ersten Deploy

```bash
# Seed Pilot Yeşiltepe
kubectl -n avluo-prod exec deploy/api -- sh -c 'cd /app/apps/api && node -e "require(\"./dist/../prisma/seed.js\")"' 2>/dev/null \
  || kubectl -n avluo-prod exec deploy/api -- sh -c 'cd /app/apps/api && npx --yes ts-node --transpile-only prisma/seed.ts'

# Smoke
API_URL=https://api.avluo.app bash scripts/smoke-mvp.sh
```

## Lokaler Soft-Launch

```bash
bash scripts/setup-soft-launch.sh
pnpm --filter @avluo/api dev   # Terminal 1
pnpm --filter @avluo/pwa dev   # Terminal 2
bash scripts/smoke-mvp.sh
```

Siehe auch [MVP-LAUNCH.md](./MVP-LAUNCH.md), [NATIVE.md](./NATIVE.md), [MONITORING.md](./MONITORING.md).
