#!/usr/bin/env bash
# Teste de carga com k6, de FORA do cluster (como usuários de verdade):
# k6 → load balancer do k3d → Traefik → web (nginx) → api → db
#
#   scripts/carga.sh                       # pico de 60 req/s, platô de 2 min
#   PICO=30 PLATO=1m scripts/carga.sh
#   PICO=8 PLATO=5m scripts/carga.sh       # carga leve e longa (ver o scale-down sem erros)
#
# Em outro terminal: scripts/observar.sh
source "$(dirname "$0")/_comum.sh"
need docker
docker network inspect "$K3D_NET" >/dev/null 2>&1 || die "cluster não está no ar (scripts/cluster-up.sh)"

docker run --rm -i --network "$K3D_NET" \
  -v "$PWD/carga:/scripts:ro" \
  -e BASE_URL="$LB_URL" \
  -e PICO="${PICO:-60}" -e PLATO="${PLATO:-2m}" -e RAMPA="${RAMPA:-30s}" \
  grafana/k6:1.3.0 run /scripts/escala.js
