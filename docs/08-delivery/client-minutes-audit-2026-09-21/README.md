# Villa Memorial — the Sept 21 2026 minutes, verified against the code

**Prepared for:** the captain. **Date of audit:** 2026-09-27.
**Source:** *Minutes of Meeting & System Enhancement Agreement*, Sept 21 2026, Edgepoint Solutions, Inc. —
8 agreed enhancements.

**How this was produced.** Each requirement was checked by reading the code, not by asking whether it
was "done". Every claim carries a `file:line`. Where something could not be confirmed, this document
says **NOT FOUND** rather than guessing. One comparison script of mine joined on a pattern that matched
nothing and reported a false alarm ("24 of 24 have no catalogue item"); it was rewritten to prove its
own join before its output was believed. That is the standard applied throughout.

---

## The verdict in one table

| # | Requirement | Verdict |
|---|---|---|
| 1 | Payment due notification, 2 days before | **PARTIAL** — the rule and the client's view are real; nothing is ever *sent* |
| 2 | Calendar: burial schedule + light pickup | **PARTIAL** — a real month-grid calendar; nothing can be recorded or managed |
| 3 | Branding → "Villa Funeraria" | **DONE** for the exact ask; **PARTIAL** for "ensure consistency" |
| 4 | Dashboard red payment indicator | **WORKING**, with 3 concrete defects |
| 5 | Funeral prices → Request for Quote | **PARTIAL — and this is the one that costs money.** No price is published and the form captures every required field, but the request **never reaches the office** (§5) |
| 6 | Villa Memorial map integration | **PARTIAL** — an interactive map exists; no approved real-world location |
| 7 | Client-provided images | **PARTIAL** — staff can upload; the client set is unresolved |
| 8 | Monthly pricing for plans and lots | **WORKING** — monthly leads on all four surfaces; a lot's monthly contradicts its own total (§8) |

---

## 1 · Payment due notification — PARTIAL

**What is genuinely built.** The rule is real, pure, and declared exactly once:

- `lib/payment-schedule.ts:34` — `PAYMENT_DUE_SOON_DAYS = 2` (the only declaration in the repo)
- `:104-120` `installmentDueDate()` derives each due date from `first_due_on` + the mode interval
- `:139-144` `paymentDueState()` — `days < 0` overdue · `days <= 2` due_soon · `dueCents <= 0` paid
- `:204-221` `paymentDueNotices()` selects due-soon **and** overdue, most-late-first

The client does see it, with all four required facts — `app/(family)/client/notifications/page.tsx:95-105`
renders client · reference · amount · **due date** · "Due soon"/"Overdue", and
`app/(family)/client/payments/page.tsx:104-114` repeats it per instalment.

**What is missing.** *"Notify … and, where supported, may be delivered through other configured
notification channels."* There is **no scheduler, no cron, and no sender anywhere** — no
`app/api/**/notif*` route, no interval, no job. `lib/payment-reminder-channels.ts:45` has
`PAYMENT_REMINDER_ADAPTERS = []`, and only `in_app` is wired. The staff log is empty **by design**
(`lib/fixtures/operations/notifications.json`: `service_state: "not_wired"`, `log: []`), and
`/staff/notifications` prints "Nothing has been sent yet".

So the notice is **recomputed when the client opens the portal**. Nobody is notified *at* day 2. The
requirement's own trigger — "notification trigger two days before the due date" — does not exist.

## 4 · Dashboard red payment indicator — WORKING, with three defects

Real, and all four bullets render: `app/(staff)/staff/dashboard/page.tsx:94` renders
`PaymentAlertBand` → `payment-alert-band.tsx:64` `<Alert tone="danger">` (`role="alert"`, wash
`--clay-100` #f5e5e2) with the count, the overdue-vs-due-soon split, a row per payment, and a link to
`/staff/billing`.

**The three defects — all "don't make sense" work:**

1. **Two contradictory "overdue" numbers on one screen.** Today the dashboard reads
   **"Overdue accounts 2"** (status-based: `lib/api-client/reporting.ts:167`) beside
   **"6 overdue"** (date-derived: `lib/payment-alerts.ts:96-97`). Two different definitions of the same
   word, on the same screen, and the reconciliation test pins only one of them
   (`tests/fixture-contract/reporting.test.ts:55-57`), so it can never catch the disagreement.
   "Review payments" then lands on `/staff/billing`, whose notion of overdue is the *status* field —
   not the band's.
2. **Due-soon rows can never render when 5+ are overdue.** `payment-alert-band.tsx:32` `MAX_ROWS = 5`,
   `:58` concatenates `[...overdue, ...due_soon].slice(0, MAX_ROWS)`. The upcoming payments are
   **counted** in the headline but their rows are never shown. That is happening today ("+1 more").
3. **"Provide access to payment details" is only the list.** There is no read-only invoice detail
   route; `/staff/billing/record-payment?invoice=…` is linked only for `billing:write`
   (`app/(staff)/staff/billing/page.tsx:239-249`). A reader-level session cannot open the payment the
   alert names.

Smaller: `PaymentAlert.due_on` is computed and never printed (the family page prints it, the staff band
doesn't); `overdue_cents`/`due_soon_cents`/`NO_PAYMENT_ALERTS`/`PAYMENT_ALERT_STATES` have no app
consumer; `nextPaymentDue()` (`lib/payment-schedule.ts:175`) has no page consumer; the family
dashboard's `tone="due"` (`app/(family)/client/dashboard/page.tsx:184`) fires for *any* balance with no
window, so it can read like the required indicator without being one.

## 2 · Calendar: burial schedule + light pickup — PARTIAL

**A real month-grid calendar exists** — two of them, both on `/staff/schedule`: the burial calendar
(`app/(staff)/staff/schedule/burial-calendar.tsx:161-200`, `.burial-month`) and chapel availability
(`chapel-availability.tsx:235-241`, `.chapel-month`). Burial **dates display** ✓.

**Light pickup is a real typed field, not a note** — `LightPickup` (`lib/burial-calendar.ts:65-72`) held
as `light_pickup: LightPickup | null` **on** the burial record (`:86`), so the link is structural, and
a "Preparation list" prints `Lights <time> · <crew>` (`burial-calendar.tsx:236-292`). ✓

**What is missing is the verb in the requirement.** *"Record and manage burial schedules"* — there is
**no write path at all**: no burials route under `app/api/**`, `canWrite` gates only the chapel surfaces
(`page.tsx:72`, `:400-423`), and the component says so itself — *"Read-only — no burial service is
connected"* (`burial-calendar.tsx:129-131`). The pickup even carries a lifecycle
`scheduled → in_progress → done` with **no transition surface**, so it can never move from the app. The
only way to change a pickup is to hand-edit `lib/fixtures/scheduling/burials.json`.

Also: nothing reads the schedule except that one page — `app/(staff)/staff/cases/[id]/preparation` has
**zero** burial/pickup references, so prep staff do not get the pickup in their own workflow screen. And
in live mode the grid is replaced by an unavailable alert (`page.tsx:386-397`).

## 3 · Branding → "Villa Funeraria" — the exact ask is DONE

The homepage upper-left renders `{brand.wordmark}` (`components/landing/site-header.tsx:97`), and the
value is **"Villa Funeraria"** (`lib/fixtures/landing/content.json:32`). The literal
**`Villa Memorial Lots` does not exist** anywhere in `app/`, `components/`, `lib/` or `tests/` — only in
two doc quotes of the client's own request.

*"Ensure consistency"* is not achieved, and there is **no single brand constant**:

| Surface | Shows | Cite |
|---|---|---|
| Public header · footer · og:siteName | Villa Funeraria | `site-header.tsx:97`, `landing-view.tsx:365,462`, `lib/seo.ts:37` |
| `(public)` layout fallback title | **Villa Memorial** | `app/(public)/layout.tsx:12` |
| Staff/admin eyebrow | **Villa Memorial** | `app/(staff)/staff/layout.tsx:27` |
| Family & agent portal frames | **Villa Memorial** | `components/portal-frame.tsx:149,269` |

Three copies of "Villa Funeraria" plus a separately hardcoded "Villa Memorial". And **no test pins the
header wordmark** — `tests/fixture-contract/landing.test.ts:41` only asserts it is non-empty, so a
regression would slip through.

## 6 · Map integration — PARTIAL

**An interactive map exists**: Leaflet `L.ImageOverlay` (`components/parks-canvas.tsx:120`), rendered on
`/map` (`app/(public)/map/page.tsx:205`) and embedded on the home (`app/(public)/page.tsx:44-45`), plus
a 3D mode. It is a **masterplan-image map in image-space x/y — not geographic**.

Address is a static card (`components/public/location-block.tsx:56-69`) sourced from the staff-editable
landing contact document. **Navigation assistance exists** — Google/Apple directions +
`mapSearchUrl` (`lib/location-map.ts:63-76`). ✓

**"Ensure the map location is accurate and approved by the client" is unmet, and untestable as
written** — **no latitude/longitude exists anywhere in the repo**. The pin is an open client question
(`docs/07-client-villa/open-questions.md:65-72`).

## 7 · Client-provided images — PARTIAL

144 photographs under `public/media/` (root 32 · `client/` 47 · `composition/` 53 · `gallery/` 12), with
the client's originals deliberately outside `public/` at `media-sources/client-photos/` (22). Provenance
is documented and tested (`lib/client-photos.ts` — 21 supplied = 14 published + **7 held**;
`lib/media.ts`, `lib/catalogue-imagery.ts`). **No image referenced in code is missing from disk** — all
44 `/media/...` literals in source and 24 in fixtures resolve.

**Staff can add an image with no code change** ✓ — `MediaPicker` (library · device · URL) →
`POST /api/content/media` → bytes under `.data/media-uploads`, served by `/api/media/[...path]`, wired
into 4 staff editors. **The client cannot**, and there is **no standalone media-library page** — the
library is a static array (`lib/media.ts:329`), so adding a *library* image is still a code change.

---

## 5 · Funeral prices → Request for Quote — PARTIAL, and it is the urgent one

**Two thirds of this requirement are genuinely done.**

**No price is published** on either named surface — `/services`
(`app/(public)/services/page.tsx:148-153` → `components/villa/service-rates-2026.tsx`, which authors no
figure) and `/facilities` (`:171-187`). Both are pinned: `tests/unit/price-surfacing.test.tsx:185-212`
asserts no `₱` and no cart action, `tests/unit/facilities-page.test.tsx:77-117` the same.

**Every service line offers exactly one Request-a-quote action** → `/quote`, through
`buildQuoteHref` (`lib/public-forms/request-prefill.ts:78-80`, which carries item + SKU + note and
**never a price**): the services hero, all five a-la-carte cards, the "all five" line, the day picker,
each of the 8 day-ladder rows, and both chapel cards.

**The form captures all five required fields** — verified field by field
(`components/public-forms/quote-form.tsx`, gate `lib/public-forms/validation.ts:102-114`):

| Required capture | Present | Field |
|---|---|---|
| Client name | **yes** | `full_name` `:154`, required |
| Contact details | **yes** | `email` `:164` required · `phone` `:175` optional by design |
| Requested funeral service | **yes** | `service` `:211`, required, **prefilled from `?item=`** and a datalist of six |
| Preferred date (if applicable) | **yes** | `preferred_date` `:226`, optional, format-checked |
| Additional requirements | **yes** | `notes` `:265` |

### But a submitted request never reaches the funeral home

Independently confirmed three ways:

1. **There is no route that could receive it.** `app/api/**` contains no inquiries, quotes, contact or
   lead handler — the directories are auth · billing · cases · catalog · chapel · content · documents ·
   media · memberships · orders · pricing · property · schedule. **NOT FOUND.**
2. **The form says so itself.** `quote-form.tsx:75` calls `captureDemoInquiry(...)`, which writes to
   browser `localStorage` under `vm.demo.inquiries.v1` (`lib/demo-inquiry-captures.ts:20,76-96`), and the
   confirmation reads *"**Nothing was sent to a server**"* (`:95-97`).
3. **Even in that browser, the office cannot read it.** The staff board's columns are
   Reference · Person · Topic · Source · Assigned · Status · Received
   (`app/(staff)/staff/inquiries/inquiry-board.tsx:281-287`) — there is **no message column**, and the
   `message` field is never rendered in the list. `quoteInquiryInput` puts the whole visitor message in
   `message` and only its first 80 characters in `topic` (`lib/demo-inquiry-captures.ts:105-114`), so the
   **preferred date and the additional requirements are captured, stored, and then invisible on every
   staff screen.**

So the requirement's last clause — *"allow prospective clients to submit inquiries"* — is met only in the
sense that the browser accepts the input. **A family asking for a quotation is, today, not heard.**
For a funeral home that is not a UI defect; it is a lost customer at the worst possible moment.

Two smaller things also contradict the requirement's own wording, *"remove the displayed prices for
funeral services"*:

- `/builder` still prints per-line a-la-carte, embalming and chapel amounts and a "One-time items" total
  (`components/builder/builder-estimate.tsx:48-49,84-88`).
- `/plans/[sku]` resolves **any** catalogue SKU, so a service line can render its amount with Add to cart
  (`app/(public)/plans/[sku]/page.tsx:449-464`). Those URLs are in no sitemap and no public page links
  one, but they render, and a cart line for a service links back to one
  (`components/cart-line-row.tsx:141`).

**And `/facilities` still promises rates it no longer prints** — the metadata says *"with their 2026
per-day rates"* (`facilities/page.tsx:24`) and the hero lead ends *"…and the 2026 rates."* (`:128`),
while the page shows none. That is the same class of defect as the `/services` headline fixed earlier
today.

## 8 · Monthly pricing for plans and lots — WORKING

All four surfaces **lead with the monthly**, from one document, and lots are monthly too:

| Surface | What leads | Cite |
|---|---|---|
| `/plans` | "Starting from ₱600.00" · "per month · regular rate" | `components/villa/plan-tier-card.tsx:61-64` |
| `/price-list` | Monthly column first, then term, then total | `components/villa/monthly-price-table.tsx:46-50` |
| `/plans/[sku]` | Monthly by default in the buy box | `components/villa/plan-term-selector.tsx:77-88` |
| `/lots/price-list-2026` | Section head "Monthly installments" | `app/(public)/lots/price-list-2026/page.tsx:95-103` |

Figures come from the pricing store via `lib/monthly-pricing.ts`; only the **term** is derived
(6 years → 72 months, `lib/pricing-model.ts:125-128`). The total is deliberately secondary
(`components/villa/monthly-price.tsx:29-40`). This is the requirement done properly.

**Two defects, one of which is a real numbers problem:**

1. **A lot's monthly contradicts its own total.** Prime Lots, lot-only: monthly **₱1,920** · annual
   ₱21,333 · selling **₱128,000** (`lib/fixtures/commerce/pricing.json:126-141`). But
   1,920 × 72 = **₱138,240**, not ₱128,000 — and the card prints those three figures **side by side**
   (`monthly-price.tsx:29-40`). The cause is a missing rule: `checkLotCategories` validates
   senior ≤ regular, whole pesos and `annual × 6 ≈ selling` within ₱3
   (`lib/pricing-model.ts:379-398`) but **never ties the monthly column to the annual or the selling
   price**, while the *plan* checker does enforce `annual = monthly × 12` (`:339-354`). So a lot's
   headline monthly can drift from its total with no rule and no failing test.
2. **`/lots` filters and sorts on a different figure than the card shows.** The price range, the sort and
   the quick ranges all use the recorded per-plot **total** (`lib/lot-listing.ts:217-219,296-300,310-315`)
   while the card headlines the **monthly** (`:328-336`). "Price: low to high" therefore orders totals
   while the visible numbers are monthly.

Also: `/price-list` renders the identical logo row twice (`app/(public)/price-list/page.tsx:92-103`), and
the agent pipeline values a plan prospect at monthly × 72 (`tests/fixture-contract/agent.test.ts:199-206`)
while every public plan surface prints "Payment term pending Villa Funeraria confirmation" — the app
knows the term in one place and calls it pending in another.

---

## The admin panel — what I was asked to look at hardest

### A · The page editor does not survive a restart — **the most serious finding**

**Every other store in the admin is durable. The two that power page editing are not.**

| Store | Durable? |
|---|---|
| `catalog-store.ts` · `pricing-store.ts` · `billing-store.ts` · `order-store.ts` · `chapel-store.ts` · `membership-store.ts` · `operations-store.ts` · `provisional-receipts-store.ts` | **yes** — append-only journal, atomic write |
| `content-entries.ts` · `product-lines.ts` | **yes** — `CONTENT_ENTRIES_STORE_PATH` / `PRODUCT_LINES_STORE_PATH` |
| **`content-pages.ts`** — the Park, Services, Plans and Coffins page documents | **NO** — `globalThis` only |
| **`landing.ts`** — Home, the FAQ, the blog, the header/footer and the office contact | **NO** — `globalThis` only |

The evidence is structural, not a guess: `lib/api-client/content-pages.ts:50-57` reads
`contentGlobal.__imContentPages ??= SEED.map(...)` and the module contains **no file read and no file
write**; `lib/api-client/landing.ts:739-742` is the same; and `app/api/content/pages/route.ts` calls only
`listPageDocuments` / `savePageDocument` — no `fs`.

**What that means in practice.** A staff member edits a page, the editor saves, the page re-renders with
the change — and the change is **gone on the next server restart**, and in a multi-instance or serverless
deploy it is visible only to the instance that handled the save. The product catalogue, by contrast,
really is durable. So the two halves of the admin behave differently for no reason the captain chose,
and "how every page can be edited" is the weaker half.

The repo already knows the pattern: both sibling content stores were upgraded to journals. These two
were not.

### B · The catalogue can set a price the storefront will not show — caskets

`buildCasketListing` (`lib/casket-listing.ts:88-114`) does **not** read the catalogue's type. It walks a
**hardcoded** `CASKET_MODELS` list, maps each to a SKU, looks the catalogue item up by that SKU, and
**drops any item with no model** (`if (!item) return []`). The price it emits is `model.srp * 100` —
**from the code**.

Then `components/villa/casket-catalogue.tsx`:
- `:90` prints `amount(model.srp)` — the **code** figure — as the headline price
- `:94` prints `amount(model.seniorPrice)` — the **code** figure — as the senior line
- `:56` builds the cart item with `unitPriceCents: item.unit_price_cents` — the **catalogue** figure
- `:63` falls back to the **catalogue** `display_price` inside the "Request order" message text

**The two agree today** (verified all 24, 0 differences — an earlier script of mine claimed otherwise and
was wrong). But they are independent sources, so **an edit in `/staff/catalog` would print the old price
on the card while the cart charges the new one.**

The senior price is worse: **all 24 catalogue casket rows have no senior price field at all** — the
senior figure exists only in `CASKET_MODELS`, so **the admin cannot set or edit it**.

And a casket **created** through `/staff/catalog/new` can never appear on `/products`, because
`buildCasketListing` only ever emits models from the hardcoded list. The admin's own type vocabulary is
the visible symptom: the only types are `package · service · add_on` (`lib/catalog-admin.ts:28-32`), so
**the 24 caskets are filed as "Add-on"** — the storefront's flagship product has no type of its own.

### C · Smaller things that don't make sense

- **Stale admin copy.** `/staff/landing/page.tsx:90-91` tells staff the newest post "leads the home
  page's blog band". That band was removed earlier today at your request. The card describes a feature
  that no longer exists.
- **`/staff/documents`** offers "Upload (not wired yet)" (`:97`).
- **Stale planning doc.** `docs/08-delivery/next-session-plan.md:133,171` still lists the branding item
  as "in flight" on a branch, though the code has shipped it.

### D · What is genuinely good, and should not be "renewed"

Worth saying plainly, because most of this panel is sound: `/staff/store` is a **redirect** to
`/staff/landing` with the reason written down (a real cleanup, not a stub); `/staff/pricing` edits **one**
document that every public price reads; the catalog list has search, type and publish filters with
honest read-only states; the copilot screen **deliberately** wires no model and says why; the commission
screen prints `₱—`/“Not configured” rather than inventing rates because the client never gave any. Those
are correct decisions, not gaps.

---

## The plan

Ordered by what it costs the business, not by what is easiest.

**Phase 1 — a family asking for a quotation must reach the office. (NEW — highest priority.)**
1. Add the missing write path: `POST /api/inquiries` (rules-free handler, `catalog:write`-style gate or a
   deliberate public-form scope) backed by a durable store, following `provisional-receipts-store.ts`.
2. Point `quote-form.tsx` at it instead of `captureDemoInquiry`, and keep the honest confirmation — the
   line "Nothing was sent to a server" must become true in the other direction: "the office has it".
3. Render the request's full substance on the staff board — the preferred date and the requirements are
   currently captured and never shown. A read-only enquiry detail view is the natural home.
4. Tests: a submission is persisted server-side and appears on the board with every field; a failed
   write shows the server's message and does not claim success.
5. Decide, explicitly, whether `/builder` and `/plans/[sku]` should keep publishing service amounts —
   the minute says remove them, and today they survive on both.

**Phase 2 — make page editing survive a restart. (The admin's foundation.)**
6. Give `content-pages.ts` and `landing.ts` the durable journal every sibling store already has
   (`CONTENT_PAGES_STORE_PATH` / `LANDING_STORE_PATH`, atomic writer, one write chain), reusing the
   existing pattern rather than inventing one.
7. Tests: an edit survives a simulated restart (fresh module state reading the file); a corrupt journal is
   a 500, not a silent fall-back to seed.
8. Correct the AGENTS.md seam notes, which still describe these two stores as globalThis.

**Phase 3 — make the catalogue tell the truth.**
9. Make the casket card read its price from the catalogue like every other surface — or, if the code
   constants must stay authoritative, stop letting the admin edit a price that does nothing. One or the
   other, never both.
10. Add the senior price to the catalogue, so it is editable at all (24 of 24 rows lack it).
11. Give caskets a real item type instead of filing them under "Add-on"; make a newly created casket reach
    `/products`, or say plainly on the create screen that it will not.
12. Guard it: a test asserting a casket's displayed price and its cart price come from the same source.

**Phase 4 — one meaning for "overdue".**
13. Reconcile the status-based `overdue_count` with the date-derived band so the dashboard cannot read
    "2" and "6" at once; make `/staff/billing` use the same definition.
14. Fix the row cap so due-soon rows can actually appear when 5+ are overdue.
15. Add a read-only invoice view so the alert's link works for a reader, as the minute's "provide access
    to relevant payment details" asks.

**Phase 5 — the lot's monthly must reconcile.**
16. Tie the lot monthly to the annual/selling figures in `checkLotCategories`, the way plans already are
    (`annual = monthly × 12`), and re-derive the seeded Prime Lots row.
17. Make `/lots` filter and sort on the figure the card leads with.

**Phase 6 — the genuinely unfinished minute items.**
18. Burial + light-pickup write path (the missing verb in requirement 2), with the pickup's
    `scheduled → in_progress → done` transitions reachable.
19. A real trigger for the 2-day payment notice — or an explicit decision, recorded, that in-portal only
    is the agreed scope. Either way the client should not be told they will be "notified" when nothing is
    sent.
20. One brand constant, with the staff eyebrow, the portal frames and the `(public)` fallback title
    brought in line; and a test pinning the header wordmark so it cannot silently regress.

**Phase 7 — clear the dead weight.**
21. Remove the computed-but-never-printed fields (`PaymentAlert.due_on`, `overdue_cents`,
    `due_soon_cents`, `NO_PAYMENT_ALERTS`, `PAYMENT_ALERT_STATES`), the dead `nextPaymentDue()`, the
    duplicate logo row on `/price-list`, the stale blog-band copy on `/staff/landing`, the `/facilities`
    copy promising rates it does not print, and the stale line in `next-session-plan.md`.

Each phase: measured before/after, full gate green, and an implementation record under
`docs/08-delivery/`.

---

## What I am NOT claiming

- I have not verified the **live-mode** behaviour of anything: every finding above is fixture-mode, which
  is what this build runs.
- I have not opened the platform or gateway services; "no contract exists" claims are about **this
  repo**, and several are the app's own recorded statements.
- `/facilities`' hero and `/builder`'s estimates were read, not rendered — I did not screenshot them.
- I did not re-derive the full `Villa Memorial` string inventory; the four surfaces in §3 are the ones
  that render a **brand** rather than a page name.

