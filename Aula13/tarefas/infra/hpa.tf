# ============================================================================
# AUTOSCALING HORIZONTAL (HPA)
#
# A cada ~15 s, o HPA lê o uso de CPU dos pods (metrics-server) e calcula:
#
#   réplicas desejadas = ceil( réplicas atuais × uso médio / alvo )
#
# ex.: 2 pods a 150% do request, alvo 60%  →  ceil(2 × 150/60) = 5 pods
#
# O "uso" é em % do REQUEST de CPU (api.tf). Sem request, não há HPA por CPU.
# ============================================================================
resource "kubernetes_horizontal_pod_autoscaler_v2" "api" {
  count = var.hpa_enabled ? 1 : 0

  metadata {
    name      = "api"
    namespace = local.ns
    labels    = merge(local.labels, { app = "api" })
  }

  spec {
    min_replicas = var.hpa_min
    max_replicas = var.hpa_max

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment_v1.api.metadata[0].name
    }

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = var.hpa_cpu_target
        }
      }
    }

    # COMO escalar: rápido para cima, devagar para baixo.
    behavior {
      scale_up {
        # Olha a recomendação dos últimos N s e usa a MENOR (0 = imediato).
        stabilization_window_seconds = var.hpa_scale_up_window
        select_policy                = "Max"
        policy {
          type           = "Percent" # pode dobrar...
          value          = 100
          period_seconds = 15
        }
        policy {
          type           = "Pods" # ...ou somar 4 pods, o que for MAIOR, a cada 15 s
          value          = 4
          period_seconds = 15
        }
      }
      scale_down {
        # Olha a recomendação dos últimos N s e usa a MAIOR. Evita o
        # "pisca-pisca" (flapping) quando a carga oscila.
        stabilization_window_seconds = var.hpa_scale_down_window
        select_policy                = "Max"
        policy {
          type           = "Percent"
          value          = 50 # remove no máximo metade dos pods...
          period_seconds = 15 # ...a cada 15 s
        }
      }
    }
  }

  lifecycle {
    precondition {
      condition     = var.hpa_max >= var.hpa_min
      error_message = "hpa_max deve ser maior ou igual a hpa_min."
    }
  }
}
