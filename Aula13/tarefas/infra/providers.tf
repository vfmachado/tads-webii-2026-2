# O provider é o "driver": traduz cada `resource` em chamadas à API do
# Kubernetes. Aqui ele usa o mesmo ~/.kube/config do kubectl, no contexto do
# cluster criado pelo k3d.
provider "kubernetes" {
  config_path    = pathexpand(var.kubeconfig_path)
  config_context = var.kube_context
}
