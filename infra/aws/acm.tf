# ============================================================================
# TLS: a regional ACM certificate validated by DNS in the Route 53 zone, unless
# an already-validated certificate ARN is supplied. The HTTPS listener's
# certificate_arn points at the *validated* certificate, so the listener is only
# created once the certificate is usable.
# ============================================================================

resource "aws_acm_certificate" "this" {
  count = var.alb_certificate_arn == "" ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "${local.name}-cert" }
}

# One validation record per name on the certificate (the domain + any SANs).
resource "aws_route53_record" "cert_validation" {
  for_each = var.alb_certificate_arn == "" && var.create_dns_record ? {
    for dvo in aws_acm_certificate.this[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = local.zone_id
}

resource "aws_acm_certificate_validation" "this" {
  count = var.alb_certificate_arn == "" && var.create_dns_record ? 1 : 0

  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
