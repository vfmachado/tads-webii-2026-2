# ============================================================================
# FRONT: nginx com o build estático do React; repassa /api para o Service `api`.
# A MESMA imagem e o MESMO nginx.conf da Aula 12: só o ambiente mudou.
# ============================================================================
resource "kubernetes_deployment_v1" "web" {
  metadata {
    name      = "web"
    namespace = local.ns
    labels    = merge(local.labels, { app = "web" })
  }

  spec {
    replicas = var.web_replicas
    selector {
      match_labels = { app = "web" }
    }

    template {
      metadata {
        labels = merge(local.labels, { app = "web", version = var.image_tag })
      }
      spec {
        container {
          name              = "web"
          image             = "tarefas-web:${var.image_tag}"
          image_pull_policy = "IfNotPresent"
          port {
            container_port = 8080
          }
          resources {
            requests = { cpu = "50m", memory = "32Mi" }
            limits   = { cpu = "500m", memory = "128Mi" }
          }
          readiness_probe {
            http_get {
              path = "/"
              port = 8080
            }
            period_seconds = 5
          }
          lifecycle {
            pre_stop {
              exec {
                command = ["sleep", "5"]
              }
            }
          }
        }
      }
    }
  }

  wait_for_rollout = true

  # O nginx resolve o nome `api` na partida: o Service precisa existir antes.
  depends_on = [kubernetes_service_v1.api]
}

resource "kubernetes_service_v1" "web" {
  metadata {
    name      = "web"
    namespace = local.ns
    labels    = merge(local.labels, { app = "web" })
  }
  spec {
    selector = { app = "web" }
    port {
      port        = 8080
      target_port = 8080
    }
  }
}
