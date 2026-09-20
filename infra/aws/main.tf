# ============================================================================
# Provider data sources, the account guard, and shared locals.
# ============================================================================

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# Fail fast (before anything is created) if the credentials in play are not the
# account this package is meant for. Keeps the IAM ARNs below honest.
resource "terraform_data" "account_guard" {
  lifecycle {
    precondition {
      condition     = data.aws_caller_identity.current.account_id == var.aws_account_id
      error_message = "Refusing to plan/apply: the caller account (${data.aws_caller_identity.current.account_id}) does not match aws_account_id (${var.aws_account_id}). Re-authenticate or pass the right -var."
    }
  }
}
