# Deploying the web front end — the production profile

The front end (public site + staff/family/agent portals + BFF) is a Next.js
standalone SSR container. There are **two stacks, one application image**:

| | Demo / development | Production |
|---|---|---|
| Compose file | `docker-compose.yml` | `docker-compose.production.yml` |
| Env file | none (values inline) | `.env.production` (copy `.env.production.example`) |
| Demo quick-fill | **on** — `DEMO_QUICK_FILL=1` + a committed password | **off** — pinned `0`, no password anywhere |
| Public demo hints | on (persona chips) | off (build-time `NEXT_PUBLIC_DEMO_HINTS=0`) |
| Session cookies | not Secure (`SECURE_COOKIES=0`) | **Secure** (`SECURE_COOKIES=1` → the app must be served over HTTPS) |
| Backend | `stub-gateway` serving recorded fixtures | real gateway URLs from the env; a URL left empty keeps **that** surface on fixtures |
| Purpose | a developer or a demo box, with zero backend | a real deployment; never confusable with the demo by accident |

The demo file keeps its **NOT FOR PRODUCTION** banner and stays the development
stack. Do not delete it and do not "fix" it by adding production values.

The four production guarantees are pinned in `docker-compose.production.yml`, not
in the env file — an env file cannot switch them back on (verified; see §7).

---

## 1 · Build and run

```sh
cp .env.production.example .env.production     # then edit it — at minimum SITE_URL
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

- The image is built from `Dockerfile` (`npm ci` → `next build` → standalone runtime).
- The container listens on **3000**; `WEB_PORT` in `.env.production` chooses the host
  port. If a reverse proxy already owns 80/443, publish on 127.0.0.1 and proxy.
- `restart: unless-stopped`, `init: true`, a container `HEALTHCHECK` on `/`, and a
  named volume (`villa-web-data`) at `/app/.data` for the fixture-mode stores.
- **TLS is not optional**: `SECURE_COOKIES=1` means the sign-in doors set Secure
  cookies, so a deployment reached over plain HTTP cannot keep a session. Terminate
  TLS in a reverse proxy (the platform box's ingress, Caddy, nginx, the hosting
  provider's load balancer) and forward the original `Host`/`X-Forwarded-Proto`.
- To update: `git pull && docker compose --env-file .env.production -f
  docker-compose.production.yml up -d --build`. The volume survives, so recorded
  staff edits (catalogue, pricing, orders, bookings, payments) are kept.

## 2 · What the environment controls

Everything here is **server-side**. The BFF reads these per request; none of them
belong in `NEXT_PUBLIC_*` (those are inlined into public JavaScript at build time —
which is why the Dockerfile refuses a `NEXT_PUBLIC_DEMO_PASSWORD` build arg).

| Variable | What it changes | Production value |
|---|---|---|
| `SITE_URL` | canonical URLs, `sitemap.xml`, `robots.txt`, OpenGraph/Twitter cards, `FuneralHome` structured data (`lib/seo.ts`) | the real public origin, no trailing slash. **Required** — compose refuses to start without it |
| `WEB_PORT` | host port published for container port 3000 | `3000`, or whatever the host has free |
| `AUTH_BASE_URL` | identity-access: sign-in, session, refresh. **Unset = fixture personas** | the gateway URL, once identity-access answers |
| `COMMERCE_BASE_URL` | catalogue / pricing reads + order creation | gateway URL, once commerce answers |
| `PROPERTY_BASE_URL` | lots, reservations | gateway URL |
| `OPERATIONS_BASE_URL` | cases, stage moves, tasks | gateway URL |
| `BILLING_BASE_URL` | invoices, payment recording | gateway URL |
| `SCHEDULING_BASE_URL` | chapel schedule + bookings (anonymous visitors get 401 from the staff-only contract — the dialog degrades to *Request order*) | gateway URL |
| `DOCUMENTS_BASE_URL` | generated documents | gateway URL |
| `AUDIT_BASE_URL` | audit events | gateway URL |
| `SECURE_COOKIES` | `1` → Secure cookie attribute | `1` (pinned) |
| `DEMO_QUICK_FILL`, `DEMO_QUICK_FILL_PASSWORD` | the one-click persona password on the sign-in cards | `0` / empty (pinned) |
| `NEXT_PUBLIC_DEMO_HINTS` | build arg: persona chips + the persona list in the page payload | `0` (pinned) |
| `TENANT_DISPLAY_NAME` | the tenant name printed on app-generated documents (default `Villa Memoria`) | set it if the letterhead needs the registered name |
| `NEXT_TELEMETRY_DISABLED` | Next.js usage telemetry | `1` |
| `*_STORE_PATH` (`ORDERS_`, `CATALOG_`, `PRICING_`, `CHAPEL_`, `PAYMENTS_`, `MEMBERSHIP_`, `OPERATIONS_`, `PROVISIONAL_RECEIPTS_`) | where a fixture-mode journal is written | leave unset — the named volume is mounted at `/app/.data`, which is the default |
| `NEXT_PUBLIC_DEMO_PASSWORD` | **must never be set** — Next inlines it into public JS | the image build fails if it is |

One gateway base URL serves every service; the client adds the gateway's route
prefix (`ADR-004`): `${AUTH_BASE_URL}/identity/api/v1/auth/*`,
`${COMMERCE_BASE_URL}/orders/api/v1/orders`, … (the full list is in `.env.example`).

**A wrong URL is worse than an empty one.** Empty keeps a surface on its recorded
fixtures, honestly labelled. A URL that points at something that is not the service
turns those screens into upstream 502s.

## 3 · Verifying a deploy is healthy

```sh
docker compose --env-file .env.production -f docker-compose.production.yml ps   # State: running, (healthy)
docker compose --env-file .env.production -f docker-compose.production.yml logs -f web
curl -sS -o /dev/null -w '%{http_code}\n' https://<origin>/                     # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://<origin>/services             # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://<origin>/sitemap.xml          # 200, URLs on SITE_URL
curl -sSI https://<origin>/staff/dashboard | head -1                            # 307 (or 302) → /login
```

Then a real sign-in smoke test in a browser: `/login` **must not** show persona
chips or a "Demo account" hint, `https://<origin>/staff/dashboard` must render the
staff shell after signing in, and the session cookie must be `Secure; HttpOnly`.

A healthy deployment is not "no fixtures": a page serving recorded data is healthy
and labelled. Healthy means *no 5xx from the app itself* and no upstream 502 from a
half-configured service URL.

## 4 · What a staging deploy can and cannot show

Live data is possible **only** for services whose contracts are frozen in this repo
(`docs/08-delivery/contracts/`). Everything else is the recorded fixture store,
honest about it in the UI. The per-route truth is
`docs/08-delivery/notes/demo-web-route-coverage.md`; this is the deployment view:

| Surface | Env switch | Can go live now? |
|---|---|---|
| Sign-in / sessions | `AUTH_BASE_URL` | Yes — `jwt-claims-v1` frozen. Without it the fixture personas answer |
| Catalogue, orders, checkout | `COMMERCE_BASE_URL` | Yes — `order-*`/`payment-completed-v1` frozen. Catalogue *editing* is fixture-only (no write contract → 503) |
| Cases, stage moves, tasks | `OPERATIONS_BASE_URL` | Yes — `case-events-v1` frozen |
| Lots, reservations | `PROPERTY_BASE_URL` | Reads yes — `lot-events-v1` frozen. The purchase-application capture is fixture-only (no contract) |
| Invoices, payment recording | `BILLING_BASE_URL` | Yes — `billing-list-api-v1` frozen (a live payment's receipt waits on a documents-repository row) |
| Chapel schedule + bookings | `SCHEDULING_BASE_URL` | Yes — `booking-events-v1` frozen, staff-session only (a visitor gets 401 → *Request order*) |
| Documents | `DOCUMENTS_BASE_URL` | Yes — `documents-api-v1` frozen |
| Audit | `AUDIT_BASE_URL` | Yes — `audit-event-types-v1` frozen |
| CRM (enquiries, customers, leads, pipeline) | `CRM_BASE_URL` | **No** — no contract; live reads refuse with a named 503, so the switch stays off |
| HR | `HR_BASE_URL` | **No** — same, 503 |
| Family portal, agent portal, memorials, platform operator screens, commission | — | **No** — fixture-only by design; their live switches return `false`. They render recorded data, labelled |
| Reports, accounting, notifications, dispatch, work orders | — | **No** — screens carry their honest "waits on the platform" state |

**Read this before putting a staging URL in front of the client.** While
`AUTH_BASE_URL` is unset, sign-in is served by the fixture client
(`lib/api-client/fixture-auth.ts`): it accepts the recorded demo personas whose
password is in this repository (`lib/fixtures/auth/personas.json`, printed in
`README.md`). That is fine for a screening box that is not publicly reachable and
whose URL is shared deliberately — and it is **not** access control. Two rules:

1. A public, client-facing URL gets `AUTH_BASE_URL` pointing at identity-access.
2. Otherwise put HTTP basic-auth (or an IP allow-list) in the reverse proxy, and
   say so when sharing the link.

## 5 · Host-specific notes

### 5a · Platform box (beside the services)

- Point every `*_BASE_URL` at the gateway as the box reaches it — usually
  `http://gateway.internal` or `http://127.0.0.1:8080` — never the public name, so
  no traffic leaves the box's network for its own services.
- `WEB_PORT=3000` is fine when the front end is the only thing on the host;
  otherwise publish on `127.0.0.1:<port>` and let the ingress proxy it.
- Terminate TLS at the ingress (e.g. `/etc/nginx/sites-enabled` → `proxy_pass
  http://127.0.0.1:3000`, `proxy_set_header Host $host; proxy_set_header
  X-Forwarded-Proto $scheme;`). Point `SITE_URL` at the public name.
- The `.data` volume is local; that is where a fixture-mode surface keeps staff
  edits. Back it up with the host's normal volume backup if the box matters.

### 5b · Standalone staging host (no services on it)

- DNS: an `A`/`AAAA` record for the staging name → the host. TLS: `certbot
  --nginx -d staging.example.ph` (or the provider's managed certificate).
- The host needs outbound access **and** the gateway must allow the host's source
  IP: set every `*_BASE_URL` to `https://gateway.staging.example.ph` (whatever the
  platform exposes) and ask the platform team to allow-list this host.
- Anything the platform has not exposed yet stays empty → that surface is fixture
  mode. Do not invent a URL to "make the page look complete".
- `SITE_URL=https://staging.example.ph` — deliberately a staging origin, so
  `sitemap.xml` and the canonical tags do not claim the production domain.
- Keep `robots.txt` in mind: it allows the storefront and disallows `/staff`,
  `/client`, `/agent`, `/api`. If the staging box must not be indexed at all, block
  it at the proxy and/or DNS instead of editing `app/robots.ts`.

### 5c · Both

- The image needs no build-time secret and no `NEXT_PUBLIC_*` value beyond the
  demo-hint flag: one image artifact can be promoted between environments and the
  behaviour changes with the runtime env alone.
- `docker compose ... logs -f web` is the whole log surface (stdout).
- A container healthcheck (`/` returns 200) drives the `(healthy)` state; the
  compose `restart: unless-stopped` policy restarts a crashed process.

## 6 · What a real deployment still needs (not a blocker)

Values only the platform team can supply:

- The gateway's **internal and public base URLs**, and whether anonymous visitors
  may reach `AUTH_BASE_URL` (identity-access) from outside the platform network.
- An **allow-list entry** for the staging host's IP when the gateway is not public.
- Confirmation of the **`SITE_URL`** the client wants canonicalised (production
  domain vs staging), and who owns the TLS certificate.
- A decision on the app-generated documents' `TENANT_DISPLAY_NAME`.

Contracts that must exist before a screen reads live data (each is also listed in
`docs/08-delivery/open-items.md`):

- catalogue **write** API (the storefront edits are fixture-only today);
- crm-families (enquiries, customers, leads, pipeline, and the pipeline's writes);
- hr (employee/staff records — the live branch is a 501);
- purchase-application and membership-record writes (both 503 live today);
- preparation records, guarantee-instrument tracker, order administration,
  provisional receipts and commission: all fixture-only, each naming its own ask
  on screen;
- a family-portal contract (the family/agent portals and memorials are fixture-only
  by design, so no environment value turns them live).

Until those land, the front end is deployable and demonstrable — every screen
renders, and every screen that is not live says so in its own words.

## 7 · Verification performed (2026-09-19)

Measured on the production image (`villa-web:production`, built from this
repository's `Dockerfile` with `NEXT_PUBLIC_DEMO_HINTS=0`):

| Check | Result |
|---|---|
| `docker build` (warm base image, 20-core host) | success, 91 s and 116 s on two runs |
| Image size | 401 MB as `docker images` reports it (base `node:22-alpine` included); ≈100 MB exported/transferred |
| Container start → first HTTP 200 on `/` | 5.8 s (first run) and 3.2 s (warm run) from `docker run` to response; Next.js logged `Ready in 84 ms` |
| Container healthcheck | `healthy`, failing streak 0 — and `docker compose ps` reports `(healthy)` |
| Public routes (`/`, `/services`, `/plans`, `/products`, `/map`, `/gallery`, `/facilities`, `/memorials`, `/faq`, `/contact`, `/builder`, `/immediate-assistance`, `/cart`, `/checkout`) | all `200` |
| `SITE_URL` wiring | `/` carries `<link rel="canonical" href="https://staging.example.ph">`; `sitemap.xml` has 63 `<loc>` entries, all on that origin |
| Sign-in doors (`/login`, `/client/login`, `/agent/login`) | all `200`, **zero** occurrences of `Demo-Passw0rd!` or any `vm.demo` address in the response |
| Portal gating without a session (`/staff/*`, `/client/*`, `/agent/*`) | `307` → the matching sign-in door |
| Signed-in portal | sign-in → `200` with `redirectTo: /staff/dashboard`; `/staff/dashboard`, `/staff/cases`, `/staff/ops`, `/staff/property` all `200` (staff shell rendered) |
| Session cookies in this profile | `Secure; HttpOnly; SameSite=lax` on all three cookies |
| Demo quick-fill with the production profile | refused: the build pins the flag off, and a hostile env file cannot re-enable it (`docker compose config` still shows `DEMO_QUICK_FILL: "0"`, `DEMO_QUICK_FILL_PASSWORD: ""`, `SECURE_COOKIES: "1"`, `NEXT_PUBLIC_DEMO_HINTS: "0"`) |
| Fixture sign-in once `AUTH_BASE_URL` is set | refused: with `AUTH_BASE_URL=http://127.0.0.1:9` (nothing listening) the login BFF answers `502 {"error":"upstream unavailable"}` — the fixture personas are genuinely bypassed once a gateway is configured |
| `NEXT_PUBLIC_DEMO_PASSWORD` as a build arg | the image build **fails** with an explanatory error (Next would inline it into public JS), and no image is produced |
| Durable fixture-mode writes under the volume | a catalogue item created through the staff API (`201`) landed in `/app/.data/commerce-catalog.json` owned by `node` (uid 1000) and was still served after `docker compose restart web` |
| Demo stack (contrast run) | still boots: `docker compose up --build` serves `/` and `/login` on its host port, the persona chips and quick-fill password are present, and a sign-in goes THROUGH the stub gateway (`200`) |
| Repository checks at this commit | `npm run lint`, `npm run typecheck`, `npm test` (138 files / 1725 tests), `npm run build` all green |

Two deliberate limits of this verification, so nobody over-reads it:

- The signed-in portal was exercised on `http://127.0.0.1`, not through a real
  TLS proxy. No HTTPS terminator was stood up here; the cookie attributes were
  verified from the response headers, and a deployer should still confirm the
  `Secure` attribute in a browser on the real origin before sharing the URL.
- **Nothing was verified against a live gateway** — no service was running. Every
  `*_BASE_URL` was empty, so every surface correctly served its recorded fixtures;
  the one gateway-configured run used a dead address to prove the fixture path
  switches off.
