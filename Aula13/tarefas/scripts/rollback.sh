#!/usr/bin/env bash
# Volta para a versão anterior: o MESMO `tofu apply`, com a tag antiga.
# As imagens antigas continuam dentro do cluster, então leva segundos.
#
#   scripts/rollback.sh          # para .deploy/previous
#   scripts/rollback.sh v1       # para uma tag específica
#
# Por que não `kubectl rollout undo`? Funciona, mas o código (infra/) continua
# dizendo "versão nova": o próximo `apply` desfaria o rollback. Mudança feita
# por fora do Terraform é DRIFT.
source "$(dirname "$0")/_comum.sh"
load_env
TARGET="${1:-$(cat .deploy/previous 2>/dev/null || true)}"
[ -n "$TARGET" ] || die "não há versão anterior registrada"
CURRENT="$(cat .deploy/current 2>/dev/null || true)"

step "rollback: ${CURRENT:-?} → $TARGET"
tf_init
tf apply -input=false -auto-approve -var "image_tag=$TARGET"
printf '# gerado por scripts/rollback.sh — versão no ar\nimage_tag = "%s"\n' "$TARGET" > infra/versao.auto.tfvars
mkdir -p .deploy
[ -n "$CURRENT" ] && [ "$CURRENT" != "$TARGET" ] && echo "$CURRENT" > .deploy/previous
echo "$TARGET" > .deploy/current
echo "✔ no ar: $TARGET"
