# ============================================================================
# Security groups.
#
#   ALB      : 80 + 443 from var.allowed_ingress_cidrs.
#   App host : the container port ONLY from the ALB's security group; SSH only
#              when a key + CIDR are supplied (otherwise reach it via SSM
#              Session Manager). No app port is ever open to the internet.
# ============================================================================

resource "aws_security_group" "alb" {
  name_prefix = "${local.name}-alb-"
  description = "HTTPS/HTTP ingress to the ${local.name} load balancer"
  vpc_id      = local.vpc_id

  tags = { Name = "${local.name}-alb" }

  ingress {
    description = "HTTPS from allowed clients"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_ingress_cidrs
  }

  ingress {
    description = "HTTP (301-redirected to HTTPS by the listener)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_ingress_cidrs
  }

  egress {
    description = "ALB to the app host"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle { create_before_destroy = true }
}

resource "aws_security_group" "instance" {
  name_prefix = "${local.name}-web-"
  description = "App host for ${local.name}"
  vpc_id      = local.vpc_id

  tags = { Name = "${local.name}-web" }

  ingress {
    description     = "Container port from the ALB only"
    from_port       = var.web_port
    to_port         = var.web_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  dynamic "ingress" {
    for_each = var.ssh_cidr != "" && var.key_name != "" ? [var.ssh_cidr] : []
    content {
      description = "Optional SSH administration"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  egress {
    description = "Package installs, git fetch, image builds, SSM, gateway calls"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle { create_before_destroy = true }
}
