# ============================================================================
# PARÂMETROS DA INFRAESTRUTURA
#
# Tudo o que muda entre ambientes/cenários é variável. Os valores vêm de
# (cada linha VENCE as de cima):
#   1. o `default` abaixo
#   2. variáveis de ambiente TF_VAR_<nome>   (ex.: TF_VAR_db_password)
#   3. terraform.tfvars                      (versionado: a base, sem segredos)
#   4. *.auto.tfvars                         (gerados pelos scripts: versão e cenário)
#   5. -var / -var-file na linha de comando
# Validações que cruzam variáveis (ex.: hpa_max >= hpa_min) estão como
# `precondition` em api.tf.
# ============================================================================

# ---------------------------------------------------------------- cluster
variable "kubeconfig_path" {
  description = "Arquivo kubeconfig usado para falar com o cluster."
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Contexto do kubeconfig (o k3d cria \"k3d-<nome do cluster>\")."
  type        = string
  default     = "k3d-aula13"
}

variable "namespace" {
  description = "Namespace onde o sistema é criado."
  type        = string
  default     = "tarefas"
}

# ---------------------------------------------------------------- versão
variable "image_tag" {
  description = "Tag das imagens tarefas-api e tarefas-web (o scripts/deploy.sh grava em versao.auto.tfvars)."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]{0,40}$", var.image_tag))
    error_message = "Use minúsculas, números, ponto e hífen (ex.: v1, v1.2.0, a1b2c3d): a tag vira parte do nome do Job de migration."
  }
}

# ---------------------------------------------------------------- banco
variable "db_user" {
  type    = string
  default = "tarefas"
}

variable "db_name" {
  type    = string
  default = "tarefas"
}

variable "db_password" {
  description = "Senha do Postgres. NUNCA em arquivo versionado: vem de TF_VAR_db_password (os scripts leem do .env)."
  type        = string
  sensitive   = true # não aparece no plan nem no output... mas FICA no state.

  validation {
    condition     = can(regex("^[A-Za-z0-9]{8,}$", var.db_password))
    error_message = "Use 8+ letras e números: a senha entra na DATABASE_URL."
  }
}

variable "db_max_connections" {
  description = "max_connections do Postgres. Réplicas da API × db_pool_max precisa caber aqui."
  type        = number
  default     = 100
}

variable "db_storage" {
  description = "Tamanho do volume do banco."
  type        = string
  default     = "1Gi"
}

# ---------------------------------------------------------------- API
variable "api_replicas" {
  description = "Réplicas FIXAS da API. Só vale com hpa_enabled = false."
  type        = number
  default     = 1
}

variable "api_cpu_request" {
  description = "CPU RESERVADA por pod da API. É a base do cálculo do HPA: 60% de 250m = 150m."
  type        = string
  default     = "250m"
}

variable "api_cpu_limit" {
  description = "Teto de CPU por pod. Acima disso o kernel ESTRANGULA o processo (throttling)."
  type        = string
  default     = "500m"
}

variable "api_memory_request" {
  type    = string
  default = "96Mi"
}

variable "api_memory_limit" {
  description = "Passou disso, o pod é morto (OOMKilled) e reiniciado."
  type        = string
  default     = "192Mi"
}

variable "db_pool_max" {
  description = "Conexões com o banco POR POD da API (DB_POOL_MAX)."
  type        = number
  default     = 10

  validation {
    condition     = var.db_pool_max >= 1 && var.db_pool_max <= 100
    error_message = "db_pool_max deve estar entre 1 e 100."
  }
}

variable "report_cpu_cost" {
  description = "Iterações do PBKDF2 em GET /api/tasks/report (REPORT_CPU_COST): quanto CPU cada relatório gasta."
  type        = number
  default     = 200000
}

# ---------------------------------------------------------------- autoscaling
variable "hpa_enabled" {
  description = "Liga o HorizontalPodAutoscaler da API. Desligado, valem as api_replicas fixas."
  type        = bool
  default     = true
}

variable "hpa_min" {
  description = "Mínimo de pods da API com o HPA ligado."
  type        = number
  default     = 1

  validation {
    condition     = var.hpa_min >= 1
    error_message = "hpa_min deve ser pelo menos 1."
  }
}

variable "hpa_max" {
  description = "Máximo de pods da API com o HPA ligado (o teto de custo)."
  type        = number
  default     = 6
}

variable "hpa_cpu_target" {
  description = "Uso médio de CPU, em % do REQUEST, que o HPA tenta manter."
  type        = number
  default     = 60

  validation {
    condition     = var.hpa_cpu_target > 0 && var.hpa_cpu_target <= 100
    error_message = "hpa_cpu_target é um percentual entre 1 e 100."
  }
}

variable "hpa_scale_up_window" {
  description = "Janela de estabilização para AUMENTAR (s). 0 = reage na hora."
  type        = number
  default     = 0
}

variable "hpa_scale_down_window" {
  description = "Janela de estabilização para DIMINUIR (s). O padrão do Kubernetes é 300 (5 min)."
  type        = number
  default     = 300
}

# ---------------------------------------------------------------- web
variable "web_replicas" {
  description = "Réplicas do nginx (front + proxy /api). Fixas: o gargalo desta aula é a API."
  type        = number
  default     = 2
}
