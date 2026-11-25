# Base comum a todos os cenários (versionada: NADA de segredo aqui).
# O cenário ativo (cenario.auto.tfvars) e a versão (versao.auto.tfvars) são
# gerados pelos scripts e sobrescrevem estes valores.

namespace       = "tarefas"
api_cpu_request = "250m"
api_cpu_limit   = "500m"
db_pool_max     = 10
report_cpu_cost = 200000
web_replicas    = 2
