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

step "Filesystem scan"
trivy fs . --exit-code "$TRIVY_ECODE" --format table --skip-files "*.pem" --skip-files "*.key" --skip-files "*.crt" || true

# Build args for Next.js
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-"https://truloadapitest.masterspace.co.ke"}
NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL:-"wss://truloadapitest.masterspace.co.ke/ws"}

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

# Update centralized devops values if app manifest exists
step "Updating devops-k8s values (if present)"
TOKEN="${GH_PAT:-${GITHUB_SECRET:-${GITHUB_TOKEN:-}}}"
CLONE_URL="https://github.com/${DEVOPS_REPO}.git"; [[ -n "$TOKEN" ]] && CLONE_URL="https://x-access-token:${TOKEN}@github.com/${DEVOPS_REPO}.git"
if [[ ! -d "$DEVOPS_DIR" ]]; then git clone "$CLONE_URL" "$DEVOPS_DIR" || { warn "Cannot clone devops repo"; DEVOPS_DIR=""; }; fi
if [[ -n "$DEVOPS_DIR" && -d "$DEVOPS_DIR" ]]; then
  pushd "$DEVOPS_DIR" >/dev/null || true
  git config user.name "$GIT_USER"; git config user.email "$GIT_EMAIL" || true
  git fetch origin main || true; git checkout main || git checkout -b main || true
  if [[ -f "$VALUES_FILE_PATH" ]]; then
    IMAGE_REPO_ENV="$IMAGE_REPO" IMAGE_TAG_ENV="$GIT_COMMIT_ID" \
      yq e -i '.image.repository = env(IMAGE_REPO_ENV) | .image.tag = env(IMAGE_TAG_ENV)' "$VALUES_FILE_PATH"
    git add "$VALUES_FILE_PATH" && git commit -m "${APP_NAME}:${GIT_COMMIT_ID} released" || true
    if [[ -n "$TOKEN" ]]; then git push origin HEAD:main || warn "devops-k8s push failed"; else warn "No GH token; skipped push"; fi
    ok "Updated ${VALUES_FILE_PATH}"
  else
    warn "${VALUES_FILE_PATH} not found; create app manifests in devops-k8s/apps/${APP_NAME}"
  fi
  popd >/dev/null || true
fi

step "Summary"
echo "Service: ${APP_NAME}"
echo "Image  : ${IMAGE_REPO}:${GIT_COMMIT_ID}"
echo "EnvSec : ${ENV_SECRET_NAME} (ns=${NAMESPACE})"

exit 0


