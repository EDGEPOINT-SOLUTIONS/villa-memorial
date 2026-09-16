# AGENTS.md — `web` (React/Next.js + TypeScript, all portals + BFF)

> Gab-owned with agent assistance; Keb reviews every PR. Adapted from the exemplar
> (`docs/08-delivery/exemplars/web-AGENTS.md`) at scaffold time; extends the template's
> frontend adaptation (`docs/02-architecture/service-template.md` §"Frontend adaptation").

## Purpose
Single frontend codebase serving all portals (staff · customer · agent) plus the BFF layer.
Per ADR-004 the Next.js server side IS the BFF: fetch · aggregate · reshape · session-manage.
Screens are built **fixtures-first** against recorded contract fixtures so UI work never waits
on backend services.

## Non-negotiable rules (merge blockers)
1. **The BFF stays dumb** (ADR-004 guardrail): no business rules in BFF/route handlers; no data
   writes originate from BFF code. Business logic found here is a defect — move it to the owning
   service.
2. **Fixture↔contract drift fails CI nightly.** Fixtures record REAL response shapes and carry
   provenance comments (`lib/fixtures/README.md`); a service contract change that breaks fixtures
   must update them in the same PR chain — never hand-edit recorded JSON to make tests pass.
3. **Sessions server-side only.** Access tokens live in httpOnly cookies managed by BFF routes
   (`app/api/auth/*`); tokens never reach browser JS, localStorage, or logs.
4. **RBAC gates nav AND actions.** Hiding a button is UX; authorization still happens at
   services. The UI must render graceful 403 states when scopes don't allow an action.
5. **Every async screen has error/empty/loading states per design system before merge**
   (`components/ui/states.tsx`). No bare spinners-only screens.

## Traps (things agents get wrong here)
- Calling services directly from client components — everything goes through BFF route handlers;
  `.env.example` exposes nothing client-side except demo hints.
- Hand-rolling fetch wrappers per component — one typed client per service under `lib/api-client/`;
  regenerate from OpenAPI specs once services publish real ones (identity-access spec is still
  template-generic as of scaffold time).
- Trusting JWT payload shape at runtime without validation — parse defensively via
  `lib/auth/session.ts`; unknown shapes → logged-out state, not a crash.
- Copying tenant-specific vocabulary into shared components — domain terms live in feature
  folders/config; shared kit stays generic (ⓡ discipline applies to UI too).
- Hard-coding colors/sizes in views — every visual decision goes through `styles/tokens.css`
  (design-system.md consumption rule #1).
- **Inventing a shape or a scope ahead of the contract, then not flagging it loudly enough.**
  Fixtures-first is the right pattern — screens must not wait on services — but a fixture
  invented before a freeze becomes the de facto contract by the time anyone reviews it. The
  D3 services ended up ratifying `Lot` and `Case` as Gab wrote them, and `hr:read` /
  `documents:read` were live in shipped code for four days while named in no contract. When
  you invent a shape, say so in the file header (that part was done well) **and** open a
  contract question the same day.
- **A `501 not wired yet` live branch is not a seam, it is a stub.** `property.ts` and
  `operations.ts` threw on live mode while claiming the env var would flip them on. Write the
  real branch behind the flag, or say plainly that live mode is unimplemented.
- **Tolerant readers on the live path.** Upstream JSON is validated field by field
  (`toLot` / `toCase`), extra fields ignored, missing ones surfaced as a 502 — never cast a
  `fetch` result straight to the domain type.

## Self-check commands (before every PR)
```bash
npm run lint && npm run typecheck && npm test        # unit + fixture-contract tests
npm run build                                        # production build must pass
docker compose up --build                            # SSR on :3000 against stub-gateway w/ fixtures
```

## Run modes
| Mode | Trigger | Behavior |
|---|---|---|
| Fixtures (default) | no `AUTH_BASE_URL` | In-process recorded persona responses; unsigned structural tokens |
| Stub compose | `docker compose up --build` | Same fixtures served by `stub-gateway/` mirroring edge-gateway paths |
| Live | `AUTH_BASE_URL=<gateway>` | BFF proxies `${AUTH_BASE_URL}/identity/api/v1/auth/*` |

Demo one-click persona fill is a **server-side opt-in**: `DEMO_QUICK_FILL=1` (plus
`DEMO_QUICK_FILL_PASSWORD` whenever `AUTH_BASE_URL` is set — the repo seed is never handed to a
gateway) is resolved per request in `lib/demo-quick-fill.ts` and reaches the sign-in card as a
prop. Credentials must never go in `NEXT_PUBLIC_*` (inlined into public JS; the existing
`NEXT_PUBLIC_DEMO_PASSWORD` path is local-dev only). Docs: README "Demo logins (fixture mode)",
`docs/08-delivery/notes/known-limitations-cp1.md`.

## Landing page — content-model home (read before touching "/" or its admin)

- The public home (app/page.tsx) is NOT hand-written JSX sections: it renders
  `components/landing/landing-view.tsx` from a LandingPage content document
  (hero · rails · about · services · plans · map · blog copy — the middle column
  renders the live park map BEFORE the newsfeed; keep that order when editing).
  Interior pages keep their own routes/layouts and are untouched.
- Content lives in the fixture store like every module: recorded seed at
  `lib/fixtures/landing/content.json` + in-process saves through
  `lib/api-client/landing.ts` (types/validator are the model authority — rails
  hold UNLIMITED items per side — an empty service-card or blog list is legal).
  The three-column anchored shell (fixed 17rem rails + centred 50rem middle) and
  the rail/footer/section styles live in the "anchored catalogue home" block of
  `styles/components.css`; below 75rem the rails collapse into the
  MobileQuickMenu flyout.
- The two mid sections are the approved prototype's, NOT hand-written:
  **"What we do" / Services we offer** (four cards) and **"Plan ahead" / Villa
  Memorial Plan** (promo figure + payment-mode switch + tier × term board) come
  from `docs/prototypes/villa-home-ui/home.html`. A card stores only a
  `LOT_PRICE_CATEGORIES` family key — the view prints "from ₱X · ₱Y / month,
  6 yrs" through `lotCategoryFromPrice()`; the board holds NO items (its copy is
  kicker/heading/intro/note) and reads its 5 × 4 figures through `planRate()`,
  with the footnote's `{seniorMonthly}` / `{packagePage}` tokens resolved from
  the same module. Never author an amount in the fixture, the copy or a view,
  and keep the board's `.plan-scroll` pan frame + the `.plan-band` stack below
  88rem (the five columns do not fit the railed middle column otherwise).
- The staff editor is the premium `app/(staff)/staff/landing` page (scope
  catalog:write, reused provisionally); its rail picker catalogue in
  `lib/landing/catalogue.ts` is built from the REAL catalogue/villa-pricing —
  never add a picker option with invented prices. The picker pins one item per
  click or bulk-selects several (choose a rail, switch to bulk pin, pick rows,
  "Pin N items"). The editor's image picker
  offers THREE sources: the uploaded media library, a public URL, or a REAL
  device upload (`components/landing/device-uploader.tsx` + `lib/device-upload.ts`)
  — chosen files are downscaled (max 1600px) into data URLs stored INSIDE the
  content document via the same fixture-store save path (zero backend); blog
  media rows show device photos as a compact attached state, never a base64
  blob in the src input.
- Rendering/robustness tests: `tests/unit/landing-view.test.tsx` (renders the
  view via react-dom/server) + `tests/fixture-contract/landing.test.ts` (pins
  seed prices to lib/villa-pricing.ts). vitest.config compiles .tsx with the
  automatic JSX runtime for those.
- Public lot browse (/lots) filters plots by park, status and legend type; the
  type-filter + live chip counts live in `lib/lots-legend.ts` (pure + unit-
  tested at tests/unit/lots-legend.test.ts) and read types from
  `lib/park-types.ts` — never inline that filter logic in the page.
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
  flyout, the footer and the pages' own titles/h1s; don't shorten them. Because
  those labels are wide, the CSS block tightens `.anchored-header__nav` chip
  padding below 85rem so the phone chip and "Sign in" never wrap; keep both.
  The rails hide their scrollbar until hovered (.anchored-rail). Blog posts
  carry an optional `link` (set in the
  "/" editor) that makes the post's photos/caption navigate; seed posts ship
  sensible internal routes.

## Package page — `/plans/[sku]` (design target — read before touching it)

- Package items render the CLIENT's approved layout, not a generic hero. Authority:
  `docs/prototypes/villa-home-ui/package.html` (+ `prototype.css` + its README) —
  captain's 2026-09-16 review: "the exact design of package.html", INCLUDING the
  icon treatment (translucent `--gold-wash` disc + `--gold-700` glyph on BOTH the
  five feature columns and the eligibility/benefit row). That supersedes the older
  `Package page UI example.webp` navy-on-solid-gold deviation. Main column =
  breadcrumb → title/lead/tagline → chips → quote → VILLA MEMORIAL PLAN panel →
  COMPLETE MEMORIAL PACKAGE grid (five columns + the eligibility/benefit row) →
  Official 2026 price list module → "The package at a glance" evidence strip. The
  28rem rail holds the promo card, the tier × term buy card and the advisor card.
  Services/add-ons keep the `hero-premium` layout.
- The price module is route-local
  (`app/(public)/plans/[sku]/price-list-2026-module.tsx`): the prototype's
  "Highlight amortization term" switch + "Highlight senior-citizen rates" toggle
  drive every `data-term`/`.senior` cell, the four family tables keep the prototype's
  grouped two-row header and `caption`, and the source note credits the sheet.
  `/lots/price-list-2026` still renders the older `PriceList2026Tables` cards.
- Embalming is INCLUDED in the package with no fixed day count — never write
  "1 day"/"7 days" in package/pay-plan copy. The client's "2026 price FV website A"
  sheet prices embalming per day (3 days ₱6,000 … 9 days ₱15,000, ₱1,500/day beyond)
  and applies that table only when a family does NOT take a package.
- Theme: the public brand colour is **sky blue** (captain 2026-09-16), applied through
  the `--sky-*` primitives + remapped semantic roles in `styles/tokens.css`. `--navy-*`
  stays the ink/structure ladder and the staff portal's premium navy/gold direction
  (`.app-shell` keeps navy buttons). Home, footer, hero and public surfaces paint
  `--sky-*` with navy ink; gold/brass accents are unchanged.
- Styles live in the "package page" block of `styles/components.css`
  (`.plan-layout` / `.plan-main` / `.plan-side` / `.pkg-*`); the feature icons are
  route-local in `app/(public)/plans/[sku]/package-icons.tsx`. `.plan-main` needs
  its explicit `grid-template-columns: minmax(0, 1fr)` — the implicit track sizes
  to the five-column grid's max-content and overflows the rail otherwise; the
  feature grid reflows 3+2 between 62.001–82rem (the rail still fits at 28rem)
  and 2-across below, so the five columns never crush.
- Never write an amount in the view: `PlanTermSelector` and the price module read
  every price through `planRate()` / `LOT_PRICE_CATEGORIES` in `lib/villa-pricing.ts`
  (tier × term, regular + senior tables; 2026 sheet family captions live there too).
  The prototype wins over every older render.

## Public services page & casket catalogue — `/services`, `/products`

- `/services` is the **captain-approved 2026-09-16 senior-first design** — the contract
  is `docs/08-delivery/services-design/` (artifact + 5 sample pages + `services-pages.css`),
  the implementation block is the "Services page" `sv-*` section of `styles/components.css`.
  The page leads with the 24/7 call panel, a sticky "On this page" bar
  (`components/villa/services-subnav.tsx`, five anchors), the three "what happens after
  you call" steps and the two guide cards; then one `.sv-section` per sheet block:
  at-need cards (`AlacarteServiceRates`), the embalming day picker
  (`components/villa/embalming-day-picker.tsx`, full day counts behind a disclosure) and
  the chapel cards (`ChapelRates`) with one `.sv-stay` row per 3–9 day stay — the raw
  sheet table is never the phone experience. It all renders from
  `components/villa/service-rates-2026.tsx`; figures stay in `lib/villa-pricing.ts`.
  The a-la-carte and embalming lines keep the shared Add-to-cart + Request-order pair
  (`components/villa/catalogue-actions.tsx`); **chapel lines are the one documented
  exception — they open the booking step** (`ChapelBookingButton`, "Check dates & price"
  on the cards and "Book N days" per stay row — whose accessible name carries the chapel,
  `aria-label="Book N days — Common|Private chapel"` — per the chapel-booking contract
  below), never a plain add-to-cart. Every line shows its "In your cart" chip after an
  add (`components/villa/in-cart-notice.tsx`). `tests/unit/price-surfacing.test.tsx` and
  `tests/unit/villa-services-premium.test.tsx` both pin that split — keep them when
  editing the layout. Senior-first is non-negotiable: 18 px body, nothing under 16 px in
  page content, prices always with their unit, tap targets ≥ 44 px.
- **Sample imagery is client material and is always labelled illustrative.** The chapel
  photos, the carriage and the five sample coffins are cropped from the client's own
  TYPES OF COFFIN sheet (`scripts/crop-client-sheet-tiles.mjs`, sharp ships with Next;
  pass the client source with `--source`). The sheet prints "(Illustration purposes
  only)", so captions say so (`CHAPEL_SAMPLE_NOTE` / `SERVICE_SAMPLE_NOTE` /
  `COFFIN_TIER_NOTE`) and no alt text claims a real room or a guaranteed model.
- **Two PROVISIONAL derivations are published — both owe the client a question:**
  (1) the collection → sample-photograph binding in `lib/media.ts` (`casketSamplePhoto`),
  (2) the model-name → lid/cover line in `lib/villa-pricing.ts` (`COFFIN_COVERS` /
  `coffinCover`): the sheet states lids per SAMPLE coffin, never per model. Lumina names
  no cover, so its detail view says the office confirms the cover
  (`COFFIN_COVER_UNSTATED`) rather than guessing.
- Casket details are a **route, not a dialog**: `/products/[sku]` (SKU from
  `coffinSku` in `lib/catalogue-skus.ts`; resolve with `coffinModelForSku`, anything
  else → 404). Every catalogue card carries "View details", and the detail page's
  facts/prices/inclusions come from the catalogue entry + `lib/villa-pricing.ts` — never
  typed into the view. `tests/unit/villa-services-premium.test.tsx` pins the grouping,
  the illustrative labels and the detail content.
- Known storefront a11y debt (pre-existing, visible on every catalogue surface):
  `CatalogueAddButton`'s aria-label ("Add <item> to cart") does not contain its visible
  text ("Add to cart"), so Lighthouse flags WCAG 2.5.3 label-content-name-mismatch. Fix
  the label and its pinned test strings (`price-surfacing`, `cart-catalogue`,
  `villa-services-premium`) in one sweep.

## Public "Reach us" forms — `/contact`, `/quote`, `/appointments`

- The three routes render `components/public-forms/*` on the shared apply-form shell
  (numbered `.capture-section` cards, `field-grid`, one `.capture-actions` bar); the
  submit gate is one function per form in `lib/public-forms/validation.ts`. The shell
  grammar carries no `*`/`(optional)` labels — optionality lives in field hints and
  the gate. The appointment reason list there is PROVISIONAL: no shared taxonomy exists.
- No crm-families / quotation / scheduling contract exists, so nothing is sent or
  stored server-side. Quote and appointment confirmations must keep saying so
  ("Request checked — nothing was sent."); contact captures land in the browser-local
  demo store `lib/demo-inquiry-captures.ts`, which the staff inquiries board reads
  after hydration (`app/(staff)/staff/inquiries/inquiry-board.tsx`). When a real write
  contract lands, replace that store and the wording — never dress demo capture up as
  delivery.
- `/contact` is also the storefront's request landing: price-list actions link
  `?item=&sku=&price=&note=`, built and parsed by `lib/public-forms/request-prefill.ts`
  (clamped, untrusted input). The banner and the pre-written message echo exactly what
  was clicked and say plainly that nothing is reserved. Reuse this seam for every new
  request action; never invent a second contact-link shape.

## Chapel bookings — customer flow (read before touching chapel actions or the cart)

- A chapel is NOT a one-click cart item. Every chapel action on `/services` opens
  `components/chapel-booking-dialog.tsx` (choose chapel → start date + 3–9 day stay →
  per-day availability → exact range price → Add to cart). The prefilled **Request order**
  stays beside it. Never re-add a direct chapel Add-to-cart button.
- **One rules home: `lib/chapel-booking.ts`** (pure, client+server): the 3–9 day bound,
  UTC-midnight calendar windows, per-day occupancy (a range is bookable only when no
  confirmed booking and no blocked date touches any of its days), prices read through
  `chapelStayPrices()` from `CHAPEL_RATES` (never restate an amount), the refusal copy,
  and the booking metadata a cart line carries. Server orchestration (chapel slice of
  the schedule, reserve, release) is `lib/api-client/chapel-reservations.ts`; the BFF
  routes are `/api/chapel/schedule`, `/api/chapel/bookings`,
  `/api/chapel/bookings/[id]/release` — handlers stay rules-free (AGENTS rule 1).- **Reserve on add, release on remove**: Add to cart creates a scheduling booking
  (title marker `Online chapel booking`), removing the line cancels it; the booking is
  re-checked against a fresh schedule and rolled back if the service flags a race
  (scheduling v1 flags conflicts instead of blocking — cut line #3). The cart line is
  keyed by `lineId` (`cartLineKey` in `lib/cart/cart-context.tsx`) so two stays of the
  same class coexist; checkout still sends only `{sku, quantity}` with quantity = days
  and the per-day unit price, so the server-repriced order totals the stay.
- **PLACEHOLDER config**: which chapels exist, their names, classes and closed dates come
  from the staff screen below (durable store) — `CHAPEL_CLASS_RULES` in
  `lib/chapel-booking.ts` is now only the fallback for a resource the park's own records do
  not list (same mapping as the seed fixture). Live mode has no
  public booking contract: scheduling v1 requires a staff session, so an anonymous
  visitor gets 401 and the dialog degrades to Request order — not a hidden stub.
- Evidence: `tests/unit/chapel-booking.test.ts` (bounds, overlap/blocked/no-chapel
  refusals, range price, cart metadata, release-on-removal),
  `tests/unit/chapel-booking-dialog.test.tsx` (trigger + step rendering).

## Chapel administration — staff side (read before touching chapel settings/availability)

- **One store, two faces.** `/staff/schedule` (the chapel sections) and the customer dialog
  read the same chapel records: `lib/api-client/chapel-store.ts` (seed
  `lib/fixtures/scheduling/chapel-admin.json`; journal `CHAPEL_STORE_PATH` or
  `.data/scheduling-chapel-admin.json`, gitignored — atomic writer like the orders store).
  Closing a range or deactivating a chapel changes what a customer can book on the NEXT
  read; nothing caches it.
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
  page gating, same-store effects), `tests/fixture-contract/chapel-admin.test.ts` (seed pinned
  to the scheduling resources fixture + the fallback rules).

## 2026 price list — where every client figure surfaces

- **One transcription home: `lib/villa-pricing.ts`.** Its header maps every export to
  the client's sheet; `tests/unit/villa-pricing.test.ts` pins each figure, and
  `tests/unit/price-surfacing.test.tsx` renders the real pages and asserts each one is
  published. Never author or restate an amount in a view.
- Sheet → page map (all four surfaces already render the full sheets):
  `/products` = casket catalogue (`CASKET_MODELS` — SRP, senior SRP, discount,
  discounted price, grouped by collection) + per-family inclusions
  (`CASKET_INCLUSIONS`) via `components/villa/casket-catalogue.tsx`;
  `/services` = embalming per day + the five a-la-carte fees (incl. the sheet's
  unlabelled ₱19,500 total) + chapel use rates, via
  `components/villa/service-rates-2026.tsx`;
  `/plans`, `/plans/villa-memorial-plan`, `/plans/senior-benefits` = the five tiers ×
  four terms, regular + senior, through ONE renderer
  (`components/villa/plan-payment-table.tsx`);
  `/lots/price-list-2026` = `LOT_PRICE_CATEGORIES` (regular + senior).
- The a-la-carte/embalming table and the chapel-use table are scoped by the sheets
  themselves: they apply when the family does NOT take a package (package embalming
  stays "no fixed day count" — the package sheet's "7 days" wording is deliberately
  not published).
- **The sheet items are sellable, not display-only.** `lib/fixtures/commerce/catalog-items.json`
  carries the client's real 2026 figures for all 24 casket models, the five a-la-carte
  fees, the embalming 3–9 day table plus the `>9` extra day, the two chapel per-day
  products and the three plan packages (monthly amortization). `lib/catalogue-skus.ts`
  is the only sheet-label → SKU map; `tests/fixture-contract/commerce.test.ts` pins each
  entry to `lib/villa-pricing.ts`. The four upstream items no 2026 sheet prices
  (`SRV-LIGHTS`, `ADD-COFFIN-LIZO-SR`, `ADD-FLOWERS`, `ADD-URN`) keep their seed
  amounts by design — never invent a figure for them. **This diverges from the upstream
  platform seed** (still placeholder-priced); upstream parity is a captain decision.
- Every sellable line pairs the same two actions: `components/villa/catalogue-actions.tsx`
  (Add to cart with the row's exact catalogue SKU/price + the prefilled Request order).
  Lots are never cart items — `components/villa/price-list-2026.tsx` gives each row
  Request this lot + a `/map` link. Plan tier × term goes through `lib/plan-selection.ts`
  (cart only for a monthly, non-senior tier the catalogue carries; every other selection
  opens the request naming that term's sheet amount).
- Two open client questions are published as the sheets print them rather than
  reconciled — keep it that way until the client answers: (1) sheet III's chapel table
  computes the senior column at 96% of the regular total (₱1,440/₱3,360 per day) while
  its own footnote says ₱1,800/₱4,200 per day; (2) no sheet maps the Bronze/Silver/Gold
  tier photography to the named Lumina/White Rose/Crown/Dynasty models. `2026 price FV
  website A.pdf` is byte-identical to `PRICE LIST FOR 2026 II.pdf` (one source, two names).

## Villa park — `/map` hosts TWO connected modes (read before touching the park map)

- The Villa Memorial Park page (`app/(public)/map/page.tsx` → `components/public-park-map.tsx`)
  switches between **Map** (the plain masterplan image, the existing plotting editor) and
  **3D** (the orbit-navigated park, react-three-fiber). The 3D mode owns the whole screen:
  entering requests full screen from the switch gesture (graceful where the browser refuses)
  and every control — exit, camera, zoom/frame, section/search/filter list, settings, details,
  plot tools — lives inside the experience, never in the page chrome. The other parks (Loyola,
  Golden Haven) keep their own images and are untouched by the 3D world.
- **`lib/park-maps.ts` is the single plot store for both modes** (image-space coordinates,
  shapes, status, type, section/block, linked lot, demo-local localStorage — never claim
  multi-user sync). The ONE image↔world conversion is `lib/park-3d/coords.ts` (store frame
  100×75 → metres); all masterplan geometry is authored in masterplan pixels in
  `lib/park-3d/masterplan.ts` and pushed through it, so the 2D image and the 3D world cannot
  drift apart. Placing/moving/deleting in 3D writes the same image-space records the map
  editor writes; selection is shared (`components/park-plot-details.tsx` renders the same
  panel in both modes).
- **The masterplan is the only spatial source of truth**: `public/media/Park map.png` (client
  asset; do not swap it). No invented sections/roads/buildings/numbers. Placeholder inventory
  is generated in `lib/park-3d/placeholder-lots.ts` (clearly-marked `P-/PR-/G-/GN-` codes,
  “Contact for pricing”, every grid configurable there) and the chosen-not-measured values are
  listed in `ASSUMPTIONS` in `lib/park-3d/masterplan.ts`. The binding contract for this feature
  is `docs/07-client-villa/park-3d-spec.md` (§0).
- **Plotting is admin-only**: `lib/park-3d/capability.ts` derives `canEditPlots` from the
  viewer's `property:write` scope; the page reads an optional session
  (`optionalSession` in `lib/auth/guard.ts`) and passes one boolean down. Customers see the map
  and the lots, can select/inspect them in either mode, and get no plotting tools — the 3D place
  and move gestalts are gated by the same flag.
- **Navigation is Blender-style orbit, not a game camera** (captain, 2026-09-17): drag orbits,
  wheel/pinch/± zoom, middle-drag or Shift+drag (two fingers on touch) pans, and selecting a
  plot/section/place frames it with a damped glide (never a teleport; no roll, no ground
  clipping — the rig keeps the camera above `ORBIT.minCameraHeightM` and the focus point near
  the site). The envelope + framing math is `lib/park-3d/orbit.ts` (pure, unit-tested); the
  gestures are `components/park3d/camera-rig.tsx` (OrbitControls). "Masterplan view" is a
  top-down angle of the same camera, not a second camera. A plot drag disables the orbit
  controls for its duration (`draggingPlot` in the view store).
- **Reserving works from the 3D plot panel, on the staff rule**: a viewer with
  `property:write` gets `components/lot-reserve-action.tsx` (the same BFF route the staff map
  uses, `POST /api/property/lots/:id/reserve`; only `available → reserved`, the property service
  is the authority); everyone else keeps the request-to-reserve enquiry link. The panel's
  action slot is `components/park-plot-details.tsx`'s `reserveSlot`. A reservation is the LOT's
  status, and `lib/park-live-lots.ts` overlays it onto the same plot records both modes draw —
  never write a lot's status into the plot store.
- **3D internals**: scene/blockout `components/park3d/scene.tsx`, real raycast plot picking +
  instanced slabs `components/park3d/plots-3d.tsx`, vegetation instancing
  `components/park3d/vegetation.tsx`, UI/store state `lib/park-3d/view-store.ts` (zustand),
  orbit envelope + framing `lib/park-3d/orbit.ts` + `components/park3d/camera-rig.tsx`,
  POIs `lib/park-3d/masterplan.ts`. The developer
  overlay (`components/park3d/debug-layer.tsx`) is dev-builds-only. Pure modules have unit tests
  in `tests/unit/park-3d-*`.

## Agent lots map — the office's map, never a second one (read before touching `/agent/lots`)

- `/agent/lots` renders `components/agent/agent-park-map.tsx`, which mounts the SAME
  `components/park-maps-view.tsx` the staff property screen (`components/property-explorer.tsx`)
  and the public `/map` render, fed the same listing as staff (`listLots()` → the
  `liveStatusById`/`liveOwnerById` overlays). Never hand-draw an agent-only masterplan/pin layer.
- Capability differences only: map editing appears for sessions holding `property:write` (the
  agent persona holds `property:read` alone); the shared `PlotDetails` panel is the agent's lot
  profile, and `showReserveRequest={false}` swaps the public customer request link for the
  agent's disabled “ask the office to hold” intent. `tests/unit/agent-park-map.test.tsx` pins the
  parity — both pages must pass the shared map the same lot set/statuses.

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

## Structure conventions
```
web/
├── app/                  # Next.js App Router: routes per portal
│   ├── (staff)/staff/    # RBAC-gated portal frame + sections
│   ├── login/            # public sign-in (fixtures-first)
│   └── api/auth/         # BFF route handlers ONLY — session mgmt, proxying
├── lib/api-client/       # typed clients (generated from OpenAPI specs once published)
├── lib/fixtures/         # recorded contract fixtures; validated nightly vs specs
├── components/ui/        # design-system components — generic, zero domain vocabulary
├── .agents/skills/       # vendored AWS agent-toolkit skills (skills-lock.json; `.claude/skills` symlinks) — not app code, excluded from lint
└── styles/               # tokens.css is the single source of truth for visuals
```

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
