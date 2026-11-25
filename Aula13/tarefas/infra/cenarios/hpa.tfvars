# Cenário 2: autoscaling com os tempos PADRÃO do Kubernetes.
# Sobe rápido; só desce depois de 5 min de carga baixa.
#   scripts/cenario.sh hpa
hpa_enabled           = true
hpa_min               = 1
hpa_max               = 6
hpa_cpu_target        = 60
hpa_scale_up_window   = 0
hpa_scale_down_window = 300
