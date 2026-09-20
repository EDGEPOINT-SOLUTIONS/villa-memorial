# ============================================================================
# Inputs. Everything account/region/domain-specific is a variable; the
# defaults are deliberately the Villa staging shape. See terraform.tfvars.example
# and docs/08-delivery/aws-deploy.md.
# ============================================================================

# --- Naming / placement -----------------------------------------------------

variable "aws_account_id" {
  description = <<-EOT
    AWS account to deploy into. Default is the captain-confirmed Villa account.
    terraform-data-guard fails the plan if the caller's account does not match, so
    IAM ARNs can never be scoped to the wrong account.
  EOT
  type        = string
  default     = "632296084403"

  validation {
    condition     = can(regex("^[0-9]{12}$", var.aws_account_id))
    error_message = "aws_account_id must be a 12-digit account id."
  }
}

variable "aws_region" {
  description = "AWS region to deploy into. The ALB and its ACM certificate must be in the same region."
  type        = string
  default     = "ap-southeast-1"
}

variable "project" {
  description = "Short project slug used in resource names, tags and the SSM parameter prefix."
  type        = string
  default     = "villa-web"

  validation {
    condition     = can(regex("^[a-z0-9-]{2,24}$", var.project))
    error_message = "project must be 2-24 lowercase alphanumerics or hyphens."
  }
}

variable "environment" {
  description = "Environment slug (e.g. staging, production) — part of every resource name and the SSM prefix."
  type        = string
  default     = "staging"

  validation {
    condition     = can(regex("^[a-z0-9-]{2,16}$", var.environment))
    error_message = "environment must be 2-16 lowercase alphanumerics or hyphens."
  }
}

variable "tags" {
  description = "Extra tags merged over the defaults (Project/Environment/ManagedBy/Component)."
  type        = map(string)
  default     = {}
}

# --- Domain / TLS -----------------------------------------------------------

variable "domain_name" {
  description = "Public hostname the app is served on (an A record is created for it). Also the default SITE_URL host."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]*[a-z0-9]$", var.domain_name))
    error_message = "domain_name must be a bare hostname with no scheme or trailing slash."
  }
}

variable "site_url" {
  description = "Canonical origin written to SITE_URL (no trailing slash). Defaults to https://<domain_name>."
  type        = string
  default     = ""

  validation {
    condition     = var.site_url == "" || can(regex("^https://[^/]+$", var.site_url))
    error_message = "site_url must be empty or an https:// origin with no trailing slash."
  }
}

variable "subject_alternative_names" {
  description = "Extra SANs on the Terraform-managed ACM certificate (e.g. [\"www.example.ph\"])."
  type        = list(string)
  default     = []
}

variable "alb_certificate_arn" {
  description = <<-EOT
    An existing, already-validated ACM certificate ARN in var.aws_region. When set,
    Terraform does NOT create or validate a certificate. Leave empty to have
    Terraform create one validated by DNS (requires create_dns_record = true and
    a Route 53 zone).
  EOT
  type        = string
  default     = ""
}

variable "create_dns_record" {
  description = "Create the Route 53 A (alias) record for domain_name. Required when Terraform manages the certificate."
  type        = bool
  default     = true
}

variable "enable_http_redirect" {
  description = "Create the HTTP:80 listener that 301-redirects to HTTPS."
  type        = bool
  default     = true
}

variable "route53_zone_id" {
  description = "Existing Route 53 hosted zone id for domain_name. Takes precedence over route53_zone_name."
  type        = string
  default     = ""
}

variable "route53_zone_name" {
  description = "Route 53 hosted zone name to look up when route53_zone_id is empty (e.g. example.ph)."
  type        = string
  default     = ""
}

# --- Network ----------------------------------------------------------------

variable "vpc_id" {
  description = "VPC to deploy into. Empty uses the account's default VPC."
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = <<-EOT
    Subnets for the ALB (>= 2 in different AZs) and the app host (the first one).
    Empty discovers suitable subnets in var.vpc_id (all available subnets when the
    default VPC is used). For a private-subnet layout set this explicitly and set
    associate_public_ip = false, and provide NAT for egress.
  EOT
  type        = list(string)
  default     = []
}

variable "associate_public_ip" {
  description = "Give the app host a public IPv4 (needed for egress on a public subnet with no NAT)."
  type        = bool
  default     = true
}

variable "allowed_ingress_cidrs" {
  description = "CIDRs allowed to reach the ALB on 80/443. Restrict this (e.g. the office range) for a non-public staging box."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# --- App host ---------------------------------------------------------------

variable "instance_type" {
  description = "App host instance type. Next.js production builds are memory-hungry; a 2 vCPU / 4 GB class is the comfortable default."
  type        = string
  default     = "t3.medium"
}

variable "root_volume_size" {
  description = "Root EBS volume size (GiB, gp3, encrypted, deleted with the instance)."
  type        = number
  default     = 30
}

variable "data_volume_size" {
  description = <<-EOT
    Separate gp3 EBS volume (GiB, encrypted, detached on termination so it survives
    instance replacement). Mounted at Docker's data-root /var/lib/docker, so the
    compose named volume villa-web-data (container /app/.data) is persistent.
  EOT
  type        = number
  default     = 30
}

variable "key_name" {
  description = "Optional EC2 key pair for SSH. Empty = no SSH ingress; use SSM Session Manager instead."
  type        = string
  default     = ""
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH (port 22) when key_name is set. Empty = no SSH ingress (SSM only)."
  type        = string
  default     = ""
}

variable "enable_ssm_session" {
  description = "Attach AmazonSSMManagedInstanceCore so the host is reachable via SSM Session Manager (no SSH needed)."
  type        = bool
  default     = true
}

variable "enable_deletion_protection" {
  description = "ALB deletion protection. Keep false for staging so `terraform destroy` works."
  type        = bool
  default     = false
}

# --- App source / runtime ---------------------------------------------------

variable "git_repo_url" {
  description = "Repository to clone on the host (the image is built on the instance; no registry is published yet)."
  type        = string
  default     = "https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial.git"
}

variable "git_ref" {
  description = "Branch, tag or commit to deploy (fetched with depth 1)."
  type        = string
  default     = "main"
}

variable "git_token_ssm_parameter" {
  description = <<-EOT
    Optional name of a pre-created SecureString SSM parameter holding a GitHub token
    for a private clone. The token is read by the instance role, never by Terraform
    (so it never enters state or user-data). Empty = clone anonymously.
  EOT
  type        = string
  default     = ""
}

variable "app_dir" {
  description = "Absolute path of the checkout on the host."
  type        = string
  default     = "/opt/villa-web/app"
}

variable "web_port" {
  description = "Host/container port the Next.js server listens on (docker-compose.production.yml publishes it)."
  type        = number
  default     = 3000

  validation {
    condition     = var.web_port >= 1 && var.web_port <= 65535
    error_message = "web_port must be a valid TCP port."
  }
}

variable "health_check_path" {
  description = "ALB target-group health check path (the app answers 200 on /)."
  type        = string
  default     = "/"
}

variable "compose_version" {
  description = "Docker Compose CLI plugin release installed on the host (github.com/docker/compose tags)."
  type        = string
  default     = "v2.29.7"
}

# --- Application environment (SSM Parameter Store) --------------------------

variable "service_base_urls" {
  description = <<-EOT
    Gateway base URLs written to SSM and materialised into .env.production on the
    host. Keys are the app's env var names (AUTH_BASE_URL, COMMERCE_BASE_URL, …).
    Values left empty (or absent) are not created: the compose file treats a
    missing URL as empty, which keeps that surface on recorded fixtures — the
    honest default until the contract freezes. Do not add HR_BASE_URL/CRM_BASE_URL
    (their live reads refuse with a named 503).
  EOT
  type        = map(string)
  default     = {}
}

variable "tenant_display_name" {
  description = "Optional TENANT_DISPLAY_NAME for app-generated documents. Empty leaves the app default."
  type        = string
  default     = ""
}
