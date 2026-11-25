#!/usr/bin/env bash
# Faz N requisições e conta QUAL pod da API respondeu cada uma (X-Instance).
#   scripts/quem-responde.sh        # 30 requisições
#   scripts/quem-responde.sh 100
source "$(dirname "$0")/_comum.sh"
need curl
N="${1:-30}"
step "$N requisições a http://localhost:8013/api/version"
for _ in $(seq 1 "$N"); do
  curl -s -D - -o /dev/null http://localhost:8013/api/version | tr -d '\r' | awk -F': ' 'tolower($1)=="x-instance"{print $2}'
done | sort | uniq -c | sort -rn
