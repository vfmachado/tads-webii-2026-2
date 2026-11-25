#!/usr/bin/env bash
# Roda o OpenTofu/Terraform em infra/ com a senha do .env já carregada.
#
#   scripts/tf.sh plan          # o que mudaria no cluster?
#   scripts/tf.sh apply
#   scripts/tf.sh output
#   scripts/tf.sh state list    # o que o Terraform acha que existe
source "$(dirname "$0")/_comum.sh"
load_env
tf_init
tf "$@"
