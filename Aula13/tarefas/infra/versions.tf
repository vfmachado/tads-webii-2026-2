# Versões FIXAS da ferramenta e dos providers: o mesmo código produz o mesmo
# resultado em qualquer máquina. O `tofu init` grava as versões exatas em
# .terraform.lock.hcl (esse arquivo VAI para o git, como o package-lock.json).
terraform {
  required_version = ">= 1.6"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.36"
    }
  }
}
