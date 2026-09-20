# ============================================================================
# DNS: an A (alias) record for the app hostname pointing at the ALB.
# ============================================================================

data "aws_route53_zone" "selected" {
  count = var.route53_zone_id == "" && var.route53_zone_name != "" ? 1 : 0

  name         = var.route53_zone_name
  private_zone = false
}

resource "aws_route53_record" "app" {
  count = var.create_dns_record ? 1 : 0

  zone_id = local.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.web.dns_name
    zone_id                = aws_lb.web.zone_id
    evaluate_target_health = true
  }
}
