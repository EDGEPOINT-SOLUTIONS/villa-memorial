# ============================================================================
# Outputs a deployer (and the captain) needs after `terraform apply`.
# ============================================================================

output "public_url" {
  description = "The HTTPS origin the deployment is served on."
  value       = "https://${var.domain_name}"
}

output "site_url" {
  description = "The canonical SITE_URL written to SSM / .env.production."
  value       = local.site_url
}

output "instance_id" {
  description = "EC2 instance id of the app host."
  value       = aws_instance.web.id
}

output "instance_private_ip" {
  description = "Private IPv4 of the app host (the ALB's target)."
  value       = aws_instance.web.private_ip
}

output "alb_dns_name" {
  description = "ALB DNS name (useful before DNS has propagated)."
  value       = aws_lb.web.dns_name
}

output "target_group_arn" {
  description = "Target group ARN."
  value       = aws_lb_target_group.web.arn
}

output "data_volume_id" {
  description = "Persistent EBS volume id (docker data-root; survives instance replacement)."
  value       = aws_ebs_volume.data.id
}

output "ssm_parameter_prefix" {
  description = "SSM Parameter Store prefix holding the app's runtime env. Edit values here, then re-run the bootstrap to redeploy."
  value       = local.param_prefix
}

output "route53_record_fqdn" {
  description = "The DNS record created for the app (empty when create_dns_record = false)."
  value       = var.create_dns_record ? one(aws_route53_record.app[*].fqdn) : ""
}

output "bootstrap_log_path" {
  description = "On-host log of the bootstrap script (cloud-init also logs to /var/log/cloud-init-output.log)."
  value       = "/var/log/villa-web-bootstrap.log"
}

output "app_logs_command" {
  description = "How to tail the app's logs from the host (run over SSM Session Manager or SSH)."
  value       = "cd ${var.app_dir} && docker compose --env-file .env.production -f docker-compose.production.yml logs -f web"
}

output "ssm_session_command" {
  description = "Open an interactive shell on the host through SSM Session Manager (when enable_ssm_session = true)."
  value       = "aws ssm start-session --region ${var.aws_region} --target ${aws_instance.web.id}"
}
