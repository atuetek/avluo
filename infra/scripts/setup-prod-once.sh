#!/usr/bin/env bash
# One-time prod bootstrap on Hetzner K3s (analog sm-display setup-prod-once).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NS=avluo-prod

echo "==> Namespace + Postgres"
kubectl apply -f "$ROOT/infra/k8s/postgres-prod.yaml"

echo "==> Wait for Postgres"
kubectl -n "$NS" rollout status deployment/postgres --timeout=180s

echo "==> Redis"
helm upgrade --install redis "$ROOT/infra/helm/redis" \
  --namespace "$NS" \
  -f "$ROOT/infra/helm/redis/values-prod.yaml" \
  --wait --timeout 3m

echo "==> Registry secret"
bash "$ROOT/infra/scripts/update-registry-secret.sh" prod --non-interactive

echo ""
echo "Next:"
echo "  1. Edit postgres password Secret + DATABASE_URL"
echo "  2. Set GitLab CI vars: KUBECONFIG_PROD, AVLUO_DATABASE_URL, AVLUO_JWT_SECRET, …"
echo "  3. Point DNS app.avluo.app / api.avluo.app → Traefik LB"
echo "  4. Run GitLab jobs docker:api/pwa then deploy:prod:api / deploy:prod:pwa"
echo "  5. Seed: kubectl -n $NS exec deploy/api -- npx prisma db seed  (or Job)"
