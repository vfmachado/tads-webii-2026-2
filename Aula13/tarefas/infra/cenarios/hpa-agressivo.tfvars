# Cenário 3: igual ao `hpa`, mas o scale-down acontece em 30 s, para caber
# na aula. Em produção isso causaria "flapping" (sobe/desce sem parar).
#   scripts/cenario.sh hpa-agressivo
hpa_enabled           = true
hpa_min               = 1
hpa_max               = 6
hpa_cpu_target        = 60
hpa_scale_up_window   = 0
hpa_scale_down_window = 30
