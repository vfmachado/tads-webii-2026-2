#!/usr/bin/env bash
# Apaga o cluster inteiro (nós, pods, volumes) e o state do Terraform.
source "$(dirname "$0")/_comum.sh"
need k3d

step "apagando o cluster $CLUSTER"
k3d cluster delete "$CLUSTER"

# O state descrevia recursos de um cluster que não existe mais. Mantê-lo faria
# o próximo `plan` tentar consultar objetos inexistentes.
step "apagando o state do Terraform e os registros de versão"
rm -f infra/terraform.tfstate infra/terraform.tfstate.backup infra/versao.auto.tfvars
rm -rf .deploy
echo "✔ tudo limpo (o cenário ativo em infra/cenario.auto.tfvars foi mantido)"
