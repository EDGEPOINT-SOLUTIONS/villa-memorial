# AGENTS.md — `infra/` (deployment infrastructure)

> Nested instructions. A harness that loads `AGENTS.md` files discovers this file when a
> session touches a file under `infra/`, and it is not loaded before then.
> The cross-cutting rules stay in the repository-root [`AGENTS.md`](../AGENTS.md). Read that first.

## AWS deployment — shape A (read before touching `infra/aws/`)

- **The deployable package is Terraform, and it consumes the production profile unchanged.**
  `infra/aws/` provisions the shape A host: one AL2023 EC2 instance running the production
  compose stack, an ALB terminating HTTPS (ACM, DNS-validated) with an HTTP→HTTPS redirect, a
  Route 53 alias record, security groups (ALB 80/443; the container port from the ALB only;
  SSH only when explicitly configured), a least-privilege instance role reading the app's SSM
  parameters, and a separate encrypted gp3 EBS volume mounted at Docker's data-root
  `/var/lib/docker` so the compose named volume `villa-web-data` (`/app/.data`) survives
  instance replacement. Terraform (not CDK) is deliberate — rationale at the top of
  `infra/aws/versions.tf`; the package never touches `docker-compose.yml` or the four pinned
  production guarantees. Runbook: `docs/08-delivery/aws-deploy.md` (prereqs, deploy/update/
  verify/rollback, logs, ECS Fargate migration path). Application recipe stays
  `docs/08-delivery/deploying-web.md`.
- **Apply is not run in this repo's CI or by an agent.** It is gated on AWS credentials for
  account `632296084403` (the Terraform `account_guard` refuses any other account). Structural
  validation without AWS is `terraform fmt -check -recursive`, `terraform init -backend=false`,
  `terraform validate`, and `shellcheck` on the `templatefile()`-rendered `user-data.sh.tftpl`.
  Runtime env flows SSM → `.env.production`; an empty/absent gateway parameter is the honest
  fixture default, never a fake URL.

