# villa-web — AWS shape A (EC2 + ALB + managed HTTPS)

Infrastructure-as-code for the repo's **production profile**
(`Dockerfile` + `docker-compose.production.yml` + `.env.production.example`)
on a single EC2 host fronted by a managed HTTPS ALB. Terraform, not CDK — see
the rationale at the top of [`versions.tf`](versions.tf).

The authoritative recipe is [`docs/08-delivery/deploying-web.md`](../../docs/08-delivery/deploying-web.md).
The step-by-step runbook (prerequisites, deploy, update, verify, rollback, logs,
and the ECS Fargate migration path) is
[`docs/08-delivery/aws-deploy.md`](../../docs/08-delivery/aws-deploy.md).

## What it creates

| Resource | Purpose |
|---|---|
| `aws_instance.web` (AL2023, `t3.medium`) | Runs the production compose stack; user-data installs Docker + the compose plugin, mounts the data volume, builds and starts the app. |
| `aws_ebs_volume.data` | Encrypted gp3 volume mounted at `/var/lib/docker`, so the compose named volume `villa-web-data` (`/app/.data`) survives instance replacement. |
| `aws_lb.web` + target group | Public ALB, health check on `/`. |
| `aws_acm_certificate` + validation | DNS-validated TLS certificate (unless `alb_certificate_arn` is supplied). |
| `aws_lb_listener.https` / `.http_redirect` | HTTPS termination; HTTP 301 → HTTPS. |
| `aws_route53_record.app` | Alias A record for `domain_name`. |
| `aws_security_group.alb` / `.instance` | ALB 80/443; app host reaches the container port only from the ALB; SSH only if configured. |
| `aws_iam_role` + instance profile + SSM core | Least-privilege read of the app's SSM parameters; optional SSM Session Manager. |
| `aws_ssm_parameter.*` | `SITE_URL` (always) + one per non-empty gateway URL. |

The package does **not** create a VPC: it deploys into the default VPC (or
`vpc_id`) and discovers subnets. See the runbook's prerequisites.

## Quick start

```sh
cd infra/aws
cp terraform.tfvars.example terraform.tfvars   # edit domain/zone
terraform init
terraform plan
terraform apply                                 # needs AWS credentials
```

Apply is gated on the captain providing AWS access; this PR ships the package,
not the deployed stack.
