#!/usr/bin/env bash
# Deploy no Kubernetes em 5 passos, com smoke test e rollback automático.
# Mesmo roteiro da Aula 12; muda só ONDE roda.
#
#   scripts/deploy.sh v1          # tag escolhida
#   scripts/deploy.sh             # tag = hash curto do commit
source "$(dirname "$0")/_comum.sh"
need docker k3d kubectl "$TF"
load_env
mkdir -p .deploy

NEW_TAG="${1:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
PREV_TAG="$(cat .deploy/current 2>/dev/null || true)"

step "1/5 Build das imagens (tag: $NEW_TAG). Os testes rodam dentro do build."
docker build -q --target runtime --build-arg APP_VERSION="$NEW_TAG" -t "tarefas-api:$NEW_TAG" ./api
docker build -q --target runtime -t "tarefas-web:$NEW_TAG" ./web

step "2/5 Levando as imagens para dentro do cluster (sem registry)"
# Os nós do k3d têm o próprio containerd: não enxergam as imagens do seu Docker.
# Em produção, aqui seria um `docker push` para um registry.
k3d image import "tarefas-api:$NEW_TAG" "tarefas-web:$NEW_TAG" -c "$CLUSTER"

step "3/5 tofu apply: migrations (Job) → API → web, esperando ficar prontos"
tf_init
if ! tf apply -input=false -auto-approve -var "image_tag=$NEW_TAG"; then
  FAILED=1
fi

if [ -z "${FAILED:-}" ]; then
  step "4/5 Smoke test: o fluxo principal funciona?"
  if ! docker run --rm --network "$K3D_NET" -v "$PWD/e2e:/e2e:ro" -w /e2e \
      -e BASE_URL="$LB_URL" -e EXPECTED_VERSION="$NEW_TAG" \
      node:24-alpine node --test smoke.test.mjs; then
    FAILED=1
  fi
fi

if [ -n "${FAILED:-}" ]; then
  step "5/5 FALHOU → rollback"
  kubectl -n "$NS" get pods || true
  if [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$NEW_TAG" ]; then
    scripts/rollback.sh "$PREV_TAG"
    die "deploy de $NEW_TAG falhou; voltamos para $PREV_TAG"
  fi
  die "deploy de $NEW_TAG falhou e não há versão anterior para voltar"
fi

step "5/5 Registrando a versão"
# versao.auto.tfvars: um `scripts/tf.sh plan` sem argumentos já sabe a versão no ar.
printf '# gerado por scripts/deploy.sh — versão no ar\nimage_tag = "%s"\n' "$NEW_TAG" > infra/versao.auto.tfvars
[ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$NEW_TAG" ] && echo "$PREV_TAG" > .deploy/previous
echo "$NEW_TAG" > .deploy/current
tf output autoscaling
echo "✔ $NEW_TAG no ar em http://localhost:8013 (anterior: ${PREV_TAG:-nenhuma})"
