# ============================================================================
# villa-web — AWS shape A (EC2 + ALB + managed HTTPS) · Terraform root module
#
# Why Terraform rather than AWS CDK for this repo:
#   · the stack is a small, fixed set of resources (EC2 · EBS · ALB · ACM ·
#     Route 53 · SSM · SGs · IAM) with no application code — HCL expresses it
#     directly, with no aws-cdk-lib dependency added to the Next.js project
#     (the repo's lint/typecheck/build stay exactly as they are);
#   · `terraform fmt` / `validate` (and `plan`) validate the package without an
#     AWS account, which is the delivery gate for this task;
#   · the captain asked for Terraform preferred. The repo's aws-cdk skill is a
#     general construct-authoring guide, not evidence that CDK fits this repo.
#
# State: intentionally backend-less. The first `terraform init` writes local
# state; see docs/08-delivery/aws-deploy.md §2 for the remote-state recipe.
# ============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Every resource that supports tags inherits these; per-resource `Name` tags
  # are added where a human would look for them in the console.
  default_tags {
    tags = local.tags
  }
}
