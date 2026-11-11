#!/usr/bin/env bash
# Volta a aplicação para uma versão anterior (as imagens antigas continuam
# no Docker, identificadas pela tag; por isso o rollback leva segundos e não
# precisa recompilar nada).
#
#   scripts/rollback.sh            # volta para a versão registrada em .deploy/previous
#   scripts/rollback.sh abc1234    # volta para uma tag específica
#
# ATENÇÃO: o rollback desfaz o CÓDIGO, não as migrations. Por isso as
# migrations precisam ser compatíveis com a versão anterior (padrão
# expand/contract). Se uma migration destrutiva foi aplicada, o caminho é
# restaurar o backup (scripts/restore.sh).
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-$(cat .deploy/previous 2>/dev/null || true)}"
[ -n "$TARGET" ] || { echo "informe a tag (não há .deploy/previous)"; exit 1; }
docker image inspect "tarefas-api:$TARGET" >/dev/null 2>&1 || { echo "imagem tarefas-api:$TARGET não existe neste servidor"; exit 1; }

echo "▶ rollback para $TARGET"
# --no-build: usa as imagens que já existem; não recompila nada.
TAG="$TARGET" docker compose up -d --no-build --wait --remove-orphans
TAG="$TARGET" EXPECTED_VERSION="$TARGET" docker compose --profile smoke run --rm smoke
echo "$TARGET" > .deploy/current
echo "✔ rodando $TARGET"
