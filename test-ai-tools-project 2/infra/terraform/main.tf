terraform {
  required_version = ">= 1.0.0"
}

provider "local" {}

# Placeholder resources for Phase 1: no real infra is provisioned in this PR.
# Teams should replace this with real providers (aws, azurerm, google) and
# remote state configuration when the infra plan is finalized.

resource "local_file" "placeholder" {
  content  = "GSTA-81 Terraform skeleton placeholder"
  filename = "${path.module}/.placeholder"
}
