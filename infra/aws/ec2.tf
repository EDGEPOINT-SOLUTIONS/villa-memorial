# ============================================================================
# App host: Amazon Linux 2023, Docker + compose plugin via user-data, the repo
# cloned and built on the instance (no registry is published yet, and the
# production recipe is exactly `docker compose ... up -d --build`).
#
# A separate gp3 EBS volume is attached and mounted at Docker's data-root
# /var/lib/docker, so the compose named volume `villa-web-data` — the container's
# /app/.data — survives instance replacement. (docker-compose.production.yml is
# unchanged; the persistence is a host-volume policy, documented in the runbook.)
# ============================================================================

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = local.instance_subnet_id
  vpc_security_group_ids = [aws_security_group.instance.id]
  iam_instance_profile   = aws_iam_instance_profile.instance.name
  key_name               = var.key_name != "" ? var.key_name : null

  associate_public_ip_address = var.associate_public_ip

  # Rendered from user-data.sh.tftpl. Re-run it on the host to redeploy; it is
  # NOT re-run automatically when this text changes (see user_data_replace_on_change).
  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    region          = var.aws_region
    param_prefix    = local.param_prefix
    repo_url        = var.git_repo_url
    git_ref         = var.git_ref
    app_dir         = var.app_dir
    git_token_param = var.git_token_ssm_parameter
    web_port        = var.web_port
    compose_version = var.compose_version
  })

  # Do not churn a stateful host because the bootstrap text changed. A changed
  # user-data is applied to a running host with the runbook's re-run command.
  user_data_replace_on_change = false

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 1
  }

  tags = { Name = local.name }
}

# --- Persistent data volume -------------------------------------------------

resource "aws_ebs_volume" "data" {
  availability_zone = aws_instance.web.availability_zone
  size              = var.data_volume_size
  type              = "gp3"
  encrypted         = true

  tags = { Name = "${local.name}-data" }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.web.id
}
