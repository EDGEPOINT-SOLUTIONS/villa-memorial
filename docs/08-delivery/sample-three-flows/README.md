# The three-inquiry demo — the clean start and the flows it proves

Captain, 2026-10-02: *"remove all the sample datas we have today, I only want a sample like
this: There will be one person who will ask about the services … another about a plan …
another about a lot. Now I want to see how these are all processed in the admin, if the
automation and flow … is really fluid and smooth and not confusing."*

This record does two things: it lists the demo records removed across the app (the office's
reference data is kept), and it walks the three real inquiries through the admin exactly as
a visitor's submission reaches it, naming where each record appears, what the office can do
to it, where it goes next, and every dead end the walk hit.

## 1 · What was removed (clean start, extended)

The agent and family portals were already clean (commit `b953e1f`). This change extends the
same standard to the rest of the demo. The fixtures now carry **no recorded demo person or
transaction**; the office's reference data is untouched.

| Fixture | Removed | Kept |
|---|---|---|
| `crm/inquiries.json` | the 3 recorded front-desk enquiries | the source vocabulary |
| `crm/customers.json` | 5 customers + 2 families | the tenant id and shape |
| `crm/lead-records.json` | 3 demo leads (the Sales pipeline) | the pipeline stages |
| `operations/cases.json` | 7 demo funeral cases | the case/task shape contract |
| `operations/dispatch.json` | 5 recorded trips | the fleet + drivers |
| `operations/preparation-records.json` | 4 embalming records | the four-step vocabulary |
| `operations/guarantee-instruments.json` | 2 tracked cases | the instrument vocabulary |
| `scheduling/bookings.json` | 4 chapel bookings | the booking contract |
| `scheduling/burials.json` | 3 recorded burials | the calendar vocabulary |
| `property/lot-lifecycle.json` | transfers · interments · exhumations · papers | the lot records themselves |
| `property/purchase-applications.json` | 2 captured applications | the lots |
| `documents/documents.json` | 6 documents | the repository shape |
| `commerce/orders.json` | 5 demo orders | the order/payment envelope |
| `commerce/membership-applications.json` | 2 plan applications | the plan sheet figures |
| `commerce/inventory.json` | 13 items + 24 movements | the catalogue the prices resolve from |
| `finance/invoices.json` | 8 invoices | the reader |
| `finance/accounting.json` | 26 journal entries | the chart of accounts |
| `lifecycle/engagements.json` *(new on main, `b2dafc9`)* | 12 engagements + 28 payments | the office's notice templates |

Every affected screen renders its honest empty state; the fixture-contract suites pin the
empty seed and the content-bearing page suites keep their coverage through test-only copies
under `tests/fixtures/`.

## 2 · The three records, made the way a visitor makes them

| # | Reference | The ask | The real path | Contact detail |
|---|---|---|---|---|
| 1 | `INQ-2026-00001` | Service quote — **Retrieval** (`SRV-RETRIEVAL`, needs pricing) | public `/services` → **Add to Quote** → `/quote` → *Send this quote request* (no login) | Sample Inquiry One — Service Quote · 0917 000 0001 · sample.service@example.com |
| 2 | `INQ-2026-00002` | **Silver 1 plan — Monthly** (₱1,000 / month) | `/plans` → **Ask about this plan** → `/client/ask?kind=plan…` → *Send inquiry* (family account gate) | Cory Customer · customer@vm.demo · **no phone** |
| 3 | `INQ-2026-00003` | **Lot A-001** (Section A · Block 1 · 2.5 sqm · ₱1,920 / month) | `/lots` → **Ask about this lot** → `/client/ask?kind=lot…` → *Send inquiry* (family account gate) | Cory Customer · customer@vm.demo · **no phone** |

All three are recorded in the one durable journal the office board and the family portal
read (`lib/api-client/inquiry-store.ts`), so a restart does not lose them and the two
surfaces cannot disagree.

## 3 · The walk — what actually happens

### Where each record first appears

- **Office → Inquiries** (`/staff/inquiries`, Messages & inquiries). All three arrive at
  the top, newest first, with the structured line (SKU · figure · "Needs pricing"), the
  family's own note, source `Website`, Assigned `Unassigned`, status `new`. KPIs read
  **3 Inquiries · 3 New · 0 Converted · 0 Sent to case**.
- **Family → Your inquiries** (`/client/inquiries`). The plan and lot asks appear for the
  signed-in account ("Two inquiries are with the office"); the public service quote belongs
  to no account and correctly does not.

### What the office can do to a record

- **Mark contacted** — New → Contacted, in place. Works for all three.
- **Convert to prospect** — opens a dialog (what they're considering · assign to an agent ·
  a note), then records a Prospect on the shared agent journal and marks the enquiry
  `converted`. A **Send to case** button appears on the row once it is converted.
- **Send to case** — carries the enquiry into a case stamped with the enquiry reference
  (`inquiry_reference`); the row then links to the case.

### Where they went

| # | Actions taken | Result |
|---|---|---|
| 1 | Mark contacted → Convert to prospect (assign Alex Agent) → Mark converted (Sold) → Send to case → record a **Plan membership** outcome | `INQ-2026-00001` Converted; a Prospect ("Contacted" → "Sold"); case `CASE-2026-0001` opened; lifecycle record `eng-3782aecc…` on `/staff/members` |
| 2 | Convert to prospect attempted | **Blocked** — "Enter the phone number — it is how the office reaches them." |
| 3 | Mark contacted → Convert attempted | **Blocked** by the same missing-phone rule |

The office's Prospect appears in the **agent portal** the moment it is assigned
(`/agent/prospects`: "Assigned to you by the office"), so the office and agent reads agree.
The **Clients & records** registers (`/staff/members`, `/staff/services`, `/staff/lots`,
`/staff/products`) and the shared record page `/staff/lifecycle/<id>` carry the outcome.

## 4 · Findings — the flow is not yet smooth

These are recorded honestly, not fixed: they feed the separate flow audit.

1. **A family plan/lot enquiry cannot become a prospect.** The family gate records only the
   account's display name and email (`familyAskInquiryInput` passes `phone: ""`), but
   `Convert to prospect` requires a phone. The office has no way to add one from the board,
   so two of the captain's three records hit a hard dead end. The public service quote works
   only because its form collects a phone.
2. **"Send to case" appears only after "Converted".** You must turn an enquiry into a
   prospect before the board offers to open a case, which reads backwards — a case is the
   arrangement, not the sale.
3. **The case the office just opened cannot be opened.** The row links to
   `/staff/cases/<id>`, but the case detail page answers **"Case not found"**: `getCase()`
   checks only the recorded seed and never folds the durable store the created case lives in
   (`lib/api-client/operations.ts`). The list shows the case; the detail 404s.
4. **Two records tell the same story, twice.** The office **Prospects** board and the
   **Sales pipeline** (`/staff/pipeline`, Relationships) read different files. A worked
   enquiry appears on Prospects and never on the Sales pipeline, which still says "No lead
   records yet". The pipeline is not in the left nav either — it is reached from
   `/staff/agents`.
5. **"Converted" means two things.** On the enquiry it means "became a prospect"; on the
   prospect it means "became a client" (the pipeline stage behind it is `Sold`). The same
   word on two adjacent screens for two different states.
6. **A service outcome cannot be recorded.** On `/staff/lifecycle/new`, the **Service** tab
   renders no *First due date* field (a service is one-time), but the intake still demands
   one, so a service outcome fails with "Enter the first due date." The plan/lot/product
   tabs, which render the field, save.
7. **Smaller warts.** A converted prospect's `Possible value` reads **₱0.00** because the
   service line is "Needs pricing"; a case opened from an enquiry is born with the deceased
   **"Pending intake"** and unassigned; the enquiry's assignee stays `Unassigned` even after
   the office assigns the prospect to an agent.

## 5 · Evidence

`shots/before/` — the Inquiries and Prospects lists with the recorded demo data (the old
`INQ-2026-00042…` rows), at 1440×900 and 390×844.
`shots/after/` — the same two lists cleaned and holding the three records, their processed
state, the prospect drawer, the case list + the "Case not found" detail, the Sales pipeline,
the members register, the lifecycle record, the family portal's two inquiries and the agent
portal's synced prospect.

Run record (`npx next dev --port 4310`, fixture mode): the raw requests, the three
references, and each screen read are reproducible from the paths in §2–§3.

## 6 · Gates

`npm run lint` · `npx tsc --noEmit` · `npx vitest run` · `npm run build` — see the task's
status line for the head and the counts.
