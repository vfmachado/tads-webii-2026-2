# ============================================================================
# BANCO: PostgreSQL com volume persistente.
# Compose (Aula 12): serviço `db` + volume `pgdata` + .env
# Kubernetes:        Secret + StatefulSet (com volumeClaimTemplate) + Service
# ============================================================================

# Segredos ficam num Secret, não no manifesto do pod.
# Atenção: o Terraform guarda este valor no terraform.tfstate, em texto puro.
# Por isso o state NUNCA vai para o git (ver .gitignore e infra-como-codigo.md).
resource "kubernetes_secret_v1" "db" {
  metadata {
    name      = "db"
    namespace = local.ns
    labels    = local.labels
  }
  data = {
    POSTGRES_USER     = var.db_user
    POSTGRES_PASSWORD = var.db_password
    POSTGRES_DB       = var.db_name
    DATABASE_URL      = local.database_url
  }
}

# Service "headless" (sem IP virtual): dá o nome DNS `db` ao pod do banco.
resource "kubernetes_service_v1" "db" {
  metadata {
    name      = "db"
    namespace = local.ns
    labels    = merge(local.labels, { app = "db" })
  }
  spec {
    cluster_ip = "None"
    selector   = { app = "db" }
    port {
      port        = 5432
      target_port = 5432
    }
  }
}

# StatefulSet (e não Deployment): o pod tem identidade estável (db-0) e o
# MESMO volume é religado a ele se for recriado. Banco não escala com
# réplicas idênticas: este é o limite da escala horizontal nesta aula.
resource "kubernetes_stateful_set_v1" "db" {
  metadata {
    name      = "db"
    namespace = local.ns
    labels    = merge(local.labels, { app = "db" })
  }

  spec {
    service_name = kubernetes_service_v1.db.metadata[0].name
    replicas     = 1
    selector {
      match_labels = { app = "db" }
    }

    template {
      metadata {
        labels = merge(local.labels, { app = "db" })
      }
      spec {
        container {
          name  = "postgres"
          image = "postgres:17-alpine"
          args  = ["-c", "max_connections=${var.db_max_connections}"]

          env_from {
            secret_ref {
              name = kubernetes_secret_v1.db.metadata[0].name
            }
          }
          env {
            # Subdiretório: o ponto de montagem pode conter arquivos do sistema.
            name  = "PGDATA"
            value = "/var/lib/postgresql/data/pgdata"
          }

          port {
            container_port = 5432
          }

          resources {
            requests = { cpu = "250m", memory = "256Mi" }
            limits   = { cpu = "1", memory = "512Mi" }
          }

          # O mesmo `pg_isready` do healthcheck do compose da Aula 12.
          readiness_probe {
            exec {
              command = ["sh", "-c", "pg_isready -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\""]
            }
            period_seconds    = 5
            failure_threshold = 6
          }

          volume_mount {
            name       = "pgdata"
            mount_path = "/var/lib/postgresql/data"
          }
        }
      }
    }

    # Cada réplica do StatefulSet ganha o SEU volume (PersistentVolumeClaim).
    # No k3s, a StorageClass padrão (local-path) cria um diretório no nó.
    volume_claim_template {
      metadata {
        name = "pgdata"
      }
      spec {
        access_modes = ["ReadWriteOnce"]
        resources {
          requests = { storage = var.db_storage }
        }
      }
    }
  }
}
