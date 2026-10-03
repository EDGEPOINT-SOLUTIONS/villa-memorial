# Portal route coverage — current build (living document)

> Purpose: one short, honest map of what every portal route serves today, so agents and
> reviewers don't have to re-audit `app/**`. Per-screen PRD alignment, evidence and the
> gap lists live in [`prd-alignment-audit.md`](../prd-alignment-audit.md); this note is only
> the route index. Check = open the route in a running build (`npm run dev`, fixture mode by
> default) and confirm it renders data, an honest empty state, or an honest placeholder —
> never a broken page.
>
> Legend: ✅ real screen (live contract or durable fixture store) · ⚠ honest placeholder
> ("not wired yet" / "coming soon", naming what unblocks it) · ❌ absent.
> When a contract lands, change the page **and** its row here in the same PR.

## Public site — `app/(public)`

| Route | What it serves |
|---|---|
| `/` | ✅ the blog page's design promoted to the home (captain, 2026-10-02): the anchored storefront (both rails + the middle sheet) whose middle column opens on the captain's banner (`components/landing/home-banner.tsx`) — the client's park photograph, whole at its own aspect, with the park's name and the 24/7 call / Future-plan actions in a strip at its bottom edge. **The gateway block is removed from the home (captain, 2026-10-03):** the place line and the rotating title sets no longer render, and the page's ONE `h1` is the hidden honest title (the site wordmark) — the words and the editor stay in the landing store. The newsfeed band is OFF, so no blog post renders here (they live on `/blog`). The 2026-10-02 polish: the gateway words are centred at the section-title step in the display serif (the "Memorial plans & garden lots" voice), the Sanctuario photograph renders whole at its own aspect (never cover-cropped), the left rail's old "Need help now?" card is gone, and the four quick actions sit at the very bottom of the right rail. Every figure reads the pricing store / the live catalogue / the 2026 sheets; the office edits the words at `/staff/landing/home`. **A first visit in a session gets the cloud-sign entrance as the page's own FIRST PAINT** (office, inboxes 058/059): the route reads the `villa_home_intro_seen` cookie before render and puts the overlay first in the document — a plain white page carrying only the cloud, with the home hidden and `inert` behind it — no redirect, no homepage flash, no blank second route; when the exit ends the white veil fades and the home already rendered underneath simply appears. **The top gap above the hero is trimmed (captain, 2026-10-03):** on `/` the page's own padding, the middle sheet's padding and the banner's section padding no longer stack — the storefront grid's own `--space-5` gutter is the ONE gap under the header (24.4px measured at 1440 and 390, down from 146px/114px), and no other public page's top spacing changes. **The hero picture is levelled with the rails (captain, 2026-10-03):** after the trim the hero sat 42px above the rails' first pictures, so the middle banner takes a top offset equal to the rail heading block (measured from the rail's own tokens) at ≥75rem — the three first pictures now share one line (hero 195.19 vs rails 195.16 at 1440) and the single-column phone keeps its clean top. Record: [`home-blog-swap-design/`](../home-blog-swap-design/README.md), [`home-banner-polish-design/`](../home-banner-polish-design/README.md), [`home-gateway-removal-design/`](../home-gateway-removal-design/README.md), [`home-top-trim-design/`](../home-top-trim-design/README.md), [`home-hero-align-design/`](../home-hero-align-design/README.md) |
| `/services`, `/services/death-at-home`, `/services/death-at-hospital`, `/transport` | ✅ Request-for-Quote service list (captain's minutes 2026-09-21, item 5): no displayed price; the five a-la-carte fees and the embalming day counts each carry ONE Add-to-Quote action that adds an `on_request` line. The two CHAPEL cards carry the real booking step again (captain D5-A, 2026-09-30): the dialog picks the chapel, the dates and the 3–9 day stay, checks the park's schedule and HOLDS the range, so the quote line carries its held dates and is "To be quoted by the office" |
| `/facilities` | ✅ the park's rooms (chapel classes with sample photographs + the booking step, no displayed rate) and the masterplan's grounds list; no room name/capacity/count (an open client question, said on the page) |
| `/products`, `/products/[sku]` | ✅ 24 casket models from the 2026 sheet; sample imagery labelled illustrative. The detail page renders the item entry's editable rich description, gallery viewer + thumbnail rail and specs table (durable `content-entries` store; no gallery falls back to the rule-derived sample figure) |
| `/plans`, `/plans/[sku]`, `/plans/compare`, `/plans/senior-benefits`, `/plans/villa-memorial-plan`, `/packages` | ✅ plan tables + catalogue read the pricing/catalog stores. **Plan inquiries are gated since 2026-10-02**: the tier cards' “Ask about this plan” and the `/price-list` rate-table cells link to the family gate `/client/ask`, which records the inquiry against the family account; the monthly cart path (a real order) is unchanged |
| `/price-list` | ✅ the consolidated 2026 price list: package comparison · coffin tiers · senior schedule · plan benefits · the five tiers × four terms, read from the pricing store. **This row was missing until 2026-09-27**, which is how the route shipped a production-only `HTTP 500` (a Server Component passing `onClick` into the client `ListingShell`) while sitting in `PUBLIC_PAGES` at `priority: 0.9` — a page must never be in the sitemap without a row here |
| `/general-price-list` | ✅ the LITERAL PDF (captain, 2026-10-02): a route handler, not a coded page — it serves the General Price List document (`application/pdf`, `inline`, `villa-general-price-list.pdf`), in the reference GPL's order — professional services · facilities & equipment · transportation · merchandise · plans & lots · cash assistance · branches — read from the pricing store and the client's recorded 2026 material. Deliberately absent from `PUBLIC_PAGES`/the sitemap (a sitemap advertises pages); linked from `/price-list` and the footer, with the explicit download at `GET /api/export/paper-pdf?document=general-price-list`. Record: [`gpl-literal-pdf-design/`](../gpl-literal-pdf-design/README.md) |
| `/lots`, `/lots/[id]`, `/lots/price-list-2026` | ✅ lot browse/filter, detail, 2026 lot families. **Lots are gated since 2026-10-02**: every plot's one action is exactly “Ask about this lot”, linking to the family gate `/client/ask` (a lot inquiry needs a family account and is tracked in the family portal); the public map's plot panel and the price-list rows use the same gate. The map link stays | 
| `/entrance` | ✅ the cloud-sign greeting as its own BLANK page (office, 2026-09-29): no chrome, `noindex`, plays once per session and hands the visitor to `/` by replacing the history entry. Since inbox 058 the home itself carries a first visit's entrance (cookie-gated, first paint), so this route is the direct/standalone way to watch it; the home at `/` stays the real, indexable page |
| `/map` | ✅ shared park map — 2D masterplan + 3D mode, VIEW-ONLY for everyone (plot authoring is `property:write` on `/staff/property`) |
| `/gallery` | ✅ grouped client photography (gate · pavilion & grounds · chapels/viewing/carriage) + the ONE entry to `/map` and the full-screen 3D walk-through; sheet samples labelled illustrative |
| `/cart`, `/checkout` | ✅ RETAINED as real pages (office, 2026-09-29): priced items (caskets, plans) add to the cart and it checks out through the frozen commerce contract. Quote-only items (services, lots, chapels) go to `/quote` instead. The cart page opens on the shared public gateway (kicker · display-serif page title · one lead · the commit) and reads as hairline bands; a phone stacks the lines (2026-09-30, record [`cart-page-design/`](../cart-page-design/README.md)). The checkout page opens on the same gateway and centres the form in one reading-measure column (details · order summary · the gold commit), with a designed empty state (2026-09-30, record [`checkout-page-design/`](../checkout-page-design/README.md)) |
| `/orders/[number]` | ✅ real order creation on the frozen commerce contract (reachable from the routes that still place orders) |
| `/builder` | ✅ Smart Service Builder (F-05): an ESTIMATE over the client's published 2026 figures (casket/senior columns · a-la-carte · embalming · chapel schedule · the pricing store's plan tables); the plan amount is kept out of the one-time total; the office confirms |
| `/quote`, `/appointments` | `/quote` ✅ REVIEW + SEND (captain answers D1-B–D6-A, 2026-09-30): the basket's lines are rendered from each line's own descriptor and explicit pricing mode, a quote-only line prints "To be quoted by the office" and carries no figure, and the summary band SPLITS published 2026 figures from the lines the office will quote by hand. The inline add form is gone; a small link opens a light request dialog. The page submits THE WHOLE BASKET as one Request-for-Quote to `POST /api/inquiries` with a structured `lines` array (SKU · kind · pricingMode · quantity · detail · dateRange), recorded in the durable enquiries journal (`lib/api-client/inquiry-store.ts`) that `/staff/inquiries` renders one row per line with a "Needs pricing" flag. Chapel lines keep their server-side hold and their real held dates; removing one releases it. Priced caskets and plans stay on the separate cart path (D1-B). Record: [`quote-page-revision-design/`](../quote-page-revision-design/README.md). `/appointments` ⚠ real capture, nothing sent (no scheduling write contract), confirmation says so |
| `/contact` | ✅ request landing; a submitted message goes to the same `POST /api/inquiries` journal and appears on `/staff/inquiries` (no CRM service exists, so live mode refuses with a named 503 rather than filing it locally) |
| `/faq` | ✅ static content |
| `/memorials`, `/memorials/find` | ✅ rules-first digital-memorial search + the family's find path; a result shows only the family's published name and the fields it chose; the seed publishes NO memorial, so the empty state names the service and the privacy floor |
| `/memorials/[id]` | ✅ a family's switched-on record renders the memorial profile (name-only is a complete page); the seed publishes no one, so an absent AND a switched-off id get the same not-available answer — `noindex` until a family publishes |
| `/api/family/memorials` | ✅ the family's one switch + per-field choices; writes the consent journal the public memorial surface reads (401 signed out, 404 for a person not on the account) |
| `/api/family/inquiries` | ✅ `POST` records a signed-in family's plan/lot inquiry (401 signed out, 422 on an incomplete ask, named 503 in live mode) through the one enquiries journal, stamped with the account id (`user_id`), so `/client/inquiries` and `/staff/inquiries` read the same row |
| `/api/memorials/[id]/photo` | ✅ a published portrait, served only while the memorial is on AND the family allowed the photograph; 404 otherwise |
| `/register` | ⚠ account provisioning is not frozen; submission ends in an explicit demo state |

Sign-in doors: `/login` (staff) ✅ · `/client/login` (family) ✅ · `/agent/login` (agent) ✅ —
one BFF, separate doors because the JWT carries scopes but no role/portal claim.

## Admin Portal — `app/(staff)/staff`

| Route | What it serves |
|---|---|
| `/staff/dashboard` | ✅ the **revisioned board composition** (admin plan, 2026-10-02): the greeting + date + quick actions (`+ New case` · `Record a payment`), five figures that lead (family requests · new inquiries · orders to fulfil · payments due · overdue), the cross-record **Needs you today** queue, the two payment notification bands (overdue red / due-soon amber), and the labelled month calendar whose days open their full detail. Every figure is the same read its own screen makes (scope-gated per source — money only with a finance scope, lots only with `property:read`), so the dashboard cannot contradict a screen |
| `/staff/calendar` | ✅ the one labelled staff calendar (admin plan, 2026-10-02): burials + their light pickups · chapel bookings · dispatch trips · invoice due dates · work-order due dates, every mark a **named** type with a legend, and `?date=`/`?calDate=` links so a day's whole detail is shareable and works with JavaScript off. Each store is read independently; an unreadable one is named, never fabricated |
| `/staff/inbox` | ✅ the Today **triage list** (admin plan, 2026-10-02): notifications, family requests, inquiries, orders, payments and documents folded into ONE typed, linked queue, beside the designed notification catalogue. **Inbox absorbs Notifications** — the catalogue keeps its own route and stays reachable from the topbar bell and from here. No notification service is connected (P4), so the sent log stays empty |
| `/staff/memorials` | ✅ the office's view of the digital memorials: each household person with the family's consent switch (published / not public) and the fields chosen, read from the SAME consent store the family page writes. Nothing is published by default; no digital-memorial service or contract exists |
| `/staff/media` | ✅ the shipped client assets a page editor may attach, with previews and the sized WebP derivatives; a shared, reusable upload library needs D7 public-web media, which is not frozen |
| `/staff/preparation` | ✅ every recorded embalming / preparation record on one lane — case · state · embalmer · scheduled · steps done — opening the per-case record. PROVISIONAL recorded fixture (no preparation contract; live answers 503) |
| `/staff/customers`, `/[id]`, `/staff/inquiries` | ✅ fixture-backed records (no crm-families contract yet); the Customers list also links the recorded lead records; `new` forms ⚠ (crm-families). **`/staff/inquiries` reads the durable enquiries journal**, so a website request arrives from any device, and each row prints the request's own words — the preferred date and the additional requirements included. **Changed 2026-09-27:** it merged a browser-local store after hydration and rendered only a topic, so those two facts were captured and shown on no staff screen. **Changed 2026-10-02:** a `cases:write` session moves an enquiry New → Contacted and **converts it into a prospect in one step** (the prospect lands on the shared pipeline journal; a Contacted enquiry lands Contacted) |
| `/staff/prospects` | ✅ the office's client lifecycle (captain, 2026-10-02): every prospect with contact details, source, what they asked, notes, state (New · Contacted · Converted) and the assigned agent; one-click Call/Email, a one-message email blast, an assign-to-agent dropdown of the recorded agents, and ONE detail panel per prospect. Reads the SAME durable journal the agent portal folds (`lib/api-client/agent-store.ts`), so an agent's capture reaches the office and the office's state/assignment reaches the agent's pipeline and its durable notice. The blast is recorded and handed to the office's own mail app — no notification service is connected (P4), and the screen says so. Gate: `cases:read` / `cases:write` (the inquiries area's provisional reuse) |
| `/staff/members`, `/staff/services`, `/staff/lots`, `/staff/products`, `/staff/lifecycle/new`, `/staff/lifecycle/[id]` | ✅ the **post-Prospect lifecycle** (captain, 2026-10-03): the four outcomes a prospect becomes, each on its own register — **Members** (plan · term · amount · paid · outstanding · next due, and nothing else), **Services** (the service, its price basis and its booked day/resource), **Garden lots** (monthly-paid, on their own page), **Products bought** (one-time sales) — and one shared accounting page per record: the money, the **amortization schedule** (period · due · amount · status · remaining), the recorded payments and the **modular notices** (two days before / a day before / any offset the office writes; no email/SMS service is connected, so a notice is scheduled and held in-system and the page says so). ONE durable store (`lib/api-client/lifecycle-store.ts`, seed + journal) and the money is DERIVED from the recorded payments; a service's slot is the SAME record `/staff/calendar` renders (a named `service` day whose href opens the client's record), and the register links back to the day. A sold prospect with no outcome yet is surfaced from the agent journal the Prospects screen folds. PROVISIONAL (no lifecycle contract — fixture mode only). Gate: `cases:read` / `cases:write` |
| `/staff/pipeline`, `/[id]` | ✅ the staff lead record (PRD S4 Lead Detail) + the recorded lead list, read-only over `lib/fixtures/crm/lead-records.json`; the pipeline's own stage moves/assignment ⚠ (crm-families unbuilt) |
| `/staff/cases`, `/[id]`, `/new`, `/[id]/service-contract`, `/[id]/preparation`, `/[id]/instruments` | ✅ frozen case contract + capture/export; the preparation record is a PROVISIONAL recorded fixture (no preparation contract — live answers 503, and a case without one shows its task lines); the guarantee-instrument tracker is STATUS ONLY (no sub-ledger, no deduction math, no posting) |
| `/staff/ops` | ✅ operations board — the case fixture/store grouped into the frozen stage lanes, with the case screen's own two writes; ages are days since `updated_at` (no agreed staleness threshold), guarantee papers use the contract's 3-day term |
| `/staff/schedule` | ✅ day board over the bookings API (fixtures; live with `SCHEDULING_BASE_URL`) + the **burial calendar** (month/week — each burial carries its light pickup on one record; `scheduling:write` sessions can **record a burial**, move each pickup `scheduled → in_progress → done`, and **edit or remove a recorded burial** through `POST /api/schedule/burials` + `PATCH /api/schedule/burials/:id/pickup` + `PATCH|DELETE /api/schedule/burials/:id`, durable journal; PROVISIONAL, no burial-schedule contract, live answers 503) + chapel administration (settings/availability/bookings) over the scheduling store |
| `/staff/dispatch` | ✅ vehicle dispatch board (PROVISIONAL recorded dispatch sheet): the day's trips tied to cases — case · vehicle · driver · route · park-time window · state — plus the assignment view (fleet state, drivers on duty); READ-ONLY (no dispatch contract — D5 scheduling-resources owns it, live answers 503); `scheduling:read` |
| `/staff/work-orders` | ✅ work orders (PROVISIONAL recorded maintenance file): the list with asset · assignee · priority · due date · state · every recorded movement; overdue is derived from the recorded due date against the recorded day only (no wall clock); READ-ONLY (field-ops unbuilt, live answers 503); `property:read`. **Left the curated rail in the 2026-10-02 revision** and stays reachable from the calendar's work-order days and the dashboard queue |
| `/staff/property`, `/[id]`, `/[id]/apply`, `/[id]/document`, `/[id]/ownership`, `/[id]/transfers`, `/[id]/interments`, `/[id]/exhumations` | ✅ shared park map; lot reserve; purchase application is PROVISIONAL (503 live); the four lot-record screens render the recorded lot-lifecycle fixture (APP-AUTHORED example data — each names its gap once; no amount is invented) |
| `/staff/catalog`, `/new`, `/[id]/edit`, `/[id]/content` | ✅ durable catalogue store (503 live — no catalog write contract); public storefront reads the same store. The per-item **page-content editor** (content-catalogue Phase 4) edits a casket/package entry's long description, photos and detail blocks — prices stay bound to live catalogue SKUs, the name/group stay on the catalogue record |
| `/staff/inventory` | ✅ the stock room over the office's recorded stock file (APP-AUTHORED example data — NO inventory service or contract exists; live mode is unimplemented and the screen names it once): catalogue-linked prices resolve from the durable catalogue, movements sum to each on-hand count, out/low/in-stock is derived; READ-ONLY (no purchasing or adjustment path) |
| `/staff/pricing` | ✅ the ONE rate home (content-catalogue Phase 4 nav consolidation): plan tiers × terms + the four lot families, one editable pricing document; `/staff/plans` redirects here and the old `/staff/plans/[id]` / `/new` stubs are retired |
| `/staff/plans/membership`, `/new`, `/[id]` | ✅ plan-holder enrolment folio (F-18): the register, the folio and the application paper (print/Word/PDF); every rate is read from the pricing store; it is an APPLICATION — the office issues the real COC, and live mode answers 503 (no membership-record contract) |
| `/staff/orders`, `/[number]` | ✅ durable orders store + app-authored lifecycle (503 live — no order-admin contract) |
| `/staff/billing`, `/record-payment`, `/invoices/[number]`, `/provisional-receipts`, `/provisional-receipts/new`, `/provisional-receipts/[id]` | ✅ frozen billing list + payment recording; `/invoices/[number]` is the **read-only** invoice a `billing:read` session opens (the dashboard alert's rows link here), with `Record payment` only for `billing:write`; the provisional-receipt journal is the counter's marked paper (not an official receipt) with the OR display state replacing it when one exists — live mode 503 (no provisional-receipt contract) |
| `/staff/commission` | ✅ the commission engine's screen (F-12) over the real orders with a blank Commission column: the client has given no rates, so every rate-derived figure is “Not configured” (`₱—`), never a zero (PROVISIONAL gate: `billing:read`) |
| `/staff/accounting` | ✅ the recorded ledger (APP-AUTHORED example books with provenance — no staff-facing ledger API has frozen, and posting stays the accounting service's business): a trial balance DERIVED from the journal, a period filter over both, case/order references; plus the money tiles (received / outstanding / overdue), the dues-aging buckets, the official + provisional receipts, and the reconciliation flags panel (unposted / unmatched) each naming its missing feed — a figure with no record is a named blank, never ₱0; READ-ONLY |
| `/staff/analytics` | ✅ the plan §9.1 figures over the recorded stores: a KPI row (collections / outstanding / overdue / sales / inquiry→order / lot availability), a real recorded line chart (sales by month from the durable order store) and the counter-journal collections chart with its named empty state, the dues-aging buckets, lot availability, and the source table naming each metric's store and live service; the chart grammar is the kit `LineChart` (zero baseline, ≤4 gridlines, ≤6 x labels, draw-on-view removed under `prefers-reduced-motion`); any-of `accounting:read` / `billing:read` (provisional finance gate) |
| `/staff/notifications` | ✅ designed notification catalogue (S26): the four messages the product will send — trigger · audience · channel — and the sent log; the platform notification service (P4) does not exist, so the log is EMPTY and says what the service will send and why it cannot yet — no fabricated message. **Inbox (above) now leads the notice surface**; this catalogue stays reachable from the topbar bell and from `/staff/inbox` |
| `/staff/reports` | ✅ four of the office's reports over recorded data — collections (the durable payment journal), sales by agent (real orders, agent honestly “Not recorded”), lot & chapel occupancy (property + scheduling), cases by stage (the ops board's own words) — each with its own period control and one line naming reporting-analytics, which is still unbuilt |
| `/staff/copilot` | ⚠ the PRD's AI Copilot (S29) as the DESIGNED surface: four recorded questions answered by lookup over the case store, the guarantee-instrument tracker and (with `scheduling:read`) the chapel calendar, each finding carrying its record trail; the governance boundary and the not-connected state are printed on the screen. No model provider and no model call — attaching one is exactly what a frozen AI-governance contract has to gate. **Left the curated rail in the 2026-10-02 revision** and stays reachable from the workspace topbar |
| `/staff/landing` | ✅ the page home (content-catalogue Phases 1–3): the five page documents (Home · Villa Memorial Park · Funeraria Memorial Services · Villa Memorial Plan · Coffins & caskets), the full home/FAQ editor at `/staff/landing/home`, the page-document editors and the three service guide entries |
| `/staff/store` | ✅ redirect to `/staff/landing`; the old separate store stub and its duplicate nav entry are gone (captain, 2026-09-18) |
| `/staff/documents`, `/[id]` | ✅ repository + generation/export; upload disabled (no object store); `/new` ⚠ |
| `/staff/hr`, `/[id]` | ✅ fixture-backed directory; `/new` ⚠ (hr service) |
| `/staff/users` | ✅ the people and the permission model over the recorded identity-access seed (`lib/fixtures/auth/access-control.json`, pinned to the seeded personas + `rbac-scopes-v1`): each account with its role and door, every permission in plain words beside its frozen token, and the invite path stated honestly. Read-only — no provisioning API exists; `/new` stays the honest not-wired door |
| `/staff/workflows`, `/new` | ✅ the four processes the shipped modules already run (service contract · purchase application · lot transfer · chapel booking) with their REAL steps and the recorded records at each current step, owner included where recorded; each source reads independently (the property-backed process says “cannot be read” in property live mode). The workflow engine's absence is named in one line; `/new` stays the honest not-wired door |
| `/staff/settings` | ✅ the park's configuration: the identity its public pages publish (read from the landing document), the business rules its modules apply (filing window · booking window · plan/lot terms · senior rules), what is configured/placeholder/waiting, and what only the platform can change. Read-only — `tenancy-config` is not in this build |
| `/staff/audit` | ✅ frozen audit-events read |
| `/staff/inbox`, `/staff/inbox/[id]` | ✅ the durable family/agent ↔ office threads (the admin plan's chat, §9.6): the list leads with who and the last line plus the office unread count (decorating the nav Inbox badge), and a conversation is the board's own screen — the sender's messages on the right, the other side's on the left, each with its recorded state (sent · delivered · read), attachments as chips, and the composer's Attach/Send. One append-only journal per thread (`CHAT_STORE_DIR` / `.data/chat/<thread>.json`) folds onto the recorded seed `lib/fixtures/chat/threads.json`; attachments are content-addressed under `.data/attachments/<sha256>` (`docx · xlsx · pdf · png/jpg/webp`, 10 MB per file, 50 MB per thread). Delivery/read are recorded from the other side's own next request — no live push exists, and the screen says so. `cases:read` lists, `cases:write` sends (provisional). Record: [`admin-chat-design/`](../admin-chat-design/README.md) |

Every ⚠ page renders the shared `NotWiredState` with the unblocking contract named, after a
scope gate that renders the designed `ForbiddenState` when the session lacks it
(`tests/unit/staff-scope-vocabulary.test.ts` pins that every gate uses frozen scope tokens).

## Family portal — `app/(family)/client`

All screens share the family/agent house style (`components/portal-frame.tsx`). Data is one
recorded family snapshot fixture until the family API contract freezes — the honesty state is
the deliverable, not a leftover.

| Route | What it serves |
|---|---|
| `/client/dashboard` | ✅ the command centre (captain, 2026-09-30): a compact header, an attention strip, six KPI tiles and seven colour-role panels (the funeral · visits · money + instalments · papers · plots · remembering · help) summarise every recorded fact in one screen; each unwired service is an inline honest chip, money/dates are tabular, and the private portrait/avatar load from the guarded family image route. Record: `docs/08-delivery/family-command-centre-design/` |
| `/client/family` | ⚠ household links; each row points at its honest screen |
| `/client/plans`, `/payments`, `/notifications` | ⚠ partial; the plan's instalment schedule is real since the payment-due-notification pass (client minute 2026-09-21, item 1): the family's own recorded plan runs through `lib/payment-schedule.ts`, and Payments + “What we tell you about” list the derived upcoming/overdue reminders (two days before a due date) with client · reference · amount · due date. The **amortization view** (captain, 2026-10-02) now shows the recorded mode · term · periodic amount · paid · remaining balance/periods · next due above a period · amount · status · remaining schedule on Payments and Your plan (`lib/family/family-amortization.ts` + `components/family/family-amortization.tsx`); a record with no schedule says so. The plan certificate, payment history and external channels still wait on their services |
| `/client/cases` | ⚠ partial: the office's own recorded case now shows (the five moments with their recorded times, places and states, from the provisional family case fixture `lib/fixtures/family/case.json`, rendered by ONE component the dashboard panel and the page share); a family-facing case read contract is still open, so the record is provisional and the office remains the way to change it |
| `/client/privacy` | ⚠ honest state; consent controls and the access log wait on a privacy service |
| `/client/appointments` | ⚠ partial: the family's recorded visits now read as a MONTH CALENDAR (captain, 2026-09-30) — every day that holds something is marked, selecting a day shows its detail (who · what · time · place · state · the office's own words), and a visit is asked for FROM that day; the household switcher reads one loved one's days at a time or the whole household month. No availability is invented and the family scheduling contract is still open, so the page says the office confirms every day by phone. Record: [`family-visit-calendar-design/`](../family-visit-calendar-design/README.md) |
| `/client/property`, `/requests`, `/memorials` | ⚠ the three record-backed screens (2026-09-18): each shows the office's own record through the recorded workspace fixture and ends in a calm note naming the contract it still waits on, inventing no figure, chapel or ticket number. The lot view also shows the **client's recorded six-year lot-sheet amortization** for its park section (regular + senior monthly, selling total; captain, 2026-10-02), derived from the pricing document, and stays honest when the section is unpriced. Remembering now has ONE switch per loved one (2026-09-30) that publishes to the real consent store the public memorial surface reads; the office's own memorial service (stories, messages, moderation) still waits on its contract (`lib/family/portal-coverage.ts`, pinned by test) |
| `/client/documents`, `/client/documents/receipts/[reference]` | ⚠ the family's own papers (service contract, official receipts) always show; a receipt copy prints only from a record that carries number+date+amount, else 404. The dashboard's Papers box opens a popup listing every paper, each readable as the shared `PaperSheet` HTML and, when the record is whole, as the family's own guarded PDF (`/api/family/papers/receipt/<ref>`, inline, `private, no-store`) |
| `/client/support` | ✅ the client's real numbers/places with the office call as the action |
| `/client/messages` | ✅ the family's own durable thread with the office (the admin plan's chat, §9.6): the recorded seed + the family's sent messages, with file attachments, through the guarded `GET/POST /api/chat/threads/<id>`; the thread is the one whose participant is this account, so a family can only open its own. Server-rendered + a short poll — the screen states there is no live push. Record: [`admin-chat-design/`](../admin-chat-design/README.md) |
| `/client/profile` | ⚠ partial; device-local reading preferences are real |
| `/client/inquiries` | ✅ the family's OWN plan & lot inquiries (captain, 2026-10-02): reads the same durable enquiries journal the office board reads, filtered to the account (`lib/api-client/family.ts::listFamilyInquiries` → `listFixtureInquiriesForUser`), newest first, each row naming the item, when it was received and the office's state in plain words. A service/product inquiry (no account) never appears. Empty state starts the flow to `/plans` and `/map?tab=lots` |
| `/client/ask` | ✅ the family plan/lot inquiry GATE: every plan/lot action on the storefront links here carrying the item/SKU/price; a signed-out visitor is sent to `/client/login?next=<this URL>` and returned after sign-in, and a signed-in press records the inquiry against the account through `POST /api/family/inquiries` |

## Platform operator surface — `app/(platform)/platform`

Belongs to the **platform**, not to any tenant (classification:
`docs/02-architecture/platform-administration.md`). The operator entry point is
`/platform/sign-in`, reached by URL: no product menu links here (the guard is
`tests/unit/platform-screens.test.tsx`), `/platform/` is disallowed in `app/robots.ts` and the
surface sets its own `noindex`. Every screen is marked with the operator-surface wording
("not the funeral product") and says what the platform must provide.

| Route | What it serves |
|---|---|
| `/platform/sign-in` | ⚠ the operator door — a distinct design (not the shared SignInCard): platform admins are a separate identity type outside the tenant hierarchy; the form checks its entry and then says nothing was sent (no platform identity service exists) |
| `/platform/tenants`, `/platform/tenants/[id]` | ⚠ tenant management — the recorded sample list (state · plan · address) and one tenant's record (administrator · subdomain · provisioned date), read-only; names the provisioning requirements and the deferred work (suspend/delete, custom domains, usage metrics, platform audit) |
| `/platform/sign-up` | ⚠ tenant sign-up — a designed two-step flow (business + subdomain, then first administrator) that creates nothing; shows the Configure → Import → Train → Go live sequence |

Data is `lib/fixtures/platform/tenants.json` (APP-AUTHORED SAMPLE records with provenance —
every row `sample: true`, named as a sample, on `.example` addresses; `lib/api-client/platform.ts`
refuses an unmarked row and offers no live mode), pinned by
`tests/fixture-contract/platform.test.ts`. The app's cosmetic staff tenant switcher
(`lib/demo-tenants.ts`) is unrelated.

## Agent portal — `app/(agent)/agent`

14 routes (`dashboard`, `prospects`, `prospects/[id]`, `clients`, `clients/[id]`, `sales`,
`lots`, `applications`, `appointments`, `marketing`, `new`, `profile`, `performance`, `quote`):
⚠ all read one provisional agent-workspace fixture — no agent/commission contract exists, so
commission amounts are `null` by design and the pages say so. `/agent/lots` mounts the same
shared park map as `/staff/property` and `/map`. `/agent/clients/[id]` reads the demo household
(`client-cory`), whose name, plans, money, lots, office-released papers and visits are DERIVED from the
family's own record (`lib/fixtures/family/*`) rather than copied, so the agent and family
portals tell one story — `tests/unit/demo-consistency.test.tsx` renders both and fails on
drift (record: [demo data consistency](../demo-data-consistency-design/README.md)).

The workbench (captain's accepted plan `data/villa-agent-portal-plan`, 2026-10-01):
`/agent/dashboard` is a compact-header workbench — one hero figure + an inline vitals ribbon,
the pipeline stage-flow, one analytics band and eight panels — and `/agent/performance`
carries the full analytics. The only real series is the value entering the pipeline, cumulative
from each lead's recorded first-contact date; **value closed, conversations, collections and
commission are named empty states** because the record has no agent-attributed, dated series
(the plan's §7.1 finding). `/agent/quote` prices a plan or lot from the office's editable 2026
pricing store and prints the sheet through the shared paper layer (`property:read`). The
collapsible rail and account chip are the shared portal chrome, and `/agent/profile` reads the
office's own agent record (name, email, office number) for both the screen and the chip — with an
honest initials disc because no agent picture is recorded
([record](../agent-profile-design/README.md)). Every box that IS a link (the brief lead, the
vitals ribbon, the tool tiles, the panel/flow open actions) answers on hover and keyboard focus with
the sky control wash; a box that does not link stays still, so no content box wears a false
affordance ([record](../dashboard-hover-design/README.md)). **The same grammar now reaches the
portal's list surfaces**: every `/agent/prospects` row and every `.ag-filter` chip on both list
screens answer on the pointer AND on keyboard focus with the one sky control wash, so the pair
(`/agent/prospects` · `/agent/clients`) reads by one rule; the header band, the panels, the search
form, the note and the empty state stay still, so no content box wears a false affordance
([record](../agent-list-hover-design/README.md)). `/agent/lots` still prints a
**type-summary** availability count that its own map does not match (16 vs the property
record's 8-of-12); that reconciliation is still open.

`/agent/appointments` reads the same workspace as a MONTH CALENDAR (captain, 2026-10-02):
every recorded appointment is marked on its Asia/Manila day, a dated task is marked beside it,
the legend names each state in words, and the selected day's detail (who · what · time · place ·
what to bring · state) sits beside the grid on a wide screen and under it on a phone. The Today
drive order and the small promises stay above the grid, so no recorded fact is lost.

The same screen is the agent's own **day planner** (captain, 2026-10-02): pick a day, add what
to do with an optional time and note, mark it done, edit or remove it. A plan is the agent's own
note and is **demo-local** — it appends to the same journal pattern as the acquisition pipeline
(`AGENT_PLAN_STORE_PATH` / `.data/agent-plans.json`) through the guarded
`POST/PATCH/DELETE /api/agent/plans[/:id]`, and `lib/api-client/agent.ts` folds it so the
calendar, the day detail and the dashboard notice read one source. Plans sit beside the office's
read-only appointments, ordered by time; the grid marks a planned day with the sky plan role
named in the legend. Nothing books a slot and no reminder outside the portal is promised.

`/agent/dashboard` opens with a quiet, dismissable **Today's plan** band built from the same
fold — the count of open plans and the next open thing, with a link to the day
(`/agent/appointments?day=…`). No availability is invented and no office sync exists — the
office still confirms every slot.
Record: [agent day planner](../agent-day-planning-design/README.md);

`/agent/messages` is the agent's own durable thread with the office (the same chat store, §9.6),
the admin↔agent half of the board. It reads and writes the thread whose participant is this
agent, with the composer's Attach/Send and the same honest transport line; `AGENT_PORTAL_GROUPS`
carries the rail entry. Record: [admin chat](../admin-chat-design/README.md).
[agent appointments calendar](../agent-calendar-design/README.md).

The `/agent/sales` money page is a statement **table** now (line · basis · credited · state ·
amount) — the plan's PR-4 grammar — with the four-state path and the seven configurable bases as
compact legends. Every amount stays `₱—` because the client has not fixed commission rates; the
reason is stated once and the office number is one tap (record:
[agent sales](../agent-sales-design/README.md)).

The lead record's **step-by-step acquisition is live in fixture mode** (2026-10-01):
`POST /api/agent/prospects/:id/stage` (guarded by the agent portal session and the record's owner,
no invented `crm:*` scope) appends a move to the demo-local journal (`AGENT_STORE_PATH` /
`.data/agent-pipeline.json`), and `lib/api-client/agent.ts` folds it so the record, the board, the
dashboard stage-flow and pipeline value, the conversion funnel and the client book all read one
record. A prospect becomes a client at `sold` (record:
[agent acquisition](../agent-acquisition-design/README.md)); crm-families and the live contract
still wait, and lot holds, payments, orders and document uploads stay honestly disabled.

`/agent/prospects` now opens a **Board** mode beside the list (`?view=board`, captain
2026-10-02): one column per PRD stage — empty stages included — with drag-and-drop and a
keyboard Move control, and every placement records through that same stage route and journal, so
the list, the dashboard stage-flow and the funnel follow. The board is wide-screen only; below
48rem it yields to the list and says where it lives, so the page keeps working at 390 with no
sideways scroll (record: [agent prospect board](../agent-prospect-board-design/README.md)).

## Absent (not routes yet) — needs a contract or a decision

The platform-admin screens (tenant management, platform login, sign-up) are designed screens
now — see the platform section above — but still wait on the platform's own tenancy/identity
services. See the audit's §7.2/§7.3 for what each one is blocked on, and
[front-end complete](../frontend-complete.md) for the current platform-contract list.

Screens exist but their services do not: the commission engine (the screen is real, the
figures are blank by design), the Smart Service Builder's live pricing/availability engine
(the screen is an estimate), the digital-memorial service (the screens render the honest
states), the lot-lifecycle records (recorded fixture) and the app-authored admin stores
(catalogue, pricing, orders, chapel admin, provisional receipts, membership, preparation,
guarantee instruments, **lifecycle** — all answer the named 503 in live mode or serve fixture
mode only).

The AI Copilot's MODEL is the one absence the screen itself states. `/staff/copilot` is a real
route — four recorded questions answered by lookup, every finding carrying its record trail,
the governance boundary and the not-connected state printed on the page — and nothing is
generated there, because attaching a model waits on an AI-governance contract the client has
not answered (`docs/07-client-villa/open-questions.md` §Operations & governance).

The editor's **photo upload is app-authored and shipped** (P4 of the PDP plan):
`POST /api/content/media` (gated `catalog:write`, the content-save seam) writes the
already-downscaled bytes under `MEDIA_UPLOAD_DIR` (default `.data/media-uploads`, inside the
production `.data` volume) and `GET /api/media/[...path]` streams them with long cache headers;
the content document stores the short `/api/media/<id>.<ext>` path, never a base64 data URL.
What waits on the platform is the **object store behind it — C12** (`documents-api-v1` upload
Deferred; `data/villa-platform-contracts-plan/report.md`): when it freezes, only
`lib/media-upload.ts`'s backing store swaps to S3/CDN and the document field is unchanged.

## Standing rules

- ✅ means real data and RBAC — not just "the route exists".
- ⚠ pages must name **what unblocks them** (contract/service), not just exist.
- Never render a screen pretending to have data it cannot fetch; a route that cannot exist
  honestly stays absent.
- Re-run this checklist before every demo; update the row in the same PR as the screen.
