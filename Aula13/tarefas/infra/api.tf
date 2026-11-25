# ============================================================================
# API: Deployment (N pods idênticos e descartáveis) + Service (um endereço
# estável que distribui as requisições entre os pods prontos).
# ============================================================================

resource "kubernetes_deployment_v1" "api" {
  metadata {
    name      = "api"
    namespace = local.ns
    labels    = merge(local.labels, { app = "api" })
  }

  spec {
    # QUEM DECIDE QUANTOS PODS?
    #   HPA desligado → o Terraform (api_replicas). Um `kubectl scale` manual
    #                   aparece como DRIFT no próximo `tofu plan`.
    #   HPA ligado    → o HPA. `null` = o Terraform deixa de gerenciar o campo;
    #                   se ele insistisse num número, cada `apply` desfaria
    #                   o trabalho do autoscaler.
    replicas = var.hpa_enabled ? null : var.api_replicas

    selector {
      match_labels = { app = "api" }
    }

    # Atualização gradual: sobe 1 pod novo, espera ficar PRONTO, derruba 1
    # antigo... Nunca fica com menos pods prontos do que o desejado.
    strategy {
      type = "RollingUpdate"
      rolling_update {
        max_surge       = "1"
        max_unavailable = "0"
      }
    }

    template {
      metadata {
        labels = merge(local.labels, { app = "api", version = var.image_tag })
      }

      spec {
        # Tempo máximo entre o SIGTERM e o SIGKILL. Cobre o preStop (5 s) e o
        # shutdown() do index.ts (até 8 s).
        termination_grace_period_seconds = 20

        container {
          name              = "api"
          image             = "tarefas-api:${var.image_tag}"
          image_pull_policy = "IfNotPresent"

          port {
            container_port = 3000
          }

          env {
            name  = "NODE_ENV"
            value = "production"
          }
          env {
            name  = "PORT"
            value = "3000"
          }
          env {
            name  = "APP_VERSION"
            value = var.image_tag
          }
          env {
            name  = "DB_POOL_MAX"
            value = tostring(var.db_pool_max)
          }
          env {
            name  = "REPORT_CPU_COST"
            value = tostring(var.report_cpu_cost)
          }
          env {
            name = "DATABASE_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.db.metadata[0].name
                key  = "DATABASE_URL"
              }
            }
          }

          # REQUESTS: o que o scheduler RESERVA no nó, e a base do % do HPA.
          # LIMITS:   o teto. CPU acima do limit é estrangulada, não morta.
          resources {
            requests = { cpu = var.api_cpu_request, memory = var.api_memory_request }
            limits   = { cpu = var.api_cpu_limit, memory = var.api_memory_limit }
          }

          # READINESS = /api/ready (testa o banco). Enquanto falhar, o pod
          # NÃO recebe tráfego do Service. Um pod recém-criado pelo HPA só
          # entra no rodízio quando estiver pronto.
          readiness_probe {
            http_get {
              path = "/api/ready"
              port = 3000
            }
            period_seconds    = 5
            timeout_seconds   = 2
            failure_threshold = 2
          }

          # LIVENESS = /api/health (NÃO testa o banco). Se falhar, o kubelet
          # REINICIA o contêiner. Banco fora do ar não deve causar restarts.
          liveness_probe {
            http_get {
              path = "/api/health"
              port = 3000
            }
            initial_delay_seconds = 5
            period_seconds        = 10
            timeout_seconds       = 3
            failure_threshold     = 3
          }

          # Ao remover um pod (scale-down, deploy), o Kubernetes faz DUAS coisas
          # em paralelo: tira o pod do Service e manda SIGTERM. O `sleep 5`
          # segura o SIGTERM até o tráfego parar de chegar. Sem isso,
          # requisições ainda roteadas para o pod recebem "connection refused".
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

  # O Terraform só termina o `apply` quando os pods novos estiverem prontos.
  wait_for_rollout = true
  timeouts {
    create = "3m"
    update = "3m"
  }

  lifecycle {
    precondition {
      # Pior caso: todas as réplicas com o pool cheio, mais folga para o
      # migrate e para um psql de manutenção.
      condition     = (var.hpa_enabled ? var.hpa_max : var.api_replicas) * var.db_pool_max <= var.db_max_connections - 5
      error_message = "Réplicas máximas × db_pool_max excede db_max_connections - 5: o banco recusaria conexões no pico."
    }
  }

  # A API só sobe depois que as migrations da versão terminaram.
  depends_on = [kubernetes_job_v1.migrate]
}

# Service: nome DNS `api` + IP virtual estável. O kube-proxy distribui cada
# conexão entre os pods PRONTOS. É para cá que o nginx do `web` aponta
# (proxy_pass http://api:3000), e ele não precisa saber quantos pods existem.
resource "kubernetes_service_v1" "api" {
  metadata {
    name      = "api"
    namespace = local.ns
    labels    = merge(local.labels, { app = "api" })
  }
  spec {
    selector = { app = "api" }
    port {
      port        = 3000
      target_port = 3000
    }
  }
}
