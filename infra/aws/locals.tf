# ============================================================================
# Derived names, network selection and TLS plumbing.
# ============================================================================

locals {
  name         = "${var.project}-${var.environment}"
  site_url     = var.site_url != "" ? var.site_url : "https://${var.domain_name}"
  param_prefix = "/${var.project}/${var.environment}"

  tags = merge(
    {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
      Component   = "web"
    },
    var.tags,
  )

  # Network: use the default VPC unless one is named; subnets are discovered for
  # the chosen VPC unless a list is supplied.
  use_default_vpc = var.vpc_id == ""
  vpc_id          = local.use_default_vpc ? data.aws_vpc.default[0].id : var.vpc_id

  alb_subnet_ids     = length(var.subnet_ids) > 0 ? var.subnet_ids : data.aws_subnets.selected.ids
  instance_subnet_id = length(local.alb_subnet_ids) > 0 ? local.alb_subnet_ids[0] : null

  # Route 53 zone: explicit id wins, otherwise a name lookup.
  zone_id = (
    var.route53_zone_id != "" ? var.route53_zone_id :
    (length(data.aws_route53_zone.selected) > 0 ? data.aws_route53_zone.selected[0].zone_id : "")
  )

  # The certificate the HTTPS listener uses: a supplied ARN, else the one
  # Terraform created AND validated (one() is null when count is 0).
  certificate_arn = (
    var.alb_certificate_arn != "" ? var.alb_certificate_arn :
    one(aws_acm_certificate_validation.this[*].certificate_arn)
  )
}
