#!/usr/bin/env bash
# Restaura um backup, SUBSTITUINDO o banco atual.
#
#   scripts/restore.sh backups/tarefas-20261111-030000.dump
#   scripts/restore.sh --verify backups/tarefas-....dump   # só testa, num banco temporário
#
# Um backup que nunca foi restaurado é uma esperança, não um backup. Rode
# --verify periodicamente.
set -euo pipefail
cd "$(dirname "$0")/.."
# Mantém a versão que está no ar (senão o compose subiria a tag `local`).
export TAG="${TAG:-$(cat .deploy/current 2>/dev/null || echo local)}"

VERIFY=0
if [ "${1:-}" = "--verify" ]; then VERIFY=1; shift; fi
FILE="${1:?uso: scripts/restore.sh [--verify] arquivo.dump}"
[ -s "$FILE" ] || { echo "arquivo não encontrado: $FILE"; exit 1; }

psql_admin() { docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "$0"' "$1"; }

if [ "$VERIFY" = 1 ]; then
  TMP="verify_$(date +%s)"
  echo "▶ restaurando em um banco temporário ($TMP), sem tocar no real"
  psql_admin "CREATE DATABASE $TMP"
  docker compose exec -T db sh -c "pg_restore -U \"\$POSTGRES_USER\" -d $TMP --no-owner" < "$FILE"
  COUNT=$(docker compose exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d $TMP -tA -c 'SELECT count(*) FROM tasks'")
  MIGS=$(docker compose exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d $TMP -tA -c 'SELECT count(*) FROM schema_migrations'")
  psql_admin "DROP DATABASE $TMP"
  echo "✔ backup restaurável: $COUNT tarefa(s), $MIGS migration(s) registradas"
  exit 0
fi

echo "ATENÇÃO: isto APAGA o banco atual e o substitui por $FILE."
if [ "${YES:-}" != "1" ]; then
  read -r -p "Digite 'restaurar' para continuar: " ANSWER
  [ "$ANSWER" = "restaurar" ] || { echo "cancelado"; exit 1; }
fi

DB="$(docker compose exec -T db sh -c 'printf %s "$POSTGRES_DB"')"
echo "▶ parando api e web (evita escritas durante a restauração)"
docker compose stop web api
echo "▶ recriando o banco $DB"
psql_admin "DROP DATABASE IF EXISTS $DB WITH (FORCE)"
psql_admin "CREATE DATABASE $DB"
echo "▶ restaurando"
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' < "$FILE"
echo "▶ subindo api e web"
docker compose up -d --no-build --wait
echo "✔ restaurado de $FILE"
