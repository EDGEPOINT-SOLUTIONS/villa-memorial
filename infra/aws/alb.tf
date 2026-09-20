# ============================================================================
# Application Load Balancer terminating HTTPS in front of the container port.
# HTTP (80) is a permanent 301 redirect to HTTPS. The target group health check
# is the app's own GET / (the container HEALTHCHECK uses the same path).
# ============================================================================

resource "terraform_data" "guards" {
  lifecycle {
    precondition {
      condition     = var.alb_certificate_arn != "" || var.create_dns_record
      error_message = "Creating the ACM certificate requires create_dns_record = true (DNS validation). Set alb_certificate_arn for a certificate managed elsewhere, or set create_dns_record = true and provide a Route 53 zone."
    }

    precondition {
      condition     = var.create_dns_record == false || var.route53_zone_id != "" || var.route53_zone_name != ""
      error_message = "create_dns_record = true needs a Route 53 zone: set route53_zone_id or route53_zone_name."
    }

    precondition {
      condition     = length(local.alb_subnet_ids) >= 2
      error_message = "An Application Load Balancer needs at least two subnets in different Availability Zones. Set subnet_ids (or a VPC whose subnets can be discovered)."
    }
  }
}

resource "aws_lb" "web" {
  name               = substr(replace("${local.name}-alb", "_", "-"), 0, 32)
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = local.alb_subnet_ids

  idle_timeout               = 60
  drop_invalid_header_fields = true
  enable_deletion_protection = var.enable_deletion_protection

  tags = { Name = "${local.name}-alb" }
}

resource "aws_lb_target_group" "web" {
  name        = substr(replace("${local.name}-tg", "_", "-"), 0, 32)
  port        = var.web_port
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = local.vpc_id

  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = var.health_check_path
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = { Name = "${local.name}-tg" }
}

resource "aws_lb_target_group_attachment" "web" {
  target_group_arn = aws_lb_target_group.web.arn
  target_id        = aws_instance.web.id
  port             = var.web_port
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.web.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = local.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }

  tags = { Name = "${local.name}-https" }

  lifecycle {
    precondition {
      condition     = local.certificate_arn != null && local.certificate_arn != ""
      error_message = "No TLS certificate resolved. Provide alb_certificate_arn, or let Terraform create and validate one (create_dns_record = true + a Route 53 zone)."
    }
  }
}

resource "aws_lb_listener" "http_redirect" {
  count = var.enable_http_redirect ? 1 : 0

  load_balancer_arn = aws_lb.web.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = { Name = "${local.name}-http" }
}
