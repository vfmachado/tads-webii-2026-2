#!/usr/bin/env bash
# Backup lógico do PostgreSQL (pg_dump, formato custom, comprimido).
#
#   scripts/backup.sh            # cria backups/tarefas-AAAAMMDD-HHMMSS.dump
#   KEEP=14 scripts/backup.sh    # mantém os 14 mais recentes (padrão: 7)
#
# Agende com cron no servidor, por exemplo todo dia às 3h:
#   0 3 * * *  cd /opt/tarefas && scripts/backup.sh >> backups/backup.log 2>&1
# E COPIE os arquivos para FORA da máquina (outro disco, bucket S3...): um
# backup no mesmo servidor não protege contra a perda do servidor.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups

FILE="backups/tarefas-$(date +%Y%m%d-%H%M%S).dump"

# As variáveis $POSTGRES_* são resolvidas DENTRO do contêiner (aspas simples).
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$FILE"

# Backup vazio ou corrompido é pior que nenhum: valida o arquivo gerado.
[ -s "$FILE" ] || { rm -f "$FILE"; echo "✖ backup vazio"; exit 1; }
docker compose exec -T db pg_restore --list < "$FILE" > /dev/null || { echo "✖ backup inválido: $FILE"; exit 1; }
echo "✔ $FILE ($(wc -c < "$FILE") bytes)"

# Rotação: apaga os mais antigos.
KEEP="${KEEP:-7}"
ls -1t backups/tarefas-*.dump | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -f "$old" && echo "  removido (rotação): $old"
done
