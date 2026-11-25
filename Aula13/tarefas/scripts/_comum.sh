# Funções comuns aos scripts (carregado com `source`, não execute direto).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

CLUSTER=aula13
NS=tarefas
K3D_NET="k3d-$CLUSTER"
# Endereço do sistema DE DENTRO da rede Docker do k3d (para k6 e smoke):
# o load balancer do k3d, porta 80 → Traefik → web.
LB_URL="http://k3d-$CLUSTER-serverlb"

step() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }
die() { printf '\033[31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

# OpenTofu ou Terraform: o código é o mesmo. Force com TF=terraform.
TF="${TF:-$(command -v tofu >/dev/null && echo tofu || echo terraform)}"

need() { for c in "$@"; do command -v "$c" >/dev/null || die "comando '$c' não encontrado (veja o README: pré-requisitos)"; done; }

# Senha do banco: vem do .env (fora do git) para o Terraform via TF_VAR_.
load_env() {
  [ -f .env ] || die "crie o .env:  cp .env.example .env"
  set -a; . ./.env; set +a
  export TF_VAR_db_password="${POSTGRES_PASSWORD:?defina POSTGRES_PASSWORD no .env}"
}

tf() { (cd infra && "$TF" "$@"); }

tf_init() { [ -d infra/.terraform ] || tf init -input=false; }
