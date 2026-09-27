# AGENTS.md — `app/(staff)` (Admin Portal surfaces and content authoring)

> Nested instructions. A harness that loads `AGENTS.md` files discovers this file when a
> session touches a file under `app/(staff)/`, and it is not loaded before then.
> The cross-cutting rules stay in the repository-root [`AGENTS.md`](../../AGENTS.md). Read that first.

## Content catalogue — Pages & content, five page documents (read before touching page-level content)

- **Phase 0+1 of `data/villa-content-catalog-plan/report.md` (captain review 2026-09-21).**
  `/staff/landing` is the page HOME listing five documents: Home · Villa Memorial
  Park · Funeraria Memorial Services · Villa Memorial Plan · Coffins & caskets.
  Home is the existing landing/FAQ document edited by the full editor at
  `/staff/landing/home`; the other four are
  **page documents** seeded in `lib/fixtures/content/pages.json` (recorded from the
  pages' current copy), read/written by `lib/api-client/content-pages.ts` (no
  upstream content service exists, so this is an app-authored seam and the
  contract ask travels with the PR) and saved through
  `POST /api/content/pages` (`catalog:write` provisionally, like the landing
  route). **Both content stores are DURABLE** since 2026-09-27 — append-only
  journals on the shared mechanics in `lib/api-client/journal.ts`, at
  `CONTENT_PAGES_STORE_PATH` / `LANDING_STORE_PATH` or under `.data/` — so a
  staff edit survives a restart and reaches every instance. They kept edits on
  `globalThis` before that, which lost every one of them on restart; evidence in
  `docs/08-delivery/phase2-design/`. Editor: `components/content/page-document-editor.tsx`; renderer:
  `components/content/content-blocks.tsx`.
- **One pure model: `lib/content-catalog.ts`** — the PageDocument + CatalogueEntry
  shapes, the shared block vocabulary (paragraph · bullets · checklist · steps ·
  gallery · table · priceTable · priceList · note · links), the tolerant reader
  and the save validator that the store, the BFF route and the editor all run.
  A price block stores a REFERENCE — a catalogue SKU or a
  `CONTENT_RATE_REFS` name (`plans.regular` / `plans.senior`) — never an amount;
  the validator resolves it against the LIVE catalogue + pricing stores and
  refuses a dangling ref. A sample image requires its caption; every authored
  string passes the one glyph gate (`lib/text-gate.ts`, re-exported by
  `lib/api-client/landing.ts`). Tests: `tests/unit/content-catalog.test.ts`,
  `tests/unit/content-pages-store.test.ts`, `tests/unit/pages-and-content-admin.test.tsx`.
- **The park page (`/map`) is the first WIRED surface**: its hero (eyebrow,
  headline, lead, photo, and the home's background colour + transparency
  control) + tabs (Park view · Lots) + blocks come from the park document, so an
  edit reaches the page on its next request. The Lots listing is a tab of the
  page; `/lots`, `/lots/[id]` and `/lots/price-list-2026` stay as routes
  (captain-confirmed). The tab passes `syncUrl={false}` to `LotListing` — the
  map's query string belongs to the map. Evidence:
  `tests/unit/park-page-content.test.tsx`.
- **Public nav names are the captain's full forms** (Funeraria Memorial
  Services · Villa Memorial Plan · Villa Memorial Park) in the bar, the flyout
  and the footer. The bar's middle track is `minmax(0, 1fr)` and scrolls the
  chips on narrow desktops (never letting them paint under the brand); phone
  rules keep the wordmark ellipsis and the 44 px targets. **The bar's structure
  is captain-fixed (2026-09-21): five top-level chips — Home · Funeraria
  Memorial Services · Villa Memorial Plan · Villa Memorial Park · Contact —
  plus the grouped "Explore more" menu carrying exactly Builder · Facilities ·
  Gallery · Memorials · Price list.** The standalone Lots chip is deliberately gone (lots
  live inside Villa Memorial Park); the phone bar's third target and its sheet
  are "Explore more" too. **The captain removed the whole utility row
  (`anchored-header__utility`) on 2026-09-21** — location · hours, the
  "Immediate assistance" chip and the 24/7 call button. The bar is one row; the
  number stays reachable in the footer, `/contact`, `/immediate-assistance` and
  the phone action bar, and `SiteHeaderBar` no longer takes a `contact` prop.
  `SITE_NAV_LINKS`/`EXPLORE_MORE_LINKS` in
  `components/landing/site-header.tsx` are the authority. Pinned by
  `tests/unit/public-nav.test.tsx` + `tests/unit/landing-view.test.tsx`.
- **Phase 2 — the Plans page (`/plans`) and the consolidated Price list
  (`/price-list`) are the WIRED plan surfaces (trimmed by the captain
  2026-09-21).** The "Villa Memorial Plan" page document
  (`lib/fixtures/content/pages.json`, `blocks: true` in
  `lib/content-catalog.ts`), edited at `/staff/landing/plans`, still owns the
  five tiers, per-tier inclusion checklists, the package table, eligibility,
  senior terms and the five plan notes. **`lib/plan-content.ts` is the ONE typed
  reading** (stable ids `plans-tier-<id>`, `plans-package`,
  `plans-eligibility`, `plans-senior-terms`, `plans-note-<key>`, edited blocks
  keep their ids) and every plan surface reads it — `/plans`, `/price-list`,
  `/plans/[sku]`, `/lots/price-list-2026`, `/builder` and
  `components/villa/plan-terms-display.tsx` (the staff membership screens) — so
  one edit lands together. The presentational constants
  `VMP_PACKAGE`/`VMP_ELIGIBILITY`/`VMP_NOTES`/`VMP_INCLUSIONS`/`SENIOR_TERMS`
  are RETIRED; the sheet figures stay pinned by `tests/unit/villa-pricing.test.ts`
  through the document. **NET `/plans` = the hero + the five tier cards + the
  View packages and Coffins & caskets chips**: the captain moved the four chips
  (2026 plan payments · Compare · Products & price list · Senior citizen rates),
  the package/eligibility/notes blocks and the 2026 payment-mode tables onto ONE
  new page, **`/price-list` (named "Price list")**, whose only entry point is
  the grouped "Explore more" menu. `/plans/villa-memorial-plan`,
  `/plans/senior-benefits` and `/plans/compare` redirect to `/price-list`
  (next.config.ts) and the `/packages` listing redirects to `/plans/PKG-BASIC`;
  the package detail routes stay. **Rates stay a live read** (pricing store +
  `planRateOf`; each tier card prints its own monthly from the store) and **no
  amount is authored into a block** — `CASH_ASSISTANCE` stays the sheet constant
  and price blocks keep their SKU/rate-table binding. The mixed 42-item
  catalogue LEFT `/plans` (services → `/services`, caskets → `/products`).
  Evidence + before/after shots: `docs/08-delivery/content-plans-page-design/`
  plus `docs/08-delivery/price-list-nav-design/`; tests
  `tests/unit/plans-page-content.test.tsx` + `price-list-page.test.tsx` +
  `retired-routes.test.ts` + `plan-content.test.ts` +
  `pricing-admin-render.test.tsx`.
  **The five tiers are ONE ROW of premium cards on desktop** (captain
  2026-09-21: the premium card pass, then "the five tier plan make it 5 plan
  per row"). `components/villa/plan-tier-card.tsx` renders name · a fixed
  "Starting from" subtitle · the live monthly rate · the editable one-line
  `summary` · one prefilled-request action (`planRequestAction`) · the inclusion
  checklist PRINTED under "Key features:" (never a `<details>`) · an optional
  leading photograph. `.plan-tiers` is one comparison row — 5 across from 86rem,
  then 4/3/2 as the viewport narrows and 1 on phones (the wrap ladder is pinned
  by `tests/unit/plans-tiers-layout.test.ts`, which also fails the retired
  two-column card), and every card is a single vertical stack; on the five-row
  the name and rate step down one ladder rung so a ~253px card stays legible.
  The optional fields live on the checklist block (`summary: string`,
  `image: ContentImage | null`); a fresh checklist reads/opens `printed`, and a
  sample image still needs its caption. Design records + 1440/390 shots:
  `docs/08-delivery/plans-tiers-premium-design/` (the premium pass) and
  `docs/08-delivery/plans-tiers-five-row-design/` (the five-row pass).
- **Phase 3 has LANDED — the Services page is one hero → straight to the services.**
  The hero and the service descriptions are the `services` page document (stable
  block ids `services-alacarte-*` / `services-chapel-*`, read by the ONE typed
  module `lib/service-content.ts`); the three guide pages (`/services/death-at-home`,
  `/services/death-at-hospital`, `/transport`) are editable SERVICE ENTRIES
  (`lib/fixtures/content/service-entries.json` + `lib/api-client/content-entries.ts`,
  edited by `components/content/catalogue-entry-editor.tsx` at
  `/staff/landing/service-entry/[key]`, listed from `/staff/landing/services`).
  The chapel card NAMES and capacity read the park's chapel record
  (`getChapelSchedule()`), so a rename on `/staff/schedule` reaches the card and
  the booking dialog together (`tests/unit/chapel-storefront-sync.test.tsx`). The
  subnav/steps sections and `components/villa/services-subnav.tsx` are retired.
  Evidence + before/after shots: `docs/08-delivery/content-services-page-design/`;
  tests `service-content`, `content-entries-store`, `service-entry-page`,
  `pages-and-content-admin`.
- **Phase 4 has LANDED** (`docs/08-delivery/content-catalogue-cleanup-design/`):
  the casket and package **item entries** (`lib/catalogue-content.ts` +
  `lib/api-client/content-entries.ts`, edited at `/staff/catalog/[id]/content`)
  add the ecommerce-style half — a long description (`entry.summary`), photos and
  ordered **content blocks** (specifications, dimension tables, inclusions, notes)
  — with a price block bound to a live catalogue SKU, never an amount. The entry's
  identity (title/group/price) is DERIVED from the catalogue record on every read,
  so a content edit can never rename a product or move a price; `/products/[sku]`
  and `/plans/[sku]` render the entry's summary and blocks. The Commerce nav is
  consolidated to the captain's §6.1 shape (Pages & content · Catalog · Pricing
  rules · Inventory · Orders · Memberships) and the `/staff/plans/[id]`/`new`
  stubs are retired. The plan-tier **entries** (as opposed to document blocks)
  remain out of scope.
- **Phase P1 has LANDED — the catalogue entry carries the PDP content, and the
  PDP renders it** (plan: `data/villa-pdp-cms-plan/report.md` §4–7; P0 model in
  `lib/content-catalog.ts`). An item entry's authored half is `description`
  (`RichTextDoc`, a typed node tree — NEVER HTML), `gallery` (ordered, uncapped,
  `ContentImage[]`) and `specs` (`ContentSpecs`, ≤15 columns, unlimited rows);
  **money stays a live `PriceBinding`, never a specs cell**. The entry store is
  now DURABLE (`lib/api-client/content-entries.ts`: append-only journal,
  `CONTENT_ENTRIES_STORE_PATH` or `.data/content-entries.json`), the same pattern
  as `catalog-store.ts`; the identity (name/group/price) is still derived from
  the catalogue record on every read. The admin editor
  (`components/content/catalogue-entry-editor.tsx`) gains three sections —
  **Description** (zero-dep toolbar, `components/content/rich-text-editor.tsx`),
  **Photographs** (`components/content/gallery-editor.tsx`; library/device/URL via
  the shared `MediaPicker`, drag + arrow reorder, remove) and **Specifications**
  (`components/content/specs-editor.tsx`; paged + `content-visibility`). The
  public PDP renders `components/content/rich-text.tsx` (React elements from the
  nodes, never `dangerouslySetInnerHTML`), `components/villa/pdp-gallery.tsx`
  (main viewer + thumbnail rail; lead eager, every non-lead `loading="lazy"`) and
  `components/content/specs-table.tsx`. Keep the honesty states: a gallery-less
  item keeps the rule-derived `CasketSampleFigure`, a sample needs its caption,
  the seven withheld client photographs are never suggested, and the seven-tier
  substitution note prints when a sample is shown. `parseEditorHtml` keeps only
  the product's tags, so a pasted `<script>` never survives. Evidence + 1440/390
  shots: `docs/08-delivery/pdp-fields-design/`; tests `pdp-gallery`,
  `catalogue-entry-page`, `catalogue-entries-store`, `content-entries-store`.
- **Phase P2 has LANDED — the PDP's variant selector** (plan §5–7; the captain's
  Q1/Q4/Q6). A **line = the sheet's collection** (four, derived in
  `lib/product-line.ts`, never hand-listed) and **variant = each model**; the
  line document is DURABLE (`lib/api-client/product-lines.ts`, seed + atomic
  journal, `PRODUCT_LINES_STORE_PATH` or `.data/content-product-lines.json`,
  written through `POST /api/content/product-lines`, `catalog:write`, handler
  rules-free) and edited by `components/content/product-line-editor.tsx` on a
  casket's item content screen (line name · ordered membership · shared specs ·
  a link to each model's own editor). The page resolves the line and every
  sibling entry **server-side in one pass** and passes plain data to
  `components/villa/product-detail.tsx`, so selecting a variant swaps gallery,
  price, `resolveSpecs(line, variant)` and rule-derived facts locally; the
  selector is a labelled `role="radiogroup"` with `aria-checked` + an
  `aria-live` line, and `history.replaceState` keeps the per-SKU URL (canonical
  stays per-SKU). Imagery fallback: the variant's own gallery → the rule-derived
  sample (caption + sheet note) → an honest text placeholder; a line-level shared
  gallery is NOT in the P0 `ProductLine` type. Evidence + 1440/390 shots:
  `docs/08-delivery/pdp-variants-design/`; tests `product-line`, `pdp-variants`.
- **Phase P3 has LANDED — the PDP is the Amazon structure in our tokens** (plan
  §6; the captain's 2026-09-21 removal direction). The legacy bespoke blocks are
  GONE from `/products/[sku]`: the long sample caption/tier note, "This model at a
  glance" (`CasketFacts`/`CasketPriceGrid`), "What comes with this model"
  (`CasketInclusionPanel`), "How the five tiers are shown" (the `COFFINS` strip),
  the five-link row and the sibling row (their CSS was pruned too). The page is
  now a `.pdp-layout`: a sticky `.pdp-media` gallery (≥64rem) beside the `.pdp-buy`
  box (eyebrow · variant h1 · lead · selector · live price + senior line ·
  availability/trust lines · one primary CTA), with `.pdp-below` full width — the
  editable rich description, the authored `bullets` blocks as feature bullets,
  the `SpecsTable` and the rest of `ContentBlocks`. Below 64rem it stacks
  gallery → buy box → content. `PdpGallery` owns a `useModalFocus` zoom dialog
  (natural-size pan frame); every non-lead image is lazy. Nothing visible is
  rule-authored prose and money stays a live catalogue price; `casket-detail.tsx`
  keeps only `CasketSampleFigure` for the no-gallery fallback. Evidence + 1440/390
  shots + page weights: `docs/08-delivery/pdp-layout-design/`; tests
  `phone-layout`, `reading-budget`, `villa-services-premium`, `catalogue-entry-page`,
  `pdp-gallery`, `pdp-variants`.
- **Phase P4 has LANDED — media storage is the server, not a base64 blob** (plan
  §3.3/§8.2/§10; the captain's Q3). `POST /api/content/media` (`catalog:write`,
  the content-save seam) takes the browser-downscaled bytes and writes them under
  `MEDIA_UPLOAD_DIR` (default `.data/media-uploads`, gitignored, outside `public/`
  and `media-sources/`); `GET /api/media/[...path]` streams them with a one-year
  immutable cache; the document stores the short `/api/media/<id>.<ext>` path.
  `lib/media-upload.ts` is the server store + the referenced-bytes guard (a save
  refuses a `data:` URL or a path with no bytes) and `lib/media-url.ts` the pure
  client-safe helpers incl. the optional `MEDIA_PUBLIC_BASE_URL` CDN prefix
  (`ContentBlocks`/`PdpGallery`/`product-detail` take a serializable `mediaBaseUrl`
  prop). `lib/device-upload.ts` keeps the downscale (max edge 1600, JPEG q0.86 /
  PNG alpha) and uploads the bytes; never re-embed a data URL in a saved document.
  The platform's object store is C12 (Deferred) — a no-op swap of the backing
  store; ask recorded in `docs/08-delivery/open-items.md` §5. Evidence + the
  captured upload/serve/document output: `docs/08-delivery/pdp-media-storage-design/`;
  test `tests/unit/pdp-media-upload.test.ts`.
- **Public chrome is ONE grammar** — every public page (the home AND all
  `(public)` routes) renders the same anchored navigation bar + footer
  (`components/landing/site-header.tsx` SiteHeaderBar + LandingFooter, fed by
  the landing content doc). The home's LandingView stays framework-free (no
  router) — it renders the bar without an active highlight; interior pages add
  aria-current via usePathname + the live cart count in the same component.
  Never introduce a second public header/footer class set; if you must change
  the bar, change SiteHeaderBar + the "anchored catalogue home" CSS block and
  it lands everywhere automatically. The three catalogue page names are the
  captain's full forms — `/services` "Funeraria Memorial Services", `/plans`
  "Villa Memorial Plan", `/map` "Villa Memorial Park" — in the bar, the mobile
  flyout, the footer and the pages' own titles/h1s; don't shorten them. The
  footer itself carries ONE entry per destination (captain, 2026-09-21): the
  plan lives in Care & planning, the park's one entry is the contact block's
  `Map & directions →` against the brand wordmark (never a second
  "Villa Memorial Park" link), and the labels are the live page names
  (`Coffins & caskets`, `Memorial lots`). `tests/unit/landing-view.test.tsx`
  pins the de-duplicated list and every href; record + 1440/390 shots:
  `docs/08-delivery/footer-cleanup-design/`. Because
  those labels are wide, the CSS block tightens `.anchored-header__nav` chip
  padding below 85rem so the phone chip and "Sign in" never wrap; keep both.
  The rails hide their scrollbar until hovered (.anchored-rail). Blog posts
  carry an optional `link` (set in the
  "/" editor) that makes the post's photos/caption navigate; seed posts ship
  sensible internal routes.

## Chapel administration — staff side (read before touching chapel settings/availability)

- **One store, two faces.** `/staff/schedule` (the chapel sections) and the customer dialog
  read the same chapel records: `lib/api-client/chapel-store.ts` (seed
  `lib/fixtures/scheduling/chapel-admin.json`; journal `CHAPEL_STORE_PATH` or
  `.data/scheduling-chapel-admin.json`, gitignored — atomic writer like the orders store).
  Closing a range or deactivating a chapel changes what a customer can book on the NEXT
  read; nothing caches it.
- **The screen leads with the day board** (`?date=`, default today): the selected day's
  bookings across every resource — time, resource, booking, case, state — through
  `lib/schedule-board.ts` (pure: UTC day keys, instants printed in Asia/Manila, a multi-day
  stay appears on every day it covers). The service's own `conflicting` flag is shown,
  never recomputed: an `Overlap` badge on the row plus a page-top strip naming every flagged
  booking and linking it to its day. Chapel settings/availability/bookings follow the board.
  The availability month grid is `.chapel-month` — never `.chapel-grid`, which the public
  services stylesheet owns (a later same-specificity rule reflows it to two columns).
- **Rules**: `lib/chapel-admin.ts` (pure — chapel records/validation, closed ranges,
  operator status `hold → confirmed / cancelled`, the free·held·booked·closed month grid);
  server orchestration `lib/api-client/chapel-admin.ts`; BFF routes
  `/api/schedule/chapels`, `/api/schedule/chapels/[id]`, `/api/schedule/chapels/[id]/blocks`,
  `/api/schedule/chapel-blocks/[id]`, `/api/schedule/bookings/[id]/confirm` (+ the cancel
  route below). All need `scheduling:write`; the shared gate is `app/api/schedule/_guard.ts`.
  UI is route-local: `app/(staff)/staff/schedule/chapel-{settings,availability,bookings}.tsx`.
- **Delete = deactivate.** An inactive chapel keeps its bookings and calendar but leaves the
  storefront (`getChapelSchedule` filters it); a chapel added on the screen becomes a
  fixture-mode scheduling resource (`app-chapel-…` ids merged by `listResources()`), names
  are unique, and capacity/notes are staff-editable. The PLACEHOLDER notice on the card is
  the client-question flag — the park's real chapel list is still unconfirmed.
- **Cancelling a chapel booking requires a reason.** `POST /api/schedule/bookings/:id/cancel`
  routes chapel bookings through `cancelChapelBooking` (cancel on the service FIRST — that
  frees the dates — then record the reason app-side; booking-events-v1 carries no reason
  field). Any other resource keeps the plain proxy. The generic `CancelBookingButton`
  (`components/schedule-actions.tsx`) grows the reason form via its `chapel` prop.
- **Holds vs confirmed.** A booking whose title carries `ONLINE_CHAPEL_BOOKING_MARKER` is
  "only in a customer's cart" until staff confirm it or checkout claims it. The claim
  (`POST /api/chapel/bookings/[id]/claim`, called best-effort by
  `app/(public)/checkout/page.tsx` right after the order 201) is app-authored: the frozen
  checkout contract still sends only `{sku, quantity}`, so the page that still holds the
  reservation ids links them, and the server checks the order really carries that chapel
  class line for that many days. A failed claim leaves an ordinary hold.
- **Live mode**: booking-events-v1 has no resource write endpoint and no maintenance-window
  shape, so settings/closures/confirmations answer 503 (`CHAPEL_ADMIN_NOT_WIRED`) instead of
  inventing a contract; the chapel slice of the schedule still reads.
- Evidence: `tests/unit/chapel-admin.test.ts` (closure → refusal, cancel frees + records the
  reason, add/rename/deactivate, claim), `tests/unit/chapel-admin-rbac.test.tsx` (401/403,
  page gating, same-store effects), `tests/unit/schedule-board.test.ts` +
  `tests/unit/schedule-page.test.tsx` (day board, overlap strip, empty-day pointer, reading
  budget, month-grid class), `tests/fixture-contract/chapel-admin.test.ts` (seed pinned
  to the scheduling resources fixture + the fallback rules).

## Villa Memorial Plan membership applications — `/staff/plans/membership` (F-18 / FORMS_PLAN gap 4)

- **The enrolment folio is a CAPTURE, never a certificate.** `/staff/plans/membership` is the
  register + the plan's published-terms display, `/new` is the folio (holder · who the plan
  protects · branch · tier × payment mode · declarations), `/[id]` is one recorded application
  plus its **application paper** (shared `PaperSheet` + `PaperExportActions` → print/Word/PDF).
  `APPLICATION_NOT_A_COC_NOTE` prints on every screen and on the paper's face: the office issues
  the real membership document — never imply the app issued a COC. No COC number, coverage
  dates or clause text exist anywhere: the signed membership/COC paper is not archived in this
  project (`docs/07-client-villa/paper-forms/` has only the service contract + lot papers; the
  paper wins), and no membership-record contract is frozen (pre-need partner, Eternal Plans).
- **One rules home: `lib/contracts/membership-application.ts`** (relationship vocabulary from
  the client's own list; normalisation; `membershipApplicationIssues` — the SAME structural
  validation the store and the folio's readiness gate run; the honest-state copy). Paper:
  `lib/contracts/membership-paper.ts`. The rate is READ, never typed: the page passes
  `loadPricingDocument()` down and every figure comes through `planRateOf`; the record stores
  the amount as read, so a later rate-card edit never rewrites a recorded folio.
- **Durable fixture store**: `lib/api-client/membership-store.ts` (seed
  `lib/fixtures/commerce/membership-applications.json` + append-only journal,
  `MEMBERSHIP_STORE_PATH` or `.data/commerce-membership-applications.json`, gitignored).
  `POST /api/memberships/applications` only (handler rules-free); live mode (`COMMERCE_BASE_URL`)
  answers 503 `MEMBERSHIP_ADMIN_NOT_WIRED`. Scope is `catalog:write` PROVISIONALLY —
  `rbac-scopes-v1` names no membership code; the screen and the PR carry the ask, and no token
  outside the frozen vocabulary is invented (`staff-scope-vocabulary` stays green).
- **Nav active state is the longest match**: `activeNavHref()` in `lib/rbac/nav.ts` (used by
  `components/ui/sidebar-nav.tsx`) so the nested `/staff/plans/membership` lights only its own
  entry, while a drill-down keeps its section current. Extend that helper, not per-item prefix
  checks.
- **Do not widen**: COC issuance, underwriting, plan-value/coverage dates and any pre-need
  partner integration are platform/client matters — live mode stays a refusal until a contract
  freezes. Evidence: `tests/unit/membership-application.test.ts`,
  `tests/unit/membership-admin-rbac.test.tsx`, `tests/fixture-contract/membership.test.ts`;
  design record + shots `docs/08-delivery/membership-folio-design/`.

## Staff shell on phones — one nav, disclosed (read before touching `components/ui/app-shell.tsx`)

- `AppShell` (staff only) wraps `SidebarNav` in `components/ui/sidebar-disclosure.tsx`. Desktop
  is unchanged (the toggle is `display: none` above 48rem). Below 48rem the nav is **collapsed by
  default** behind a 44px Menu/Close button — the previous always-open wrapped nav was ~900px
  tall, so a 390×844 phone opened on a menu and the screen itself began below the fold (craft
  pass, 2026-09-18). `aria-expanded`/`aria-controls` sit on the button; the open state is a
  full-width chip list with the section labels.
- The same pass hid `.app-topbar__context` (“Workspace”) below 48rem: the topbar group
  (context · tenant select · chip · bell · avatar) is wider than 390px and flex-end pushed it off
  the left edge, half-clipping the label on every staff screen.

## Operations board — case tasks & stage moves (read before touching `/staff/cases`)

- The case detail screen (`app/(staff)/staff/cases/[id]/page.tsx`) is the ops board's write
  surface: `task-checklist.tsx` (one `<select>` per row, immediate) and `stage-move.tsx`
  (target `<select>` + a confirm MODAL — a stage move is a real operational commitment, a task
  tick is not). Both post to BFF routes under `app/api/cases/**` gated by `app/api/cases/_guard.ts`
  on `cases:write`; the browser helper is `lib/operations/board-api.ts` (client-safe — no token).
- **One vocabulary home: `lib/operations/case-board.ts`** (pure, client + server) — stage order,
  the three task statuses, labels/tones, `nextStage`, and the contract's per-stage task template.
  `lib/api-client/operations.ts` re-exports the types; never re-declare a stage label or tone in
  a view. Legal moves are NOT re-derived here: forward-to-any-later-stage and audited backward
  moves are `case-events-v1`'s call, so the select offers every stage but the current one.
- Fixture-mode writes are DURABLE: `lib/api-client/operations-store.ts` folds
  `lib/fixtures/operations/cases.json` with an append-only journal (`OPERATIONS_STORE_PATH` or
  `.data/operations-cases.json`, gitignored, atomic + one writer per process), so the board is
  demonstrable without the platform. Live mode calls the contract's endpoints
  (`POST /cases/api/v1/cases/:number/stage`, `PATCH …/tasks/:id`) and never reads the store.
- Tasks are addressed by the contract's `tasks[].id` (seeded `<case>-t<n>`), never a title or row
  index; a task without one renders read-only with the reason. A refused write shows the
  server's message verbatim and is REVERTED/left un-moved, then re-read — never an optimistic
  success. Fixture journal corruption is a 500, not a guess.
- Evidence: `tests/unit/ops-board.test.ts` (vocabulary, store round trips, refusals, the client
  call shape) and `tests/unit/ops-board-rbac.test.tsx` (401/403/422/404, store effects, page
  render for writer vs reader, live-mode endpoints).

## Operations board screen — `/staff/ops` (read before touching the board)

- The morning screen: one lane per frozen `case-events-v1` stage, cards per case, and the case
  screen's same two writes on each card (a stage select + one confirm modal; a "Mark … done"
  tick per open task). Owner: `app/(staff)/staff/ops/` (`page.tsx` + `ops-board-view.tsx`);
  the pure model is `lib/operations/ops-board.ts` (lanes, wait ages, flags, summary), which the
  server page builds and passes to the view. Nav "Operations board" under Operations gates on
  `cases:read` like its siblings; the write controls appear only with `cases:write`. Never build
  a second write path — both calls are `lib/operations/board-api.ts`.
- **Urgency is recorded, never invented.** `Awaiting intake` is the service's own
  `deceased_name === "Pending intake"` marker; `N guarantee papers overdue` is the service
  contract's three-day term from the recorded contract date (`INSTRUMENT_FILING_DAYS` in
  `lib/guarantee-instruments.ts`, read through the case's own tracker); `Waiting Nd` / lane
  `oldest Nd` / longest-wait-first order come from the recorded `updated_at`. No client-agreed
  stage-staleness threshold exists — the page prints that basis under the board and no card is
  coloured overdue on an app SLA.
- Lanes are a flex row ≥ 40 rem (`flex: 1 1 9.5rem`, min-width 9.5 rem) inside
  `.ops-board { overflow-x: auto }` — the board scrolls, the page never does — and stack full
  width below that. Keep the lane base block BEFORE its `@media (min-width: 40rem)` override
  (class-order trap, as with `.chapel-month` vs `.chapel-grid`) and every card/list track
  `minmax(0, 1fr)`.
- Evidence: `tests/unit/ops-board-model.test.ts`, `tests/unit/ops-board-page.test.tsx`; design
  record + 1440/390/moved/empty shots `docs/08-delivery/ops-board-design/`.

## Vehicle dispatch · Work orders · Notifications — the three designed admin screens (read before touching them)

- Captain 2026-09-19: the three stubs became real screens over recorded data, each naming its
  missing platform service in one line. **Dispatch** (`/staff/dispatch`, `scheduling:read`): the
  day board + assignment view over `lib/fixtures/operations/dispatch.json` — trips link to real
  cases, drivers are HR employees; dispatch belongs to D5 scheduling-resources and no contract
  exists, so nothing writes and live mode answers 503. **Work orders** (`/staff/work-orders`,
  `property:read`): the maintenance list over `lib/fixtures/operations/work-orders.json` with asset
  links to the real schedule/property screens; the state is the recorded trail and `overdue` is
  derived from the recorded due date against the file's own `as_of` day — never a wall clock or
  an invented SLA; live mode answers 503 (field-ops unbuilt). **Notifications**
  (`/staff/notifications`, `cases:read` provisional): the four designed message types + audiences
  + channels, with the sent log EMPTY — the P4 notification service has no contract and no
  outward API, so no message may be fabricated (the family page takes the same line).
- Pure rules homes: `lib/dispatch.ts` · `lib/work-orders.ts` · `lib/notifications.ts`; tolerant
  readers `lib/api-client/dispatch.ts` · `work-orders.ts` · `notifications.ts` (502 on a malformed
  record, 503 live). Fixture-contract tests pin every cross-reference (cases, HR employees, the
  scheduling Hearse 1, lots, resources) and that no amount or fabricated send exists; page tests
  pin the rendered states; all three are in `tests/unit/reading-budget.test.tsx`.
- Evidence + shots: `docs/08-delivery/admin-ops-screens-design/README.md`.

## Staff lead record — `/staff/pipeline/[id]` (read before touching the CRM lead surfaces)

- The office's own view of one lead (PRD S4 Lead Detail), reached from the CRM area: the entry
  panel `components/crm/lead-records-panel.tsx` is rendered on `/staff/pipeline` (its list; the
  page keeps its "crm-families is unbuilt" note) and as the Customers screen's final
  "Lead records" section — one way in, one grammar. Gating is the CRM area's own `cases:read`
  (inline array, for `tests/unit/staff-scope-vocabulary.test.ts`); the page is read-only and
  carries one `h1`.
- **One vocabulary home, no second copy**: `lib/crm/lead-view.ts` re-exports the agent record's
  `lib/agent/agent-view.ts` stage words/tone (`stageMeta`/`stageTrail`/`leadSourceLabel`/
  `activityKindLabel`) and adds only the office policy (`stageBadgeTone`, `leadFollowOns` —
  plan → `/staff/plans/membership/new`, lot → `/staff/property`, services → `/staff/cases/new` —
  and `LEAD_RECORD_SERVICE_NOTE`). Never restate a stage label or source word in a view.
- Data is `lib/fixtures/crm/lead-records.json` read through `lib/api-client/crm-leads.ts`
  (strict reader, fixture-only: `crmLeadsLiveModeEnabled() === false` — no lead/customer-records
  contract exists, so setting `CRM_BASE_URL` cannot make it live). The fixture is APP-AUTHORED
  with provenance and `tests/fixture-contract/crm-leads.test.ts` pins: movement invariants
  (first move `new` at `first_contact_at`, last move the current stage at `last_contact_at`),
  enquiry fields equal to the matching `crm/inquiries.json` row, and — for a person the agent
  portal also carries — owner/stage/movement/contact/next step IDENTICAL to
  `lib/fixtures/agent/workspace.json`. Never invent a call, a move or a value; a lead with no
  activity renders the empty state. No amount appears anywhere (the test fails one).
- The office number is read from `lib/family/contact.ts`, never typed, and the one honest line
  names enquiry persistence/customer sync/lead assignment as the customer-records service's job.
- Evidence: `tests/unit/crm-lead-record.test.tsx` (the four questions, the shared words, the
  empty-activity lead, 404/403, entry points, reading budget) + `tests/unit/crm-lead-view.test.ts`;
  record and 1440/390 shots `docs/08-delivery/lead-record-design/`.

## Embalming & preparation record — staff case screen (read before touching `/staff/cases/[id]/preparation`)

- The record a family's question about the preparation is answered from: embalmer + assistant,
  the work window, the four steps in work order (embalming · dressing · cosmetics · casketing,
  blueprint crm-cases.md §12) each with its own state (scheduled / in progress / completed /
  cancelled) and its notes, plus the case's own death/identity facts. Reached from the case
  detail's "Embalming & preparation" card; `cases:read` gates it; there is NO write.
- **One home per half:** `lib/fixtures/operations/preparation-records.json` — PROVISIONAL,
  app-authored demo records (no preparation contract exists; funeral-cases is unbuilt and
  `case-events-v1` names no prep endpoint) — read through `lib/api-client/preparation.ts`
  (tolerant reader; live `OPERATIONS_BASE_URL` answers 503 `PREPARATION_NOT_WIRED`, never a
  fake endpoint). Step order, state words, Asia/Manila instants and UTC calendar dates are
  pure `lib/preparation-record.ts`; case stage/task words come from the shared
  `lib/operations/case-board.ts`, never a third copy.
- **Honest states are the deliverable:** a case without a record shows one line and the case's
  own task list (what the office records today); a case without intake says so instead of
  inventing an identity/date/location; a `completed` step or record must carry the instant it
  was recorded (the reader 502s otherwise); the screen states outright that nothing can be
  changed. Embalmer/assistant names are HR employees, never invented staff.
- Pinned by `tests/fixture-contract/preparation-records.test.ts` (case at `preparation`+ stage,
  four steps in order, work window inside the case's lifetime, agreement with the case's own
  embalming task), `tests/unit/preparation-page.test.tsx` (at-a-glance states, RBAC, one `h1`)
  and `tests/unit/preparation-record.test.ts` (pure labels/times/refusals). When a preparation
  contract freezes: replace the fixture, add the live branch, update
  `docs/08-delivery/notes/demo-web-route-coverage.md` (which lists the route).
## Lot records — Ownership · Transfers · Interments · Exhumations (F-11; read before touching them)

- The four routes hang off the lot (`/staff/property/[id]/{ownership,transfers,interments,exhumations}`),
  gate on `property:read` like the rest of the property area, share the `lot-record-tabs` row
  (`app/(staff)/staff/property/[id]/lot-record-tabs.tsx`, `aria-current`, wraps at 390 px), and
  are entered from the lot detail page's “Lot records” table (one row per record with its
  one-line state). Staff house style only: Card/table/kv/Badge/states, one `h1`, tokens only.
- **The data is the office's recorded file, and each screen names its gap once.** lot-events-v1
  (FROZEN) makes `occupied`/`for_transfer` status-only and defers the interment + transfer
  workflows; no ownership projection exists. Records live in
  `lib/fixtures/property/lot-lifecycle.json` (APP-AUTHORED example data with provenance; no
  amount/fee figure anywhere; every lot/case/document/park/customer cross-reference pinned by
  `tests/fixture-contract/lot-lifecycle.test.ts`). Reader + ownership composition:
  `lib/api-client/lot-lifecycle.ts`; pure vocabulary/summaries: `lib/lot-lifecycle.ts`. NEVER
  invent an owner, date, approval or fee — a missing datum prints as a missing state.
- Ownership is composed from records that exist (frozen Lot + captured purchase application +
  documents repository); the right-of-interment card quotes the operative rule from
  `lib/contracts/villa-terms.ts` (first sentence of the interment clause, from the revision
  governing the acquisition), never a paraphrase. Transfers use the clerk's four words
  submitted/verified/approved/completed with dated steps; interments carry the identity /
  ownership / payment / permits checks and only claim “Ground opened” where a completed case +
  verified burial permit back it; exhumations list every requirement with the next open one and
  always show the “record of what was done” (today: nothing has been done).
- Evidence: `tests/unit/lot-lifecycle.test.ts` (vocabulary + summaries),
  `tests/unit/lot-lifecycle-pages.test.tsx` (the four pages: glance order, gap lines, gating,
  one `h1`, reading budget) and the implementation record + 1440/390 shots under
  `docs/08-delivery/lot-lifecycle-design/`.

## Guarantee instruments — FSC deductions, tracked (read before touching `/staff/cases/[id]/instruments`)

- The tracker follows what happens to the LGU / DSWD / SSS / GSIS / life-plan deductions a
  case's Funeral Service Contract records: per instrument, the office's filing state, the
  agency response, the paper's three-day filing deadline and the supporting-document
  checklist. It is STATUS ONLY — no sub-ledger, no deduction arithmetic, no posting; the
  detail screen says so once (FORMS_PLAN gap 5 / issue #54 dev boundary). It never creates an
  instrument the contract did not record, and it never writes.
- **One rules home: `lib/guarantee-instruments.ts`** (pure) — the five kinds, the five office
  states (not yet filed · filed · awaiting agency · confirmed · rejected), the document
  states, `INSTRUMENT_FILING_DAYS = 3` (villa-terms clause 2) and
  `instrumentFilingDeadline()`: the deadline is DERIVED from the case's recorded contract
  date, and a missing date is the honest `unknown`, never a countdown. Amounts print from the
  record's own `amount_cents` (null → em dash); never compute, restate or invent a figure.
- Recorded fixture `lib/fixtures/operations/guarantee-instruments.json` read through
  `lib/api-client/guarantee-instruments.ts`: tolerant reader, `absent` for an untracked case,
  `not_wired` in live mode (no contract names a guarantee-instrument record). Keys to
  `operations/cases.json`; provenance in `lib/fixtures/README.md`.
- Surfaces: the compact card on the case page (right after the service-contract card — it
  must not push the case's own information down) and the folio route; both gate on
  `cases:read`. Evidence: `tests/unit/guarantee-instruments.test.ts`,
  `tests/fixture-contract/guarantee-instruments.test.ts`,
  `tests/unit/guarantee-instruments-screen.test.tsx`; render record + shots:
  `docs/08-delivery/guarantee-instruments-design/README.md`.

## Orders admin — durable fixture store (read before touching `/staff/orders`, `/api/orders`)

- Fixture-mode orders are DURABLE: `lib/api-client/order-store.ts` folds the recorded seed
  (`lib/fixtures/commerce/orders.json`) with an append-only event journal, rewritten atomically
  (temp file + fsync + `rename`) under one serialized writer per process. Path:
  `ORDERS_STORE_PATH` or `.data/commerce-orders.json` (gitignored). Tests must point
  `ORDERS_STORE_PATH` at a temp file — never the repo store.
- The frozen `OrderResponse` envelope is untouched: an `AdminOrder` merely wraps it with the
  checkout contact + an APP-AUTHORED lifecycle (`new → confirmed → fulfilled`, `→ cancelled`).
  The lifecycle never rewrites the frozen payment `status` (phase 1 does no payments/refunds).
  No contract names an order-admin record: live mode answers 503 (`ADMIN_ORDERS_NOT_WIRED`) —
  do not invent endpoints.
- Scopes (frozen `rbac-scopes-v1`): `orders:read` gates the list/detail pages, `orders:write`
  gates `POST /api/orders/:number/status` (read-only UI otherwise). List filters are
  server-driven via `searchParams` (status / q / from / to).
- Seed numbers, customers and totals mirror the billing fixture's invoices and every line's
  SKU/price is pinned to `commerce/catalog-items.json` by `tests/fixture-contract/orders.test.ts`;
  store/transition/RBAC behavior by `tests/unit/order-store.test.ts` + `tests/unit/orders-admin.test.tsx`.
  Checkout PRICES from the durable catalogue store (below), not the recorded seed: an admin's
  price edit is what checkout charges and a deactivated item answers the contract's 404.

## Billing — recording a payment & printing its receipt (read before touching `/staff/billing`, `/api/billing`)

- **The write is real, not a stub.** `billing-list-api-v1` names `POST /billing/api/v1/invoices/:number/payments`
  under `billing:write`, so live mode is a genuine BFF proxy (`app/api/billing/invoices/[number]/payments/route.ts`,
  gate `app/api/billing/_guard.ts`) and fixture mode writes the durable store. The route stays
  RULES-FREE: the one rule set is `lib/billing-payments.ts` (`validatePaymentInput` /
  `validatePaymentDraft`), run by the form, the client and the store. A payment must be a positive
  whole-centavo amount the invoice can still absorb (an overpayment or an already-paid invoice is
  REFUSED with the exact outstanding figure — the app has no credit representation), an instrument
  from the counter slip, the reference that instrument needs, and a real past calendar day.
- **The screen is invoice-anchored.** `/staff/billing/record-payment` resolves `?invoice=` / `?order=`
  (the Orders admin's link) / `?case=` (via the case's linked order) to ONE invoice and shows its
  state + what is owed + the form in the first screenful — there is no free-text "case or invoice"
  box anymore (a payment is only meaningful against a balance). The BFF response carries the invoice
  AS THE SERVER REPORTED IT and the recorded payment; a failed write changes nothing on screen (no
  optimistic balance) and shows the field-level refusal verbatim.
- **Store**: `lib/api-client/billing-store.ts` — recorded seed `lib/fixtures/finance/invoices.json`
  + append-only journal (`PAYMENTS_STORE_PATH` or `.data/finance-payments.json`, gitignored; atomic
  writer + one in-process write chain, `version: 1`, one `payment_recorded` event carrying the
  payment AND its receipt). An invoice no payment touches is returned EXACTLY as recorded; a touched
  one is re-derived through the frozen `billing-derive.ts` rules. Balance/status must be read from
  `listFixtureInvoices()` / the write response, never re-added in a view.
- **One official-receipt paper, two copies**: `lib/contracts/official-receipt.ts`
  (`buildOfficialReceiptPaper(figures, "office" | "family")`) — the counter's sheet and the family's
  copy are the same document, so `lib/family/family-documents.ts` now delegates to it (its exports and
  output are unchanged). A cell prints only when the record carries it; `receiptHasFigures` is the
  gate, and a record without number + date + amount prints NOTHING (`NO_RECEIPT_NOTE` says so and the
  counter still gets the clearly-labelled provisional slip).
- The receipt's printed number IS the documents row's `document_number` (`DOC-YYYY-NNNNN`, allocated
  above the documents seed), and `lib/api-client/documents.ts` lists issued receipts beside the seed —
  so the counter's print, the family's copy and `/staff/documents` can never name different receipts.
  `file_size_bytes` is 0: fixture mode stores no rendered artifact.
- **Open contract asks (do not quietly widen)**: the POST body is APP-AUTHORED (`{amount_cents,
  method, reference, received_on, notes}`) and the POST response is undefined — a live payment
  therefore carries `receipt_document: null` unless the service actually named one, and
  `listPaymentsForInvoice` reports `listed: false` in live mode (no payments-list endpoint exists;
  a live receipt is a documents-repository row). The counter instrument vocabulary is
  `PAYMENT_INSTRUMENTS` (cash · check · bank transfer · GCash) — the frozen `payment.completed`
  enum is a subset plus `card`, and adding one is a client-vocabulary decision.
- Evidence: `tests/unit/billing-payments.test.ts` (rules · refusal copy · fold), `billing-payment-store.test.ts`
  (durability · allocation · a refusal writes nothing · repository consistency),
  `billing-payments-rbac.test.tsx` (401/403, page gating, a session's payment steps the list and the
  repository), `billing-live-write.test.ts` (the app-authored body + the honest null receipt),
  `official-receipt.test.ts` (both copies carry the same figures), `record-payment-screen.test.tsx`.

## Commission — staff engine screen + agent statement (read before touching commission figures)

- **F-12 (captain 2026-09-18): `/staff/commission` is the commission-engine admin screen; the
  agent portal's approved page 08 (`/agent/sales`) is unchanged and stays the agent's view.**
  The client has never given rates or targets (`docs/07-client-villa/open-questions.md` —
  "Commission rules and rates") and the engine is deferred platform scope
  (`docs/04-modules/finance-billing.md` §Commissions), so **every rate-derived amount on both
  surfaces is blank + marked “Not configured” (`₱—`), never a zero and never a percentage.**
  Adding a rate constant, a default or a computed commission breaks the fixture contract below
  and misrepresents the client — don't.
- Data: `lib/fixtures/finance/commission.json` records the unconfigured engine state (period and
  target null, nothing issued) with provenance; `lib/api-client/commission.ts` is the tolerant
  reader and composes the real half from the durable order store (`listOrders()`) — the sales
  that happened, no rate applied. The engine's vocabulary (seven bases, four states + reversal,
  the PRD capability list) has ONE home in `lib/commission.ts`;
  `tests/fixture-contract/commission.test.ts` pins it to the agent workspace fixture so the two
  surfaces cannot describe different rules, and walks the fixture to fail on any numeric leaf or
  rate-like key. `tests/unit/commission-page.test.tsx` pins the screen (one h1, real sales,
  blanks, the office next step); `tests/unit/commission-view.test.ts` pins the pool split.
- The page leads with the state (alert + KPI tiles), then the calculation shape, then the real
  orders with a blank Commission column, then one next step — the office's own line from
  `lib/family/contact.ts`, never typed. It gates on `billing:read` provisionally (no commission
  scope exists in `rbac-scopes-v1`); evidence shots + record: `docs/08-delivery/commission-design/`.

## Admin data screens — Inventory · Accounting · Reports (read before touching them)

- Three designed, read-only screens over recorded data replace the old stubs. Each names its
  missing platform service in ONE line (the constant in its reader) and then shows its table —
  never re-add a stub or a second honest-state grammar. Live mode is unimplemented and named in
  the module: `lib/api-client/inventory.ts`, `lib/api-client/accounting.ts` are fixture-only;
  `lib/api-client/reporting.ts` aggregates the same clients the screens use (durable payment
  journal, durable order store, property lots, scheduling chapels, operations cases).
- ONE rules home each: `lib/inventory.ts` (out/low/in-stock derived, movement signs,
  filter/sort), `lib/accounting.ts` (journal balance + period, trial balance DERIVED from
  entries — never stored), `lib/reports.ts` + `lib/period.ts` (the four report keys, the
  inclusive calendar window, collections/lot/chapel/case rollups).
- Fixtures `commerce/inventory.json` (signed movements MUST sum to each item's `on_hand`;
  PRICES ARE NEVER STORED — catalogue-linked rows resolve their price from the durable
  catalogue at read time) and `finance/accounting.json` (balanced double-entry example books;
  order/case references pinned to real fixtures) are APP-AUTHORED with provenance in
  `lib/fixtures/README.md`; `tests/fixture-contract/{inventory,accounting}.test.ts` enforce.
- Read-only by construction (`/staff/reports` too): no posting, purchasing or adjustment path
  in any mode. Gating stays `catalog:write` / `accounting:read` / `accounting:read|billing:read`;
  page evidence: `tests/unit/{inventory,accounting,reports}-page.test.tsx`.

## AI Copilot — `/staff/copilot` (PRD S29; read before touching it or `lib/copilot.ts`)

- **It is the DESIGNED surface, not the wired one, and that is the deliverable.** No model
  provider is configured and none may be added here: an assistant that suggests things about a
  bereaved family's funeral needs an AI governance contract first (what it may read, that it
  never speaks to a family, that a human always confirms, how it is audited) and the client has
  not answered (`docs/07-client-villa/open-questions.md` §Operations & governance;
  `docs/05-ai/ai-governance.md`). Adding a provider, a key path or a model call is exactly what
  that contract has to gate — `tests/unit/copilot-model.test.ts` scans the module source for
  every one of them.
- **One rules home: `lib/copilot.ts`** (pure). The four prompts, the governance block
  (`COPILOT_GOVERNANCE`), the owner lines and every answer builder. It derives through the SAME
  `buildOpsBoard` the Operations board uses — never a second reading of ages, stages or tasks —
  and takes `cases` + `instrumentsByCase` + a three-state `calendar` (`read` / `no_scope` /
  `unavailable`); `"nothing on today"` and `"not read"` must never be the same answer.
- **Safety is structural, so keep it that way:** every finding carries ≥1 record ref pointing at
  a real `/staff/` route (the type has no orphan state), statements are checked against an
  advice/second-person word list, a `?case=` that resolves to nothing is answered without being
  echoed, there is NO free-text control (the case chooser is a native `GET` form over the
  recorded cases), and no amount is printed anywhere. The page writes nothing — its one action
  link goes to `/staff/ops`, where the work actually happens.
- **Scope**: `cases:read` PROVISIONALLY (no `ai:*` token exists; the capability is the platform's
  `ai-orchestration` service). A reader without `scheduling:read` gets the chapel calendar named
  as missing, never as an empty day. Nav entry is in *Overview* after Reports.
- The page is in `tests/unit/reading-budget.test.tsx` (a copilot answer is read at a glance too).
  Evidence, Lighthouse numbers and the shot list: `docs/08-delivery/ai-copilot-design/`.

## Admin platform screens — `/staff/users` · `/staff/workflows` · `/staff/settings` (S30–S32; read before touching them)

- **All three are designed READ-ONLY screens over recorded data, each naming its missing service
  in one line** — never re-stub them. Users & roles shows the recorded accounts + what each
  role's permissions mean; Workflows shows the four processes the shipped modules already run
  with their in-flight records; Tenant settings shows the configuration the product actually
  applies. Nothing here provisions a user, runs a workflow or writes a setting.
- **Users & roles.** The permission model's ONE reading is `lib/rbac/scope-vocabulary.ts` (the
  frozen `rbac-scopes-v1` grants in plain words + the raw token; `tests/fixture-contract/access-control.test.ts`
  fails if the scope set drifts from the contract). Roles are data
  (`lib/fixtures/auth/access-control.json`): each role's scope list is EXACTLY its seeded
  persona's in `auth/personas.json`, and the reader (`lib/api-client/access-control.ts`) is
  fixture-only — `accessControlLiveModeEnabled() === false`, because no provisioning API exists
  and no env var may claim one. The people table lists recorded sign-in accounts only; office
  staff stay on `/staff/hr`.
- **Workflows.** Definitions are recorded in `lib/fixtures/operations/workflows.json` with their
  steps pinned to the enforcing module (`case-events-v1`'s stage order · the lot record's four
  clerk states); the in-flight rows are composed live per source by `lib/api-client/workflows.ts`
  (cases · applications + lot statuses · transfers · chapel bookings), and a source that cannot
  answer marks only its own process unavailable. Never re-declare a stage or transfer word here.
- **Tenant settings.** Rule rows read their values from the enforcing module
  (`lib/tenant-settings.ts`); identity rows read the landing content document (edited at
  `/staff/landing`); configuration states come from the real stores. `tenancy-config` is not in
  this build, so the screen writes nothing, and platform-only items are named as facts — do not
  add a `/platform/*` link to a product screen.
- Page tests `tests/unit/{users,workflows,settings}-page.test.tsx` pin one `h1`, no write
  controls and the honest states; all three are in `tests/unit/reading-budget.test.tsx`, so keep
  the copy compressed (≤12-word opening, ≤30-word paragraphs/list items). The page titles carry
  the **Admin Portal** suffix from the parallel portal rename — do not revert them to
  `Staff Portal`. Evidence: `docs/08-delivery/admin-platform-design/`.

## Provisional receipts — the counter's paper (read before touching `/staff/billing/provisional-receipts`)

- **The provisional slip is the counter's fallback, not the product's receipt** (F-18 /
  `FORMS_PLAN` gap 3). The client's signed Provisional Receipt paper is NOT archived in
  `docs/07-client-villa/paper-forms/` and that folder's rule is "the paper wins", so
  `lib/contracts/provisional-receipt.ts` does not claim to reproduce it: the sheet records the
  same information and marks itself in ONE bold line directly under the title
  (`PROVISIONAL_RECEIPT_MARK`), carries NO receipt number, and posts nothing. The client ask is in
  `docs/07-client-villa/open-questions.md` (Track C).
- **One rules home, shared with billing**: `lib/contracts/provisional-receipt-capture.ts`
  (`validateProvisionalReceiptInput` / `...Draft`, plus the payer name this record adds) runs the
  SHARED billing rules (`validatePaymentInput` in `lib/billing-payments.ts`) for amount ·
  instrument · reference · date; the form, the BFF route (`app/api/billing/provisional-receipts`,
  gate `app/api/billing/_guard.ts`, `billing:read` view / `billing:write` issue) and the store all
  run it. Invoice, customer, order, balance and the case/contract link are READ from
  `listInvoices()` / `getCase()` — never typed into a view.
- **Store**: `lib/api-client/provisional-receipts-store.ts` — append-only journal
  (`PROVISIONAL_RECEIPTS_STORE_PATH` or `.data/billing-provisional-receipts.json`, gitignored;
  atomic writer + one in-process chain, `version: 1`, `provisional_receipt_issued` events). The id
  is an opaque `prov-<uuid>` screen address, never a receipt number. No frozen contract names a
  provisional-receipt record, so live mode answers the named 503
  `PROVISIONAL_RECEIPTS_NOT_WIRED` for reads and writes (`lib/api-client/provisional-receipts.ts`)
  — never dress local files up as a service.
- **OR display state — one state or the other**: `officialReceiptForProvisional` matches the slip
  to the real receipt (a recorded payment's `receipt_document` first — it can print the figures; a
  documents repository receipt row naming the invoice/order/case second — it links to Documents).
  The detail page prints the official receipt INSTEAD of the slip the moment one exists; matching
  is display-only (no issuance, numbering or posting here).
- **One paper, three outputs**: `buildProvisionalReceipt` → `PaperSheet` + `PaperExportActions`,
  letterhead from the landing content doc (`provisionalReceiptOffice`), so print/Word/PDF cannot
  drift. The staff page header (`.page-header__actions`) wraps below 48 rem in
  `styles/components.css` — a long title plus two actions must never widen the 390 px viewport.
- Evidence: `tests/unit/provisional-receipts{,-store,-rbac,-live}.test.*`;
  `docs/08-delivery/provisional-receipt-design/` (render record + 1440/390 shots and sample
  .docx/.pdf exports).

## Catalog admin — durable fixture store (read before touching `/staff/catalog`, `/api/catalog`)

- `/staff/catalog` is the real catalogue administration: list (search + type/published filters)
  → create (`/staff/catalog/new`) → edit (`/staff/catalog/[id]/edit`, numeric id = stable
  identity) → deactivate (`Take off storefront`; items are never deleted). It edits EXACTLY what
  the storefront sells: the public readers in `lib/api-client/commerce.ts` read the same fold, so
  a change reaches `/plans`, `/services`, `/products`, the cart preview and checkout on the next
  request. The edit form's photo picker reuses `components/landing/editor-pickers.tsx`
  (`MediaPicker`: library · device data URL · URL), and `app/(public)/plans` (the grid card and
  the detail hero) prefers `item.image` with its previous default photo.
- Store: recorded seed `lib/fixtures/commerce/catalog-items.json` + append-only journal
  (`CATALOG_STORE_PATH` or `.data/commerce-catalog.json`, gitignored; atomic writer + one
  in-process write chain, `version: 1`, `item_created` / `item_updated` keyed by item id). Ids
  allocate above the seed's highest; SKUs are unique CASE-INSENSITIVELY under the lock.
- `published`, `image` and `price_unit` are APP-AUTHORED — no frozen contract names a catalogue
  write endpoint. The public `CatalogItem` keeps the frozen envelope and gains only the optional
  `image`; `display_price` is DERIVED (`lib/catalog-admin.ts` `catalogDisplayPrice`) from integer
  minor units + currency + the presentation suffix seeded from the recorded string
  (`catalogPriceUnit`), so a price edit can never publish a stale amount. Never restate an amount.
- One rules home: `lib/catalog-admin.ts` (draft shape, field limits, `validateCatalogDraft` with
  per-control errors, `parseMajorToMinorUnits` — the form edits pesos, the wire is integer
  centavos). Form, BFF route and store all run the same rule; the store throws `ApiError` with
  `fieldErrors` (422) and the route forwards them.
- Provenance is a hard rule: `lib/catalog-sources.ts` is the one item → client document →
  figure map and `tests/fixture-contract/catalog-sources.test.ts` fails any seeded entry
  whose price has no source (naming the item) or drifts from it, and any withdrawn SKU that
  comes back. An item the office creates through the admin is app-authored by definition
  and outside that seed contract — extend the map when a new item transcribes a client
  document, never with an amount typed from memory.
- RBAC (frozen `rbac-scopes-v1`): `catalog:read` lists (read-only without `catalog:write`, with
  the reason on screen); `catalog:write` gates create/edit/toggle. Routes
  `GET/POST /api/catalog/items` + `GET/PATCH /api/catalog/items/[idOrSku]`, gate
  `app/api/catalog/_guard.ts`. The public GET list is the cart's rehydration read — projected
  to the five fields the cart needs and never showing unpublished items; and
  `getCatalogItem`/checkout answer 404 `not_found` for an unpublished item.
  The cart (`lib/cart/cart-context.tsx`) persists a display snapshot and refreshes known SKUs
  from that GET, so an item created in the admin survives a cart reload.
- Live mode: the platform has no catalogue write API → 503 `ADMIN_CATALOG_NOT_WIRED` (contract
  ask recorded in the PR), never a fake write.
- Tests: `tests/unit/catalog-admin.test.ts` (validation, store round trip, uniqueness,
  durability, corrupt-journal 500, data-URL photo, live-mode 503),
  `tests/unit/catalog-admin-rbac.test.tsx` (401/403, page gating, created item visible to the
  storefront reader), `tests/fixture-contract/catalog-admin.test.ts` (seed identity + derived
  display prices). `tests/setup.ts` (vitest `setupFiles`) points every suite's store paths at a
  throwaway temp dir so a dev `.data/` store can never leak into a test.

