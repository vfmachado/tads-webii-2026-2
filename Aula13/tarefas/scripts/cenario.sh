#!/usr/bin/env bash
# Troca a parametrização da infra (réplicas fixas × HPA) SEM rebuild.
#
#   scripts/cenario.sh sem-hpa         # 1 pod fixo
#   scripts/cenario.sh hpa             # autoscaling, scale-down padrão (5 min)
#   scripts/cenario.sh hpa-agressivo   # autoscaling, scale-down em 30 s
#   scripts/cenario.sh                 # mostra o cenário ativo
#
# O arquivo escolhido é copiado para infra/cenario.auto.tfvars: o Terraform
# carrega *.auto.tfvars sozinho, então `scripts/tf.sh plan` reflete o cenário.
source "$(dirname "$0")/_comum.sh"
NAME="${1:-}"
if [ -z "$NAME" ]; then
  echo "cenário ativo:"; cat infra/cenario.auto.tfvars 2>/dev/null || echo "(nenhum: valem os defaults de variables.tf)"
  echo; echo "disponíveis: $(cd infra/cenarios && ls *.tfvars | sed 's/\.tfvars//' | tr '\n' ' ')"
  exit 0
fi
SRC="infra/cenarios/$NAME.tfvars"
[ -f "$SRC" ] || die "cenário '$NAME' não existe (veja infra/cenarios/)"
[ -f infra/versao.auto.tfvars ] || die "faça o primeiro deploy antes: scripts/deploy.sh v1"
load_env

{ echo "# gerado por scripts/cenario.sh a partir de $SRC"; cat "$SRC"; } > infra/cenario.auto.tfvars
step "cenário: $NAME"
cat "$SRC"
tf_init
tf apply -input=false -auto-approve
tf output autoscaling
