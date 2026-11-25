#!/usr/bin/env bash
# Cria o cluster Kubernetes local (k3d) descrito em cluster/k3d.yaml e espera
# o metrics-server, sem o qual o HPA não funciona.
source "$(dirname "$0")/_comum.sh"
need docker k3d kubectl

if k3d cluster list "$CLUSTER" >/dev/null 2>&1; then
  step "cluster $CLUSTER já existe; garantindo que está ligado"
  k3d cluster start "$CLUSTER" >/dev/null
else
  step "criando o cluster $CLUSTER (1 server + 2 agents)"
  k3d cluster create --config cluster/k3d.yaml
fi
kubectl config use-context "k3d-$CLUSTER" >/dev/null

step "nós do cluster (cada um é um contêiner Docker)"
kubectl get nodes -o wide

step "esperando o metrics-server (kubectl top) — pode levar ~1 min"
for _ in $(seq 1 60); do
  kubectl top nodes >/dev/null 2>&1 && break
  sleep 3
done
kubectl top nodes || die "metrics-server não respondeu; tente de novo em instantes"

echo
echo "✔ cluster pronto. Próximo passo: scripts/deploy.sh v1"
