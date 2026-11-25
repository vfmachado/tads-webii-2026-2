# Namespace: uma "pasta" dentro do cluster. Tudo do sistema fica aqui, e
# `kubectl delete namespace tarefas` apagaria tudo de uma vez.
resource "kubernetes_namespace_v1" "tarefas" {
  metadata {
    name = var.namespace
    labels = {
      "app.kubernetes.io/part-of" = "tarefas"
    }
  }
}

locals {
  ns = kubernetes_namespace_v1.tarefas.metadata[0].name

  # Rótulos comuns: é por eles que Services e o HPA encontram os pods.
  labels = {
    "app.kubernetes.io/part-of"    = "tarefas"
    "app.kubernetes.io/managed-by" = "terraform"
  }

  database_url = "postgres://${var.db_user}:${var.db_password}@db:5432/${var.db_name}"
}
