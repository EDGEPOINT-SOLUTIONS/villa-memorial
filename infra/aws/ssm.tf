# ============================================================================
# Runtime configuration in SSM Parameter Store.
#
# SITE_URL is always written. One String parameter per non-empty gateway URL is
# written under the same prefix; the host reads them at boot and materialises
# .env.production. A URL with no parameter is simply absent from the env file —
# docker-compose.production.yml's ${VAR:-} default makes it empty, which keeps
# that surface on recorded fixtures (the honest default). This is why no empty
# parameters are created: SSM rejects an empty Value.
# ============================================================================

resource "aws_ssm_parameter" "site_url" {
  name  = "${local.param_prefix}/site_url"
  type  = "String"
  value = local.site_url

  tags = { Name = "${local.name}-site-url" }
}

resource "aws_ssm_parameter" "service_base_urls" {
  for_each = { for name, url in var.service_base_urls : name => url if trimspace(url) != "" }

  name  = "${local.param_prefix}/${lower(each.key)}"
  type  = "String"
  value = each.value

  tags = { Name = "${local.name}-${lower(each.key)}" }
}

resource "aws_ssm_parameter" "tenant_display_name" {
  count = trimspace(var.tenant_display_name) != "" ? 1 : 0

  name  = "${local.param_prefix}/tenant_display_name"
  type  = "String"
  value = var.tenant_display_name

  tags = { Name = "${local.name}-tenant-display-name" }
}
