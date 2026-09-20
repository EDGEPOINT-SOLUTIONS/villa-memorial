# ============================================================================
# App-host IAM: an instance role whose only standing permission is reading the
# app's own SSM parameters (plus the optional git token SecureString). SSM
# Session Manager access is attached separately and can be turned off.
# ============================================================================

data "aws_iam_policy_document" "instance_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "instance" {
  name_prefix        = "${local.name}-ec2-"
  description        = "Role for the ${local.name} app host"
  assume_role_policy = data.aws_iam_policy_document.instance_assume_role.json

  tags = { Name = "${local.name}-ec2" }
}

data "aws_iam_policy_document" "instance_parameters" {
  statement {
    sid = "ReadAppParameters"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = [
      "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter${local.param_prefix}/*",
    ]
  }

  dynamic "statement" {
    for_each = var.git_token_ssm_parameter != "" ? [1] : []
    content {
      sid       = "ReadGitTokenParameter"
      actions   = ["ssm:GetParameter"]
      resources = ["arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter${var.git_token_ssm_parameter}"]
    }
  }

  dynamic "statement" {
    for_each = var.git_token_ssm_parameter != "" ? [1] : []
    content {
      sid       = "DecryptSecureStringParameter"
      actions   = ["kms:Decrypt"]
      resources = ["*"]

      condition {
        test     = "StringEquals"
        variable = "kms:ViaService"
        values   = ["ssm.${var.aws_region}.amazonaws.com"]
      }
    }
  }
}

resource "aws_iam_role_policy" "instance_parameters" {
  name   = "read-app-parameters"
  role   = aws_iam_role.instance.id
  policy = data.aws_iam_policy_document.instance_parameters.json
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  count = var.enable_ssm_session ? 1 : 0

  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "instance" {
  name_prefix = "${local.name}-ec2-"
  role        = aws_iam_role.instance.name

  tags = { Name = "${local.name}-ec2" }
}
