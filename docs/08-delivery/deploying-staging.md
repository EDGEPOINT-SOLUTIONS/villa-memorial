# Deploying staging v0.1 — KEB-M0-10

M0 demo target: staging running behind SSL with the reference tenant (`villa`) on
the bare domain, seeded sandbox data, fake payment adapter.

## One-time setup

Infrastructure values live in **`config/deploy.staging.yml`** (gitignored — copy it
from `config/deploy.staging.example.yml`): server hosts, the public staging hostname,
registry server/username. Secrets stay out of git too — export them in your shell
(or CI); `.kamal/secrets` passes them through to the containers:

| Variable | Meaning |
|---|---|
| `KAMAL_REGISTRY_PASSWORD` | registry access token |
| `DB_PASSWORD` = `POSTGRES_PASSWORD` | Postgres password (must match each other) |
| `RAILS_MASTER_KEY` | resolved automatically from `config/master.key` |

DNS first: point the staging hostname (A/AAAA record) at the server. Because tenancy
resolves by subdomain, one cert + one deployment serve all tenants (`villa.<stage-host>`
and the bare domain → default tenant).

## First deploy

```sh
bin/kamal accessory boot db -d staging   # start PostGIS container, creates in_memoriam_production
bin/kamal deploy -d staging              # build, push, boot web + proxy
bin/kamal app exec --reuse -d staging "bin/rails db:prepare"
bin/kamal app exec --reuse -d staging "bin/rails runner TenantSeeder.call"  # demo seeds (KEB-M0-06)
```

Verify: `https://<stage-host>` renders the villa public site; place a sandbox order via
the API (see `contracts/order-payment-api-v1.md`); confirm it appears on staff orders.

## Day-2 commands

```sh
bin/kamal deploy -d staging    # subsequent releases
bin/kamal logs -f -d staging   # tail app logs
bin/kamal console -d staging   # remote rails console
```

## Notes & guardrails

- M0 runs Solid Queue inside Puma (`SOLID_QUEUE_IN_PUMA=true`). Split a dedicated job
  host when web traffic or queue depth justifies it.
- The payment adapter is the deterministic **fake** in staging. Never configure a real
  gateway against this environment without an M1 webhook contract addendum.
- `config.force_ssl` / `config.assume_ssl` must be enabled in production.rb once the
  SSL proxy is live (commented out at present — flip them in the same PR that points
  real DNS).
