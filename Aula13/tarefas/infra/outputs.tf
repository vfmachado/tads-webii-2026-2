# Outputs: o que o `tofu apply` imprime no final (e `tofu output` mostra depois).
output "url" {
  description = "Onde o sistema responde."
  value       = "http://localhost:8013"
}

output "versao" {
  value = var.image_tag
}

output "autoscaling" {
  description = "Como a API está dimensionada."
  value = var.hpa_enabled ? (
    "HPA: ${var.hpa_min}–${var.hpa_max} pods, alvo ${var.hpa_cpu_target}% de ${var.api_cpu_request} de CPU, scale-down após ${var.hpa_scale_down_window}s"
  ) : "réplicas fixas: ${var.api_replicas} (sem HPA)"
}

output "comandos" {
  value = <<-EOT
    kubectl -n ${local.ns} get pods -o wide
    kubectl -n ${local.ns} get hpa -w
    kubectl -n ${local.ns} top pods
    kubectl -n ${local.ns} logs -l app=api -f --prefix
  EOT
}
