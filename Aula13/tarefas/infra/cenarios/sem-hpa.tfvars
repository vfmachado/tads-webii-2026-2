# Cenário 1: o "antes". Uma réplica fixa da API, sem autoscaling.
#   scripts/cenario.sh sem-hpa
hpa_enabled  = false
api_replicas = 1
