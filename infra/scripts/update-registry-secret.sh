#!/usr/bin/env bash
# Create/update GitLab registry pull secret in avluo-prod (analog sm-display).
# Requires: kubectl context, GITLAB_REGISTRY_USER, GITLAB_REGISTRY_TOKEN
set -euo pipefail

ENV="${1:-prod}"
NS="avluo-prod"
SECRET_NAME="avluo-registry-secret"
REGISTRY="${CI_REGISTRY:-registry.gitlab.com}"

if [[ -z "${GITLAB_REGISTRY_USER:-}" || -z "${GITLAB_REGISTRY_TOKEN:-}" ]]; then
  echo "WARN: GITLAB_REGISTRY_USER/TOKEN not set — skipping registry secret"
  exit 0
fi

kubectl create namespace "$NS" --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$NS" create secret docker-registry "$SECRET_NAME" \
  --docker-server="$REGISTRY" \
  --docker-username="$GITLAB_REGISTRY_USER" \
  --docker-password="$GITLAB_REGISTRY_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Registry secret $SECRET_NAME updated in $NS ($ENV)"

if [[ "${2:-}" == "--restart" || "${3:-}" == "--restart" ]]; then
  kubectl -n "$NS" rollout restart deployment/api deployment/pwa 2>/dev/null || true
fi
