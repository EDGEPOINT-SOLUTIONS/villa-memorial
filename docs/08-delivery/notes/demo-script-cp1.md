# Demo Script — CP-1 (v2, live mode on the dedicated profile)

> **v2, Fri Aug 29.** v1 was written for fixture mode on `npm run dev` while claiming to run
> on the dedicated profile. This version was rewritten by actually walking it, on the
> dedicated profile, against live services — every number below was observed, not predicted.
>
> What changed since v1: modules B, D and H are now live. Scenario H — a paid order creating
> a funeral case and a chapel booking — is visible in the UI for the first time. Several
> screens still read fixtures, and two of them now *contradict* the live data on screen; both
> are called out below as things to narrate, not hide.
>
> ### ⚠ The box was REDEPLOYED on the evening of Aug 29 — these three steps changed
>
> CP-1 carryover work (PR #44) is now live on `https://in-memoriam.edgepoint-ai.com`.
> Three steps below behave differently from how they are written:
>
> | Change | Effect on this script |
> |---|---|
> | Reserve button wired (#8) | Step 5 can reserve a lot **through the UI** instead of narrating that the API exists |
> | documents ⓡ built (#12) | Module J moves from fixture to live; a paid order now leaves an **official receipt** in the repository, viewable as a rendered artifact. The fixture repository's permits and certificates disappear — v1 cannot store uploads |
> | 15th container | `documents` joins the stack; the pre-demo `up -d` line below brings it up automatically |
>
> **Not yet re-walked in the UI end to end on the deployed box.** The three gates pass
> there, and the receipt + reserve form were checked over HTTPS, but nobody has walked the
> whole script on this build. Budget the dress rehearsal.
>
> The box also carries the residue of those gate runs — an extra order, invoice, receipt,
> case, booking and a reserved/sold lot, plus an inert "Isolation Test Tenant" row in
> tenancy-config. Use the pristine-data reset above before demoing.

---

## Pre-demo setup

```bash
./edge-gateway/tls/gen-dev-certs.sh
docker compose -f deploy/vm-dedicated/compose.yml --env-file deploy/vm-dedicated/.env up -d --build
```

15 containers: db · gateway · verifier · identity-access · tenancy-config · audit ·
catalog-pricing · commerce-ordering · finance-billing · accounting · property-gis ·
funeral-cases · scheduling-resources · documents · web. (16 on the deployed box, which
adds Caddy for TLS — and every compose command there needs BOTH -f files or Caddy is
treated as an orphan.)

Wait for seeding, then confirm the gates before anyone is in the room:

```bash
GW=http://localhost:8081 platform/tests/e2e.sh       # money path → GL → official receipt
GW=http://localhost:8081 platform/tests/e2e-ops.sh   # scenarios F and H
# optional, and it cleans up after itself — two tenants live through the gateway at once:
GW=http://localhost:8081 platform/tests/e2e-tenant.sh
```

**Reset to pristine data before demoing** — the ops gate reserves and sells a lot and creates
a case, which changes what step 5 and step 8 show. Drop the service databases; do **not**
`down -v`:

```bash
docker compose -f deploy/vm-dedicated/compose.yml --env-file deploy/vm-dedicated/.env \
  stop property-gis funeral-cases scheduling-resources finance-billing commerce-ordering documents
for db in property_gis funeral_cases scheduling_resources finance_billing commerce_ordering documents; do
  docker compose -f deploy/vm-dedicated/compose.yml --env-file deploy/vm-dedicated/.env \
    exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS $db;" -c "CREATE DATABASE $db;"
done
docker compose -f deploy/vm-dedicated/compose.yml --env-file deploy/vm-dedicated/.env start \
  property-gis funeral-cases scheduling-resources finance-billing commerce-ordering documents
```

> ⚠️ **Never `down -v` on the deployed box.** It deletes the `caddy_data` volume, which holds
> the Let's Encrypt certificate, and re-issuance counts against Let's Encrypt rate limits.
> On the deployed box every compose command also needs **both** `-f` files (base +
> `deploy/lightsail/compose.public.yml`), or Caddy is treated as an orphan.

Storefront and portal: `http://localhost:4000`. Gateway: `http://localhost:8081`.

### What is live vs fixture — know this before you are asked

| Live (real service, through the gateway) | Fixture (in-process demo data) |
|---|---|
| Login / sessions — identity-access | Staff directory (G) |
| Catalog + cart + checkout + order status (B) | Customers, Inquiries (A) |
| Property map (D) | |
| **Documents + generated receipts (J)** | |
| Cases board + case detail (H) | |
| **Billing & collections (E)** | |
| **Dashboard (I)** — aggregates the live clients | |
| GL, bookings — via API, no screen yet | |

---

## 1. Login & session

**Go to** `/login` → click **Ada Admin** (fills the email) → type the password → **Sign in**.

> On a deployed box the persona buttons fill the **email only**. The password is generated per
> deployment (`grep SEED_DEMO_PASSWORD deploy/vm-dedicated/.env` on the box) and is
> deliberately never baked into the page — it would ship admin credentials in public
> JavaScript. Locally, set `NEXT_PUBLIC_DEMO_PASSWORD` in `web/.env` to keep one-click sign-in.

**Say:** "RS256 JWTs issued by identity-access, verified at the edge gateway and again at every
service boundary. The session is an httpOnly cookie — the token never reaches browser JS."

**Verify:** lands on `/staff/dashboard`. The session card shows Ada Admin, admin@vm.demo, the
workspace UUID, and an expiry. Below it: *"Live mode: sessions issued by identity-access via
the edge gateway."*

## 2. RBAC-gated navigation

**Say:** "Nav adapts to the signed-in user's scopes, and the permissions card lists exactly
what this session holds. Nav gating is convenience — every service re-checks the scope itself,
so hiding a link is never the access control."

**Show:** the permissions card — 23 scopes for Ada. Sign in as **Sam Staff** later if anyone
wants to see fewer nav items.

## 3. Module B — storefront (LIVE)

**Go to** `/plans`. **Say:** "Eleven line items served by catalog-pricing."

**Do:** **Basic Package** → **View** → **Add to cart** → `/checkout`.
Fill: `Marites Santos` · `marites.santos@example.test` · `+639171234567` → **Place order**.

**Verify:** order status page — `ORD-2026-00001`, **PAID**, total **₱1,425.00**.

**Say — this is the point to make:** "The list price was ₱1,500; the store charged ₱1,425. The
client never sends a price. commerce-ordering re-prices every line from the active catalog at
checkout time, so the total is the store's, not the browser's."

## 4. Module H — the order became a case (LIVE, the money shot)

**Go to** `/staff/cases` — **without touching anything else.**

**Verify:** a fourth case has appeared: **CASE-2026-0004 · "Pending intake" · Inquiry ·
Unassigned · ORD-2026-00001 · Basic Package**.

**Say:** "Nobody created that. Paying for the order emitted `order.fulfilled`; funeral-cases
consumed it and opened the case with the inquiry stage's task template. It says *Pending
intake* because the order carries the purchaser, not the deceased — the checkout contract is
frozen and has no deceased field, so staff complete intake as a deliberate step rather than us
guessing."

**Do:** open **CASE-2026-0004** → show the stage pipeline (Inquiry → … → Completed) and
**Tasks (0/2 done)**.

**Say:** "Same event also reached finance-billing, which raised the invoice, and the case
creation went on to scheduling-resources, which booked a chapel." Show it — there is no
schedule screen yet:

```bash
TOKEN=$(curl -s -X POST http://localhost:8081/identity/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@vm.demo","password":"Demo-Passw0rd!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s http://localhost:8081/scheduling/api/v1/bookings -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8081/billing/api/v1/invoices/ORD-2026-00001 -H "Authorization: Bearer $TOKEN"
```

Expect `CASE-2026-0004 | Chapel A | 2026-08-30T09:00 → 17:00 | confirmed` and
`INV-2026-00001 | Marites Santos | 142500 | issued | 4 installments`.

**Say:** "One checkout, four services, no human in the loop: order → invoice → case → booking."

## 5. Module D — property (LIVE)

**Go to** `/staff/property`.

**Verify:** 12 lots across 3 sections; the chips read **available: 6 · reserved: 3 · sold: 2 ·
occupied: 1**. Filter to **available** → 6 rows.

**Say:** "Served by property-gis. Static grid, not a map — cut line #1, taken deliberately."

**Do:** click **A-001** → detail with price, area, owner unassigned.

**Be straight about the button:** "Reserve is not wired to the API yet. The transition itself
is real and enforced server-side — available → reserved → sold, with anything else rejected —
but today it is reachable by API, not by this button. That is issue #31."

Optional, if the room wants to see it:
```bash
curl -s -X POST http://localhost:8081/property/api/v1/lots/<id>/reserve \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"owner_name":"Juan Dela Cruz"}'
```

## 6. Module E — billing (LIVE)

**Go to** `/staff/billing`.

**Verify:** the invoice you created in step 3 is here — same number, same ₱1,425. The aging
summary and the outstanding total are computed from the same rows.

**Say:** "finance-billing raised this from the `order.fulfilled` event. Note what the service
does *not* store: 'overdue' and the aging bucket. Both are derived from the due date, because
overdue is a function of time — an invoice becomes overdue while nobody touches it. A
part-paid invoice stays *partial* even when late; its lateness shows in the bucket instead.
Those rules are frozen in `billing-list-api-v1.md` so every screen derives them identically."

## 7. Module G — staff directory (FIXTURE)

`/staff/hr` — 6 employees, 5 active, 1 on leave. Click **Elena Villanueva** for attendance and
leave. **Say:** "Fixture data; the HR service is unbuilt. The scopes are frozen now, so the
screen will not need reworking when it arrives."

## 8. Module J — documents (LIVE) — the receipt from step 3 is already here

`/staff/documents` — three seeded documents plus **the official receipt for the order you
placed in step 3**, which nobody created by hand. Click **View** on it: the rendered receipt
opens with the invoice number, the order number and ₱1,425 — the amount actually paid.

**Say:** "Paying the invoice emitted `payment.completed`. Two services consumed it: accounting
posted the journal entry you will see in a moment, and documents generated this receipt. One
payment, two consequences, no human in the loop."

**Narrate the gaps rather than waiting to be asked:**
- **The receipt is HTML, not PDF.** Printing is the browser's job in v1.
- **"Issued to: —"** because `payment.completed` carries no payer identity. Decided, not yet
  built: a new `payment.recorded` event carries the payer (issue #47).
- **One receipt per invoice, not per payment.** VM's counter issues one for every payment
  including each installment — same issue, same event, and it is the thing to build before
  VM takes real money.
- **Upload is disabled and the button says so.** There is no object store; the three seeded
  rows stand in for filed documents and honestly report 0 bytes, because the service is not
  storing a file it does not have.

If someone asks why the repository looks thinner than a real one: the fixture version showed
permits and death certificates the system could not actually produce. Those are gone on
purpose.

## 9. Module A — customers & inquiries (FIXTURE)

`/staff/customers` — 4 customers; search "Santos". `/staff/inquiries` — quick capture works but
is session-only, nothing persists.

## 10. Module I — dashboard (LIVE, aggregated)

`/staff/dashboard`, scroll to the summary tables.

**Verify:** every figure matches the screen it summarises — case counts equal the cases board,
lot counts equal the property grid, invoice count and outstanding equal the billing screen.

**Say:** "The reporting service is not built, so there is nothing to query for a
pre-aggregated summary. Rather than keep a separate set of demo numbers — which is exactly how
this dashboard once claimed six cases while the board showed four — it aggregates the same
clients the screens use. It cannot disagree with a screen, in any mode, because there is only
one source."

**Point at the em dashes:** "Collections this month and the activity counts read '—'. Those
need payment history and an orders list endpoint, neither of which exists. They are blank
rather than filled with a plausible number." 

**Say:** "Tables rather than charts — cut line #4."

## 11. Placeholders — say what they are

`/staff/schedule` and `/staff/audit` both render *"not wired yet"*. **Say:** "These exist so
navigation and permissions can be verified. The audit service is live on the backend — the
end-to-end gate writes and reads a tenant-scoped audit row — it just has no screen. Bookings
are the same: real service, no screen." (Issues #33, #30.)

## 12. Proof, not screens

**Say:** "Everything so far is the interface. Here is the system underneath." Run both gates
live if there is time, or show the recorded output:

```bash
GW=http://localhost:8081 platform/tests/e2e.sh
GW=http://localhost:8081 platform/tests/e2e-ops.sh
```

`e2e.sh` ends with a balanced trial balance — `Dr Cash 142500 c = Cr Revenue 142500 c` — and
then asserts the official receipt exists and renders the amount that was actually paid.
`e2e-ops.sh` ends with scenarios F and H green, including the checks that matter as much as
the happy path: double-reserve rejected, selling an unreserved lot rejected, unknown stage
rejected, unauthenticated access 401 at the edge, internal event inboxes unreachable from
outside.

If the room asks about multi-tenancy — and for a SaaS pitch they will — `e2e-tenant.sh` is the
answer worth showing: it provisions a second tenant, signs in as a **full administrator** of
it, and proves that administrator sees nothing of Villa Memoria's data across six services,
gets a 404 rather than a 403 on a record that exists, cannot mutate it, and cannot spoof its
way in with a tenant header. Then it removes the tenant again.

## 13. Known limitations handout

`docs/08-delivery/notes/known-limitations-cp1.md` (revised Aug 29). The honest headline:
**modules B, D, E, H, I and J are live; A and G are fixture-backed** — and no screen
contradicts another. Phase-2 backlog: #30–#42, plus #47 for per-payment receipts.

---

## Closing

**Say:** "CP-1 is: every module A–J has a working screen on the dedicated profile, and the
spine underneath is real — a customer buys, the store prices it, the money posts to the ledger,
the operation schedules itself across four services without anyone typing twice, and the
receipt for it writes itself. What is not real yet is written down per module rather than
left for you to discover."

---

## Contingency

| Symptom | Cause / fix |
|---|---|
| Login loops, never lands on the dashboard | `SECURE_COOKIES=1` over plain http — set it to `0` in `deploy/vm-dedicated/.env` |
| Every authenticated call 401s | The verifier has no key. `.env` needs `JWT_JWKS_URL=http://identity-access:3000/.well-known/jwks.json` and an EMPTY `JWT_PUBLIC_KEY` — the `.env.example` value is a VM-only path |
| "The catalog is unavailable" | Gateway route prefix missing from the request path. Every live path carries one: `/catalog/...`, `/orders/...`, `/property/...`, `/cases/...` |
| A filter returns everything | `proxy_pass` missing `$is_args$args` in the nginx template — the gateway drops the query string |
| Case does not appear after checkout | Outbox delivery takes a second or two; refresh. If it never appears, `docker compose logs funeral-cases` |
| Screens show stale/odd data | The gates mutate data. Use the **per-database reset** at the top of this script — NOT `down -v`, which deletes the `caddy_data` volume and with it the Let's Encrypt certificate |
| compose refuses to start: `required variable SECRET_KEY_BASE is missing` | An `.env` created before Aug 29. `config/master.key` is no longer in git, so Rails needs `secret_key_base` by env: `echo "SECRET_KEY_BASE=$(openssl rand -hex 64)" >> deploy/vm-dedicated/.env`. Nothing signs cookies with it, so any value works |
| Documents screen has only the three seeded rows | Correct after a reset — receipts appear as payments complete. Place an order and pay it (step 3) and one shows up within a second or two |
