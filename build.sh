#!/usr/bin/env bash

# =============================================================================
# TruLoad Frontend (Next.js 15) - Production Build & Deploy Script
# =============================================================================
# - Trivy scan, Docker build with NEXT_PUBLIC_* build args
# - Push to registry
# - Apply K8s env secret (optional)
# - Update centralized devops-k8s Helm values (if app path exists)
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; PURPLE='\033[0;35m'; NC='\033[0m'
log() { echo -e "$1"; }
info() { log "${BLUE}[INFO]${NC} $1"; }
ok()   { log "${GREEN}[SUCCESS]${NC} $1"; }
warn() { log "${YELLOW}[WARNING]${NC} $1"; }
err()  { log "${RED}[ERROR]${NC} $1"; }
step() { log "${PURPLE}[STEP]${NC} $1"; }

APP_NAME=${APP_NAME:-"truload-frontend"}
NAMESPACE=${NAMESPACE:-"truload"}
ENV_SECRET_NAME=${ENV_SECRET_NAME:-"truload-frontend-env"}
DEPLOY=${DEPLOY:-true}

REGISTRY_SERVER=${REGISTRY_SERVER:-docker.io}
REGISTRY_NAMESPACE=${REGISTRY_NAMESPACE:-codevertex}
IMAGE_REPO="${REGISTRY_SERVER}/${REGISTRY_NAMESPACE}/${APP_NAME}"

DEVOPS_REPO=${DEVOPS_REPO:-"Bengo-Hub/devops-k8s"}
DEVOPS_DIR=${DEVOPS_DIR:-"$HOME/devops-k8s"}
VALUES_FILE_PATH=${VALUES_FILE_PATH:-"apps/${APP_NAME}/values.yaml"}

GIT_EMAIL=${GIT_EMAIL:-"dev@truload.io"}
GIT_USER=${GIT_USER:-"TruLoad Bot"}
TRIVY_ECODE=${TRIVY_ECODE:-0}

if [[ -z ${GITHUB_SHA:-} ]]; then GIT_COMMIT_ID=$(git rev-parse --short=8 HEAD || echo "localbuild"); else GIT_COMMIT_ID=${GITHUB_SHA::8}; fi
info "Service: ${APP_NAME}"
info "Image: ${IMAGE_REPO}:${GIT_COMMIT_ID}"

for c in git docker trivy; do command -v "$c" >/dev/null || { err "$c is required"; exit 1; }; done
if [[ "${DEPLOY}" == "true" ]]; then for c in kubectl helm yq jq; do command -v "$c" >/dev/null || { err "$c is required"; exit 1; }; done; fi

# =============================================================================
# Auto-sync secrets from devops-k8s
# =============================================================================
if [[ ${DEPLOY} == "true" ]]; then
  step "Checking and syncing required secrets from devops-k8s"
  SYNC_SCRIPT=$(mktemp)
  if curl -fsSL https://raw.githubusercontent.com/Bengo-Hub/devops-k8s/main/scripts/tools/check-and-sync-secrets.sh -o "$SYNC_SCRIPT" 2>/dev/null; then
    source "$SYNC_SCRIPT"
    check_and_sync_secrets "REGISTRY_USERNAME" "REGISTRY_PASSWORD" "GIT_TOKEN" || warn "Secret sync failed - continuing with existing secrets"
    rm -f "$SYNC_SCRIPT"
  else
    warn "Unable to download secret sync script - continuing with existing secrets"
  fi
fi

step "Filesystem scan"
trivy fs . --exit-code "$TRIVY_ECODE" --format table --skip-files "*.pem" --skip-files "*.key" --skip-files "*.crt" || true

# Build args for Next.js
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-"https://kuraweighapitest.masterspace.co.ke"}
NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL:-"wss://kuraweighapitest.masterspace.co.ke/ws"}

step "Docker build"
DOCKER_BUILDKIT=1 docker build . \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_WS_URL="$NEXT_PUBLIC_WS_URL" \
  -t "${IMAGE_REPO}:${GIT_COMMIT_ID}"
ok "Docker build complete"

if [[ "${DEPLOY}" != "true" ]]; then
  info "DEPLOY=false; skipping push/deploy"
  exit 0
fi

if [[ -n "${REGISTRY_USERNAME:-}" && -n "${REGISTRY_PASSWORD:-}" ]]; then
  echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY_SERVER" -u "$REGISTRY_USERNAME" --password-stdin
fi

step "Pushing image"
docker push "${IMAGE_REPO}:${GIT_COMMIT_ID}"
ok "Image pushed"

if [[ -n "${KUBE_CONFIG:-}" ]]; then
  mkdir -p ~/.kube
  echo "$KUBE_CONFIG" | base64 -d > ~/.kube/config
  chmod 600 ~/.kube/config
  export KUBECONFIG=~/.kube/config
fi

kubectl get ns "$NAMESPACE" >/dev/null 2>&1 || kubectl create ns "$NAMESPACE"

# CRITICAL: Do NOT apply KubeSecrets/devENV.yml in CI/CD
# It may contain outdated configuration. Skip in CI/CD, only apply locally.
if [[ -z "${CI:-}${GITHUB_ACTIONS:-}" && -f "KubeSecrets/devENV.yml" ]]; then
  info "Local deployment detected - applying KubeSecrets/devENV.yml"
  kubectl apply -n "$NAMESPACE" -f KubeSecrets/devENV.yml || warn "Failed to apply devENV.yml"
elif [[ -f "KubeSecrets/devENV.yml" ]]; then
  info "CI/CD deployment - skipping KubeSecrets/devENV.yml (managed by deployment workflow)"
fi

# Create minimal environment secret for frontend (even though no database needed)
# The Helm chart expects envFromSecret to exist
step "Creating/updating environment secret for frontend..."
kubectl -n "$NAMESPACE" create secret generic "$ENV_SECRET_NAME" \
  --from-literal=NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
  --from-literal=NEXT_PUBLIC_WS_URL="${NEXT_PUBLIC_WS_URL}" \
  --from-literal=NODE_ENV="production" \
  --from-literal=APP_NAME="${APP_NAME}" \
  --dry-run=client -o yaml | kubectl apply -f - || warn "Environment secret creation failed"
ok "Environment secret configured"

# Create registry pull secret if credentials provided
if [[ -n "${REGISTRY_USERNAME:-}" && -n "${REGISTRY_PASSWORD:-}" ]]; then
  kubectl -n "$NAMESPACE" create secret docker-registry registry-credentials \
    --docker-server="$REGISTRY_SERVER" \
    --docker-username="$REGISTRY_USERNAME" \
    --docker-password="$REGISTRY_PASSWORD" \
    --dry-run=client -o yaml | kubectl apply -f - || warn "Pull secret creation failed"
fi

# Update Helm values in devops-k8s repo
# Resolve token from available sources (priority: GH_PAT > GIT_SECRET > GIT_TOKEN)
TOKEN="${GH_PAT:-${GIT_SECRET:-${GIT_TOKEN:-}}}"

if [[ -n "${GH_PAT:-}" ]]; then
  info "Using GH_PAT for git operations"
elif [[ -n "${GIT_SECRET:-}" ]]; then
  info "Using GIT_SECRET for git operations"
elif [[ -n "${GIT_TOKEN:-}" ]]; then
  info "Using GIT_TOKEN for git operations"
elif [[ -n "${GIT_TOKEN:-}" ]]; then
  info "Using GIT_TOKEN for git operations"
else
  warn "No GitHub token found for devops-k8s update"
fi

# Update Helm values using centralized script
source "${HOME}/devops-k8s/scripts/helm/update-values.sh" 2>/dev/null || {
  warn "Centralized helm update script not available"
}
if declare -f update_helm_values >/dev/null 2>&1; then
  update_helm_values "$APP_NAME" "$GIT_COMMIT_ID" "$IMAGE_REPO"
else
  warn "update_helm_values function not available - helm values not updated"
fi

step "Summary"
echo "Service: ${APP_NAME}"
echo "Image  : ${IMAGE_REPO}:${GIT_COMMIT_ID}"
echo "EnvSec : ${ENV_SECRET_NAME} (ns=${NAMESPACE})"

exit 0


