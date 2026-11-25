#!/usr/bin/env bash
# Painel para deixar aberto durante a carga (o macOS não tem `watch`).
#   scripts/observar.sh        # atualiza a cada 2 s; Ctrl+C para sair
# Alternativas: `kubectl -n tarefas get hpa -w`, ou o k9s.
source "$(dirname "$0")/_comum.sh"
need kubectl
INTERVAL="${INTERVAL:-2}"
while true; do
  OUT="$(
    printf '\033[1m%s — namespace %s\033[0m\n\n' "$(date +%H:%M:%S)" "$NS"
    printf '\033[1mHPA\033[0m (TARGETS = uso atual / alvo, em %% do request)\n'
    kubectl -n "$NS" get hpa 2>&1 | sed 's/^No resources found.*/(sem HPA: réplicas fixas)/'
    printf '\n\033[1mPods da API\033[0m\n'
    kubectl -n "$NS" get pods -l app=api \
      -o custom-columns='POD:.metadata.name,PRONTO:.status.containerStatuses[0].ready,FASE:.status.phase,NÓ:.spec.nodeName,ENCERRANDO_DESDE:.metadata.deletionTimestamp' 2>&1 \
      | sed 's/<none>/-/g; s/^/  /'
    printf '\n\033[1mCPU e memória\033[0m (metrics-server, atraso de ~15 s)\n'
    kubectl -n "$NS" top pods --no-headers 2>&1 | sort | awk '{printf "  %-28s %6s %8s\n", $1, $2, $3}'
    printf '\n\033[1mNós\033[0m\n'
    kubectl top nodes --no-headers 2>&1 | awk '{printf "  %-24s CPU %6s (%4s)  mem %7s (%4s)\n", $1, $2, $3, $4, $5}'
  )"
  clear
  printf '%s\n' "$OUT"
  sleep "$INTERVAL"
done
