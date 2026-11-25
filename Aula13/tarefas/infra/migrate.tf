# ============================================================================
# MIGRATIONS: um Job, executado UMA vez por versão, antes da API.
# Compose (Aula 12): serviço `migrate` + depends_on: service_completed_successfully
# Kubernetes:        Job + wait_for_completion (o Terraform espera ele terminar)
# ============================================================================
#
# O nome inclui a tag da imagem: uma versão nova => um Job novo (Jobs são
# imutáveis). Como o runner é idempotente (Aula 12), rodar de novo uma
# versão já aplicada não faz nada.
resource "kubernetes_job_v1" "migrate" {
  metadata {
    name      = "migrate-${var.image_tag}"
    namespace = local.ns
    labels    = merge(local.labels, { app = "migrate" })
  }

  spec {
    backoff_limit = 4 # se o banco ainda estiver subindo, tenta de novo

    template {
      metadata {
        labels = merge(local.labels, { app = "migrate" })
      }
      spec {
        restart_policy = "Never"
        container {
          name              = "migrate"
          image             = "tarefas-api:${var.image_tag}"
          image_pull_policy = "IfNotPresent" # a imagem foi importada no cluster (k3d image import)
          command           = ["node", "dist/migrate.js"]
          env {
            name = "DATABASE_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.db.metadata[0].name
                key  = "DATABASE_URL"
              }
            }
          }
        }
      }
    }
  }

  wait_for_completion = true
  timeouts {
    create = "3m"
    update = "3m"
  }

  depends_on = [kubernetes_stateful_set_v1.db]
}
