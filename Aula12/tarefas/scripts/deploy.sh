#!/usr/bin/env bash
# Deploy em 5 passos, com validação e rollback automático.
#
#   scripts/deploy.sh            # tag = hash curto do commit atual
#   scripts/deploy.sh v1.2.0     # tag escolhida
#
# O critério NÃO é "o contêiner subiu", e sim "o fluxo principal funciona
# depois da publicação" (smoke test). Se falhar, volta para a versão anterior.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .deploy backups

NEW_TAG="${1:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
PREV_TAG="$(cat .deploy/current 2>/dev/null || true)"
step() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }

step "1/5 Build das imagens (tag: $NEW_TAG)"
# O Dockerfile roda os testes durante o build: teste falhou, nada é publicado.
TAG="$NEW_TAG" docker compose build

step "2/5 Backup do banco (antes de qualquer migration)"
if [ -n "$(docker compose ps -q db 2>/dev/null)" ]; then
  scripts/backup.sh
else
  echo "banco ainda não existe (primeiro deploy): nada para salvar"
fi

step "3/5 Publicando (migrations → API → web) e esperando ficarem saudáveis"
if ! TAG="$NEW_TAG" docker compose up -d --wait --remove-orphans; then
  echo "✖ algum serviço não ficou saudável"
  TAG="$NEW_TAG" docker compose logs --tail=30 migrate api web || true
  FAILED=1
fi

if [ -z "${FAILED:-}" ]; then
  step "4/5 Smoke test: o fluxo principal funciona?"
  if ! TAG="$NEW_TAG" EXPECTED_VERSION="$NEW_TAG" docker compose --profile smoke run --rm smoke; then
    FAILED=1
  fi
fi

if [ -n "${FAILED:-}" ]; then
  step "5/5 FALHOU → rollback"
  if [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$NEW_TAG" ]; then
    scripts/rollback.sh "$PREV_TAG"
    echo "✖ deploy de $NEW_TAG falhou; voltamos para $PREV_TAG"
  else
    echo "✖ deploy de $NEW_TAG falhou e não há versão anterior para voltar"
  fi
  exit 1
fi

step "5/5 Registrando a versão"
[ -n "$PREV_TAG" ] && echo "$PREV_TAG" > .deploy/previous
echo "$NEW_TAG" > .deploy/current
echo "✔ $NEW_TAG no ar (anterior: ${PREV_TAG:-nenhuma})"
