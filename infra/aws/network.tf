# ============================================================================
# Network lookup. The package does not create a VPC: it deploys into the
# account's default VPC (or var.vpc_id) and discovers that VPC's subnets.
# ============================================================================

data "aws_vpc" "default" {
  count   = local.use_default_vpc ? 1 : 0
  default = true
}

data "aws_subnets" "selected" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}
