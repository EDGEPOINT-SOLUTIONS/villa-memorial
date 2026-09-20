# Deploying the web front end to AWS — shape A (EC2 + ALB + managed HTTPS)

**Status: package complete, apply gated on AWS access.** This runbook and the
Terraform package under `infra/aws/` are the deliverable. Nothing has been
created in AWS yet: this machine has no AWS CLI, no Terraform state and no AWS
credentials. §8 lists exactly what the captain must provide before `terraform
apply`.

The application recipe is [`deploying-web.md`](deploying-web.md) — that file owns
the production profile (compose override, env switches, healthy-deploy checks,
what can go live). This file owns the **AWS infrastructure and its lifecycle**.

---

## 0 · What this deploys, and the two design choices

Shape A is the repo's production profile (`Dockerfile` +
`docker-compose.production.yml` + `.env.production`) running on **one Amazon
Linux 2023 EC2 host** behind an **Application Load Balancer** that terminates
**HTTPS** with an **ACM** certificate, fronted by a **Route 53** record.

Two choices were made explicitly:

| Choice | Decision | Why |
|---|---|---|
| IaC tool | **Terraform** (not CDK) | The stack is a small, fixed set of resources; HCL states them directly. CDK would add `aws-cdk-lib` to the Next.js project and pull the app's lint/typecheck/build into the infra change surface. Terraform also validates structurally (`fmt`/`validate`) with no AWS account — the gate this task ships on. The repo's `aws-cdk` skill is a construct-authoring guide, not evidence that CDK fits *this* repo. Rationale lives at the top of `infra/aws/versions.tf`. |
| App delivery | **Clone the repo and build on the host** (`docker compose … up -d --build`) | The image is **not published to a registry** (no ECR/CI in the repo), and the production recipe is literally `git pull && docker compose … up -d --build`. Building on the host keeps one artifact path and matches `deploying-web.md` §1. Moving to a registry is exactly the ECS path in §9. |
| Persistence | **Separate encrypted gp3 EBS volume mounted at Docker's data-root `/var/lib/docker`** | The compose named volume `villa-web-data` (container `/app/.data`) lives under the data-root, so staff edits in fixture-mode stores survive container restarts **and** instance replacement — with `docker-compose.production.yml` unchanged. A root-volume-only policy would lose the volume on instance replacement. |

The package never starts, edits or references the demo stack
(`docker-compose.yml`); `deploying-web.md` §5 and the four pinned production
guarantees are untouched.

The container port is still published on the host by
`docker-compose.production.yml` (all interfaces). The **instance security group
is the boundary** that admits it only from the ALB — never widen that ingress
rule to the internet.

### Files

```
infra/aws/
├── README.md                     # what the module creates + quick start
├── versions.tf                   # terraform/provider constraints + why Terraform
├── variables.tf                  # every account/region/domain/app input
├── terraform.tfvars.example      # copy to terraform.tfvars (gitignored)
├── main.tf                       # provider, caller identity, account guard
├── locals.tf                     # names, network + certificate resolution
├── network.tf                    # default VPC + subnet discovery
├── security-groups.tf            # ALB 80/443 · host port from ALB only · optional SSH
├── iam.tf                        # instance role, least-privilege SSM read, SSM core
├── ssm.tf                        # SITE_URL + one param per non-empty gateway URL
├── ec2.tf                        # AL2023 host + persistent gp3 data volume
├── user-data.sh.tftpl            # host bootstrap (Docker, volume, env, clone, compose up)
├── acm.tf                        # ACM certificate + DNS validation
├── alb.tf                        # ALB, target group, HTTPS + HTTP→HTTPS listeners
├── route53.tf                    # A (alias) record
├── outputs.tf                    # URL, instance id, volume, SSM prefix, log commands
└── .gitignore                    # state, provider cache, real tfvars
```

---

## 1 · Prerequisites

- **AWS account 632296084403** and credentials that can create EC2, EBS, ELB,
  ACM, Route 53, IAM, SSM and security-group resources in the chosen region.
  Terraform reads credentials the standard way (`AWS_PROFILE`,
  `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, or SSO) plus `AWS_REGION` if you
  do not set `aws_region`.
- **Terraform ≥ 1.5** on the machine that applies (`tofu` works too).
- **A Route 53 hosted zone** for the target domain, in the same account.
- **Region chosen** (`ap-southeast-1` is the default; the ALB and its ACM
  certificate must be in the same region).
- **A VPC with ≥ 2 subnets in different AZs.** The defaults use the account's
  default VPC and discover its subnets; pass `vpc_id`/`subnet_ids` for anything
  else.
- **Outbound internet** from the host for `dnf`, GitHub and the Docker image
  build. The default (public subnet + public IP) provides it. For a private
  subnet, set `subnet_ids` and `associate_public_ip = false` and provide NAT.
- **Domain and hosted zone details** — still pending (§8). Keep them in
  `terraform.tfvars`;
  `terraform.tfvars` is gitignored and must never be committed.
- Optional: a **GitHub token in SSM** if the repo is private (§3, step 4).

Sanity-check credentials before planning:

```sh
aws sts get-caller-identity        # must show account 632296084403
```

---

## 2 · State (read this before the first apply)

The module ships **without a backend** — the first `terraform init` writes local
`terraform.tfstate` in `infra/aws/` (gitignored). That is fine for a single
operator doing the first deploy, but state is the source of truth for the
resources: keep it safe and, for team use, move it to S3 + DynamoDB locking:

```hcl
# add to versions.tf once the bucket/table exist
backend "s3" {
  bucket         = "villa-web-tfstate-632296084403"
  key            = "shape-a/terraform.tfstate"
  region         = "ap-southeast-1"
  dynamodb_table = "villa-web-tfstate-lock"
  encrypt        = true
}
```

`terraform init -migrate-state` moves existing local state. A `.terraform.lock.hcl`
is generated on first init; commit it after the first successful init so provider
versions are pinned (run `terraform providers lock -platform=linux_amd64
-platform=darwin_arm64` if your team is mixed-OS).

The repo deliberately does **not** commit a lock file produced during this
package's structural validation, because the applying platform may differ — see
§7.

---

## 3 · One-time setup + first deploy

```sh
cd infra/aws
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars            # set domain_name + zone; review instance_type
terraform init
terraform plan            # review; expect ~15 resources to add
terraform apply
```

`terraform apply` performs, in dependency order (reviewed in §7):

1. Read the caller identity and **fail fast if it is not account 632296084403**
   (`terraform_data.account_guard`).
2. Discover the VPC/subnets; run the guards (≥2 subnets; certificate config
   coherent).
3. Create security groups, the instance role + policy + profile.
4. Create the SSM parameters (`SITE_URL` + non-empty gateway URLs).
5. Create the **ACM certificate**, write its DNS validation records and wait for
   validation (`aws_acm_certificate_validation`).
6. Create the EC2 instance (which starts its user-data immediately) and, in
   parallel, the **EBS data volume** and its attachment. The user-data waits up
   to 5 minutes for that volume before mounting it, so the race is safe.
7. Create the ALB, target group, the two listeners and the target-group
   attachment; create the Route 53 A record.

The host's user-data then:
mounts the data volume at `/var/lib/docker` → creates 2 GiB swap → installs
Docker + the Compose plugin → reads SSM → writes `.env.production` → clones the
repo at `git_ref` → `docker compose --env-file .env.production -f
docker-compose.production.yml up -d --build`.

First boot builds the Next.js image on the host and takes several minutes
(`deploying-web.md` §7 measured ~90–120 s for the build on a 20-core host; a
`t3.medium` is slower). A 2 GiB swap file is created because `next build` is
memory-hungry; if the build still OOMs, temporarily raise `instance_type`
(the runbook's rollback path covers reversing a resize).

### Private repository

If `github.com/EDGEPOINT-SOLUTIONS/villa-memorial` is private, create a
`SecureString` parameter once and name it in `terraform.tfvars`:

```sh
aws ssm put-parameter --region ap-southeast-1 \
  --name /villa-web/github-token --type SecureString \
  --value 'github_pat_…'
```

```hcl
git_token_ssm_parameter = "/villa-web/github-token"
```

The **host** reads it with its instance role (the `ReadGitTokenParameter` +
`DecryptSecureStringParameter` statements in `iam.tf`); the token never enters
Terraform state or user-data. Leave it empty for an anonymous clone.

### Keep the staging box out of search engines

`SITE_URL` is a staging origin, so canonicals and `sitemap.xml` stay on it. To
stop indexing entirely, restrict `allowed_ingress_cidrs` to the office range
(or add ALB auth) rather than editing `app/robots.ts` — `deploying-web.md` §5b.

---

## 4 · Update / redeploy

The app is built on the host, so a redeploy is: point at the new ref, pull,
rebuild.

**Preferred (tracked in Terraform):**

```sh
cd infra/aws
$EDITOR terraform.tfvars      # e.g. git_ref = "v1.2.3" or a new commit
terraform apply               # the instance is not replaced (user_data_replace_on_change = false)
```

Then re-run the bootstrap on the host (over SSM or SSH, §5):

```sh
sudo /var/lib/cloud/instance/user-data.txt     # re-runs the rendered bootstrap
```

Because the bootstrap re-fetches `git_ref`, rebuilds and recreates only changed
containers, the volume (and the fixture stores) survives.

**Fast path (host only, no Terraform):**

```sh
cd /opt/villa-web/app
sudo git fetch --depth 1 origin <ref>
sudo git checkout --force FETCH_HEAD
sudo docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

**Change a runtime value** (a gateway URL, `SITE_URL`, tenant name): edit the SSM
parameter, then re-run the bootstrap (it rewrites `.env.production` and recreates
the container):

```sh
aws ssm put-parameter --region ap-southeast-1 --overwrite \
  --name /villa-web/staging/auth_base_url --type String --value 'https://gateway.example.ph'
sudo /var/lib/cloud/instance/user-data.txt
```

> A changed `user_data` alone does **not** re-run on a live instance
> (`user_data_replace_on_change = false`, so a stateful host is never churned by
> a text edit). Re-run it explicitly, or `terraform apply -replace=aws_instance.web`
> if a fresh host is acceptable (the data volume reattaches).

---

## 5 · Verify a deployment is healthy

From outside (no AWS session needed), the four checks in `deploying-web.md` §3:

```sh
ORIGIN=https://staging.example.ph

curl -sS -o /dev/null -w '%{http_code}\n' "$ORIGIN/"               # 200
curl -sS -o /dev/null -w '%{http_code}\n' "$ORIGIN/services"       # 200
curl -sS -o /dev/null -w '%{http_code}\n' "$ORIGIN/sitemap.xml"    # 200
curl -sSI "$ORIGIN/staff/dashboard" | head -1                      # 307 (or 302) → /login
curl -sS "$ORIGIN/sitemap.xml" | grep -o '<loc>[^<]*' | head -1     # must be on SITE_URL
```

`https://<origin>/staff/dashboard` (or `/staff/dashboard`) redirecting to
`/login` is the correct unauthenticated response, not a failure.

On the host (open a shell first — §6), the container state:

```sh
cd /opt/villa-web/app
sudo docker compose --env-file .env.production -f docker-compose.production.yml ps
# web  …  Up … (healthy)
```

Then the **sign-in smoke test** in a browser (`deploying-web.md` §3):

1. Open `$ORIGIN/login`. It must show **no** persona chips and **no**
   "Demo account" hint (the image pins `NEXT_PUBLIC_DEMO_HINTS=0`).
2. Sign in. `/staff/dashboard` renders the staff shell.
3. In devtools → Application → Cookies, the session cookies are
   **`Secure; HttpOnly; SameSite=lax`**.

Finally, confirm the two honest defaults:

```sh
# A gateway URL left empty keeps that surface on fixtures (healthy, labelled).
# A gateway URL set to something that is not the service turns screens into 502s.
sudo grep -c 'BASE_URL' /opt/villa-web/app/.env.production    # only the configured ones
```

A healthy deployment is *not* "no fixtures": a page serving recorded data is
healthy and labelled. Healthy means **no 5xx from the app** and no upstream 502
from a half-configured service URL.

---

## 6 · Logs and host access

The app's log surface is stdout, collected by Docker. Access the host through
**SSM Session Manager** (attached by default, `enable_ssm_session = true`) — no
SSH port and no key needed:

```sh
aws ssm start-session --region ap-southeast-1 --target <instance_id>   # from `terraform output`
```

Then:

```sh
# App logs (stdout/stderr of the container)
cd /opt/villa-web/app
sudo docker compose --env-file .env.production -f docker-compose.production.yml logs -f --tail=200 web

# Bootstrap log (volume mount, env materialisation, clone, compose up)
sudo tail -f /var/log/villa-web-bootstrap.log
sudo tail -f /var/log/cloud-init-output.log

# Container health and recent events
sudo docker inspect --format '{{.State.Health.Status}}' "$(sudo docker compose -f /opt/villa-web/app/docker-compose.production.yml ps -q web)"
```

If you set `key_name` **and** `ssh_cidr`, SSH is also opened from that CIDR.

**ALB access logs are off by default** (they need an S3 bucket; not created here
to keep the package minimal). ALB/error metrics are in **CloudWatch** under the
`AWS/ApplicationELB` namespace (`TargetResponseTime`, `HTTPCode_ELB_5XX`). To turn
on access logs later, add an S3 bucket + `access_logs {}` block to
`aws_lb.web` and `terraform apply`.

`terraform output` prints the exact log commands:

```sh
terraform output app_logs_command
terraform output ssm_session_command
```

---

## 7 · Structural validation performed (no AWS account)

Every check below ran against the committed package; the commands and their
results are the evidence for this PR.

```sh
cd infra/aws
terraform fmt -check -recursive          # clean
terraform init -backend=false            # aws provider ~> 5.0 resolved
terraform validate                       # Success! The configuration is valid.
```

The user-data template was rendered with `templatefile()` into a throwaway
module and linted:

```sh
terraform output -raw ud > rendered-user-data.sh
shellcheck -s bash rendered-user-data.sh # clean
```

**The apply order was reviewed by hand** (dependencies are explicit in HCL, and
no `depends_on` is needed):

- `data.aws_caller_identity` → `terraform_data.account_guard` (plan/apply fails on
  a wrong account before any resource).
- `data.aws_vpc`/`data.aws_subnets` → security groups, ALB, instance (via
  `local.vpc_id` / `local.alb_subnet_ids`).
- `aws_ssm_parameter.*` → host user-data at boot (the instance does not depend on
  the parameters in Terraform; it retries/reads at boot, so a missing parameter
  fails the bootstrap loudly and is a re-run away from fixing).
- `aws_acm_certificate` → validation records → `aws_acm_certificate_validation`
  → `local.certificate_arn` → `aws_lb_listener.https` (the listener is never
  created with an unvalidated certificate).
- `aws_instance` → `aws_ebs_volume` (same AZ) → `aws_volume_attachment`; the
  user-data waits for the volume, so attachment order is not a race.
- `aws_lb` → target group → attachment; `aws_lb` → listeners; `aws_route53_record`
  depends on `aws_lb.web` for the alias target.

**What was *not* run:** `terraform plan`/`apply`. Both read live AWS data
(caller identity, VPC/subnets, AMI, Route 53 zone) and therefore require
credentials. They are gated on §8.

---

## 8 · What the captain must provide to apply

The package is ready; the apply is blocked only on access and three choices.

1. **AWS credentials** for account `632296084403` with permission to create the
   resources in §3 (or a role to assume), plus the region to use. The account id
   is already the documented default; the guard refuses a different account.
2. **The target domain and its Route 53 hosted zone** (zone id or name). Still
   pending per the captain's note.
3. **A decision on reachability**: a public staging URL (`allowed_ingress_cidrs =
   ["0.0.0.0/0"]`) or restricted to an office/VPN range. While `AUTH_BASE_URL` is
   unset, sign-in is served by the fixture personas — fine for a non-public box,
   and **not access control** (`deploying-web.md` §4).
4. **Whether the repository is private.** If so, either confirm a token in SSM
   (§3) or supply an alternative (a deploy key baked into `git_repo_url`, or a
   prebuilt image — which is the §9 path).
5. **The gateway base URLs** for any service that is live. All can be left empty
   (the honest fixture default); none is required to demonstrate the site.
6. **The `SITE_URL` origin** they want canonicalised (production vs staging).

Once those are in, the exact command is:

```sh
cd infra/aws && terraform init && terraform apply
```

---

## 9 · Rollback

**Application rollback (wrong build shipped):** point at the last good ref and
re-run the bootstrap. The data volume is untouched.

```sh
cd /opt/villa-web/app
sudo git fetch --depth 1 origin <last-good-tag>
sudo git checkout --force FETCH_HEAD
sudo docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Or in Terraform: set `git_ref` to the last good tag, `terraform apply`, re-run
the bootstrap (§4). Because `user_data_replace_on_change = false`, this never
replaces the host.

**Runtime-env rollback:** restore the SSM parameter and re-run the bootstrap.

**Infrastructure rollback:** `terraform plan` what changed, then revert the HCL
and `terraform apply`; for a broken ALB/ACM/DNS change, `terraform apply
-target=…` the previous configuration. To tear the whole stack down
(staging only), `terraform destroy` — the EBS volume has
`delete_on_termination` only for the root disk, so `terraform destroy` **does**
destroy `aws_ebs_volume.data`; take a snapshot first if the fixture stores
matter:

```sh
aws ec2 create-snapshot --region ap-southeast-1 --volume-id <data_volume_id> \
  --description "villa-web fixture stores before destroy"
```

**Recovering the host:** the instance is disposable; the volume is not. If the
host is lost, `terraform apply` creates a new one and reattaches the same volume
(same AZ); the bootstrap remounts it and Docker finds `villa-web-data`.

---

## 10 · Migration path to ECS Fargate (once the app is stateless)

The AWS shape was deliberately split so TLS/DNS/networking are reusable. The
migration replaces **only** the compute tier; the ALB, ACM certificate, Route 53
record and ALB security group stay.

**Step 0 — make the app stateless.** Today `/app/.data` holds fixture-mode
journals. "Stateless" means every remaining store is backed by a real service
(the contracts in `deploying-web.md` §4/§6) or the last fixture-mode writer is
gone. Until then the EBS volume is genuinely needed.

**Step 1 — publish the image.** Build the same `Dockerfile` in CI and push to
ECR; the image is already environment-agnostic (no build-time secret, one
`NEXT_PUBLIC_*` flag pinned to 0 — `deploying-web.md` §5c). Replace the host's
`--build` with `docker pull <ecr-repo>:<tag>`.

**Step 2 — move the env into the task definition.** The SSM parameters the host
reads become ECS task-definition `secrets` (SSM) and `environment` entries; the
values are identical.

**Step 3 — add compute and retarget the ALB.** New `target_type = "ip"` target
group; ECS cluster + task definition (256/512 CPU/mem, port 3000, container
health check `/`) + service with ≥ 2 tasks in private subnets and NAT; then
change `aws_lb_listener.https` to forward at the new target group. Nothing about
the certificate, redirect listener or DNS record changes.

**Step 4 — the `/app/.data` decision.** If any fixture store remains, mount EFS
(`aws_efs_file_system` + mount targets in the task's subnets) at `/app/.data` and
keep the named-volume semantics; otherwise drop the mount and the volume. The
compose named volume does not exist on Fargate, so this is the one place the
container definition diverges from `docker-compose.production.yml`.

Because the image and the env switch set are unchanged, a staging cutover can run
both tiers behind the same ALB (weighted target groups) before retiring the EC2
host and `aws_ebs_volume.data`.

---

## 11 · Related documents

- [`deploying-web.md`](deploying-web.md) — the production profile, env switches,
  healthy-deploy checks, what can go live, the platform asks.
- [`notes/demo-web-route-coverage.md`](notes/demo-web-route-coverage.md) — the
  per-route state a deploy actually serves.
- [`open-items.md`](open-items.md) — what is still open with the platform/client.
- [`infra/aws/README.md`](../../infra/aws/README.md) — the module's shape at a
  glance.
