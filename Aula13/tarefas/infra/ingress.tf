# ============================================================================
# INGRESS: a porta de entrada HTTP do cluster.
# Compose (Aula 12): `ports: "8090:8080"` no serviço web
# Kubernetes: localhost:8013 → load balancer do k3d → Traefik (Ingress
#             controller do k3s) → Service web → pods do nginx
# ============================================================================
resource "kubernetes_ingress_v1" "tarefas" {
  metadata {
    name      = "tarefas"
    namespace = local.ns
    labels    = local.labels
  }
  spec {
    ingress_class_name = "traefik"
    rule {
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service_v1.web.metadata[0].name
              port {
                number = 8080
              }
            }
          }
        }
      }
    }
  }
}
