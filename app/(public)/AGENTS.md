# AGENTS.md — `app/(public)` (public storefront surfaces)

> Nested instructions. A harness that loads `AGENTS.md` files discovers this file when a
> session touches a file under `app/(public)/`, and it is not loaded before then.
> The cross-cutting rules — merge blockers, traps, the component kit, tokens, money and
> accessibility — stay in the repository-root [`AGENTS.md`](../../AGENTS.md). Read that first.

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
  The hero also carries a staff-chosen background colour + transparency
  (`hero.background` / `hero.backgroundTransparency`; palette, colour validation
  and the layer helpers live in `lib/landing/hero-background.ts`), an optional
  `hero.textColour`, and OPTIONAL copy: when `eyebrow`/`headline`/`subline` are
  all empty the home renders the RAW photograph (`.hero-home--image-only`) with
  no wash, scrim or gradient, and the park hero does the same
  (`.hero-premium--image-only`). There is **no constant readability scrim** —
  100% transparency = the clear photo (`heroBackgroundLayer` returns null); 0% =
  the ONE `.hero-home__wash` layer solid, BELOW all hero copy. `hero.textColour`
  paints through the `--hero-text-colour` custom property set on the page shell
  (`lib/landing/hero-background.ts` → `heroTextColourStyle`); every hero copy
  rule reads `var(--hero-text-colour, <token>)`, so absent = the shipped ink.
  The editor control is
  `components/landing/hero-background-field.tsx` (palette · free input · live
  preview · 0–100% slider · the free text colour). The rail's oversized lead
  image `.rail-item--lead .rail-thumb` is height-capped
  (`clamp(5.5rem, 7vw, 6.5rem)`) so the default rail list fits without a
  vertical scrollbar — evidence + measured heights in
  `docs/08-delivery/hero-flexible-design/`.
  The three-column anchored shell (fixed 17rem rails + centred 50rem middle) and
  the rail/footer/section styles live in the "anchored catalogue home" block of
  `styles/components.css`; below 75rem the rails collapse into the
  MobileQuickMenu flyout.
- The two mid sections are the approved prototype's, NOT hand-written:
  **"Memorial plans & garden lots"** and **"Plan ahead" / Villa
  Memorial Plan** (promo figure + payment-mode switch + tier × term board) come
  from the captain's 2026-09-21 direction (the band replaced `docs/prototypes/villa-home.html`'s
  "What we do / Services we offer"). Each plans-and-lots card binds to a LIVE price source — a
  `lotCategories` family + product row, or a `PlanTier` — and, since the Villa Memorial minutes'
  item 8 (2026-09-21), LEADS with the monthly installment + payment term (a lot's recorded
  72 months and total contract price; a plan's pending-term wording) + area through
  `lib/landing/plan-lots.ts` → `lib/monthly-pricing.ts`
  (`tests/unit/landing-view.test.tsx` + `tests/fixture-contract/landing.test.ts` pin the
  bindings); the board holds NO items (its copy is kicker/heading/intro/note) and reads its 5 × 4
  figures through `planRate()`, with the footnote's `{seniorMonthly}` / `{packagePage}` tokens
  resolved from the same module. Never author an amount in the fixture, the copy or a view, and
  keep the board's `.plan-scroll` pan frame + the `.plan-band` stack below 88rem (the five columns
  do not fit the railed middle column otherwise).
- The staff editor is the premium `app/(staff)/staff/landing/home` page (Pages
  & content → Home; scope
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
- **The same document also drives the FAQ page (`/faq`)**: its `faq` region
  (eyebrow · heading · lead · items · next-step links) is edited in editor zone
  09 and rendered by `app/(public)/faq/page.tsx`. Never re-hardcode FAQ copy —
  seed + tolerant reader + validator + save path are `lib/api-client/landing.ts`,
  and `tests/unit/faq-page.test.tsx` pins that an edit reaches the page.
- **ONE content editor** (captain, 2026-09-18; reorganised into the page home
  2026-09-21): `/staff/landing` (nav "Pages & content") is the only content
  surface, listing the five page documents — Home · Villa Memorial Park ·
  Funeraria Memorial Services · Villa Memorial Plan · Coffins & caskets. Home
  keeps the full landing/FAQ editor at `/staff/landing/home`; the rest are page
  documents (see the content-catalogue block below). The retired `/staff/store`
  stub is a redirect and its duplicate nav entry is gone. Storefront
  COMMERCE settings live on `/staff/catalog` and `/staff/pricing` (the plan-rate
  and lot-price editors share the ONE pricing document since the Phase 4 nav
  consolidation; `/staff/plans` redirects there) — never recreate a second
  content route. Evidence: `tests/unit/content-editor-nav.test.ts`,
  `tests/unit/pages-and-content-admin.test.tsx`, `tests/unit/pricing-admin-rbac.test.tsx`.
- Public lot browse (/lots) is a **client-filtered product listing** (captain
  2026-09-20: pictures on every lot, a sticky left filter, Amazon-style cards;
  filtering must not reload — the URL is the view's serialisation, written with
  `history.replaceState`). The server half (`app/(public)/lots/page.tsx`) shapes
  each plot into a `LotListingItem` through the ONE shaping module
  `lib/lot-listing-data.ts` (`buildLotListing`), which the park page's Lots tab
  uses too, so the two surfaces cannot list different rows; the client half (`lot-listing.tsx` +
  `lot-filters.tsx`, the "Refine lots by" panel: collapsible checkbox groups,
  live per-option counts — zero counts stay visible, dimmed — and a min/max
  price range) filters and sorts in place. ONE filter/sort model:
  `lib/lot-listing.ts` (pure, unit-tested at `tests/unit/lot-listing.test.ts`)
  — never inline that logic in a component. Every plot's photograph is derived
  by ONE rule home, `lib/lot-imagery.ts` (linked lot's section → legend type →
  the park's own plan), each card captioned for what the picture is (a section,
  never "this plot"); the frozen Lot contract carries NO image field, so that
  derivation is an open contract ask, not a fixture field. Cards reuse the
  shared `.shop-grid`/`.shop-card` kit; `.lot-grid` only narrows the column
  floor and the listing's CSS block owns the sticky rail / phone sheet. The demo
  lots' areas/prices are the 2026 lot sheet's family figures for their section
  (`lib/catalog-sources.ts`, pinned by `tests/fixture-contract/catalog-sources.test.ts`)
  — never a per-plot price.
- `/lots` runs on the catalogue's **one control ladder** (captain follow-up,
  2026-09-21): a card's single action is `.btn--accent` (the gold primary rung,
  matching `Add to cart` on the other catalogue cards — not the page-level sky
  `.btn--primary`), every supporting action is `.btn--secondary`, and the
  panel's commit (`Go` / `Show N lots`) is `.btn--primary` full-size on both
  surfaces. The rail Clear and the no-results Clear are the same control; the
  quick price ranges ride `.btn--secondary .btn--sm` (which is also their phone
  44px touch target); group heads and the Filters toggle hover like their rows.
  Record + before/after shots: `docs/08-delivery/lots-cta-consistency-design/`.

## Public SEO surface (read before touching metadata, sitemap or robots)

- **One home: `lib/seo.ts`.** `pageMetadata()` builds every public page's
  canonical + OpenGraph + Twitter card; `PUBLIC_PAGES` is the `app/sitemap.ts`
  table; `localBusinessJsonLd()` builds the `FuneralHome` + `WebSite` structured
  data from the landing content document's own wordmark / 24-7 line / location
  (never a typed contact detail — since 2026-09-18 the seed is the client's own
  line from the 2026 purchase application form, and the editor field remains the
  place to change it); `siteUrl()` reads
  `SITE_URL` (documented in `.env.example`), defaulting to the documented
  deployment host `https://in-memoriam.edgepoint-ai.com`.
- `app/sitemap.ts` publishes `PUBLIC_PAGES` plus the real coffin / package /
  lot detail URLs from the same stores the pages read. `app/robots.ts` allows
  the storefront and disallows `/api`, `/staff`, `/client`, `/agent`, `/cart`,
  `/checkout`, `/orders` and the sign-in doors. `components/seo/json-ld.tsx`
  renders the structured-data block on the home and in the `(public)` layout.
- Every public page exports `pageMetadata(...)`; dynamic detail routes export
  `generateMetadata`. `/cart` and `/checkout` (client pages) carry pass-through
  layouts that noindex them, and the `(public)` layout deliberately sets **no**
  canonical so no page inherits one it does not own.
- `tests/unit/seo.test.ts` walks `app/(public)` and fails if a public page is
  missing from `PUBLIC_PAGES` (or a listed path has no page) — add the route in
  the same PR that adds the page.

## Public action & contact layer — the closing band and the contact surface (F-17)

- **Every public page ends on the SAME three options** through ONE band:
  `components/landing/next-steps.tsx`, rendered by `PublicShell` (interior pages)
  and `LandingView` (home) from the landing contact document — call the office
  (primary, a real `tel:` link with a “Call …” label), ask a question (`/contact`),
  start the arrangement (`/builder`). `/immediate-assistance` is the one documented
  exemption: it IS the call-first screen (F-01) and renders no band. Never add a
  second closing grammar or a per-page CTA list; a new public page inherits it
  from the shell.
- **The contact surface is `/contact`**: the message form comes FIRST and the
  office's published facts CLOSE the page — both hotlines, the main-office and park
  addresses, availability, then the directions card last — plus the
  quote/appointment paths (captain, 2026-09-27: "put this at the last section";
  this reverses F-17's "facts before the form", and
  `tests/unit/journey-actions.test.tsx` pins the new order). Those facts are the
  staff-editable landing contact region (`secondPhoneDisplay/Href`,
  `officeAddress`, `parkAddress`; editor zone 01 at `/staff/landing`), seeded from
  the client's 2026 Purchase Application Form letterhead; the validator keeps the
  second line a number + `tel:` pair or empty. Never type a number into a view and
  never invent walk-in hours (the client material carries none).
- **No public raster art may print a contact detail the landing document does not
  carry.** The plan poster (`public/media/plan-packages.png`, served by `/plans`,
  the package routes and `/price-list`) printed the prototype placeholder
  `0917 123 4567`; F-17 masked the advisor strip's left band to the poster's own
  navy (art and gold tagline untouched) and re-derived the composition thumbs
  (`scripts/build-composition-images.mjs`; only the two `plan-packages-*.webp`
  files changed). Check a newly uploaded poster for baked-in numbers before
  publishing it.
- Evidence: `tests/unit/journey-actions.test.tsx` (band, exemption, contact facts,
  placeholder-number source scan), `tests/fixture-contract/landing.test.ts`
  (letterhead provenance); record + 1440/390 shots
  `docs/08-delivery/journey-fixes-design/`.

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
- Theme: the brand colour is **sky blue** (captain 2026-09-16), applied through
  the `--sky-*` primitives + remapped semantic roles in `styles/tokens.css`. `--navy-*`
  stays the ink/structure ladder; gold/brass accents are unchanged. Captain 2026-09-25:
  page and surface grounds are **white** product-wide and the blue is confined to controls
  (buttons, selected states, call actions) and the footer — the staff rail is a white
  sidebar with a sky active edge, and `tests/unit/page-backgrounds.test.ts` enforces it.
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

## The storefront imagery pass — the client's own photographs, and the shop card (read before changing any product or service picture)

- **One rule home for a model's photograph: `lib/media.ts`'s `CASKET_MODEL_PHOTOS`** — an
  explicit 24-row table (model → `lib/client-photos.ts` id), laid out so no family and no
  neighbouring card repeats a picture. The chosen picture answers two questions only: the
  COVER the model's own name states (Half = lid down or on its half stay; Full / Full Split /
  Flexi = the raised cover the sheet's convertible line describes) and the collection's price
  band. The client's photographs are NOT named after the 2026 sheet models — that
  reconciliation is an OPEN CLIENT QUESTION — so no page may name a photograph as a model, and
  **every** published sample carries its caption and the sheet's substitution note
  (`COFFIN_TIER_NOTE`) — never a redundant "Sample photograph" chip (captain
  2026-09-21). Six photographs cannot be twenty-four coffins: the PR that owns this
  pass names the models that still have no picture of their own.
- **One rule home for a catalogue item's photograph: `lib/catalogue-imagery.ts`**
  (`catalogueItemPhoto(sku)`) — used by `/plans`; the caskets delegate to the table above, the
  packages to `COFFIN_TIER_PHOTO_IDS`, the services to the client's own chapel / karwahe /
  set-up photographs. An admin-set `item.image` wins over the rule; an item the client's
  material does not cover returns `null` and renders TEXT ONLY rather than a wrong picture.
- **One card grammar for the storefront: `.shop-grid` + `.shop-card`**
  (`components/villa/shop-card.tsx`). 26rem columns give three cards across at 1440 (~448px
  measured) and one at 390; the photograph LEADS at the column's full width, 4:3, with the
  figures under it and the actions last. `/products` (24 model cards, then the sheet's
  five-tier reference band and the inclusions table), `/plans` (every catalogue item, with the
  eight embalming day counts as ONE `.day-ladder` — a photograph and a priced ladder, never
  eight cards printing one picture), and `/lots` (one card per legend type, above
  the per-park plot bands). Never re-add a per-surface card: the captain's 2026-09-19
  complaint was measured at 88×66 product images and three images on the whole of `/plans`.
- **The tier rows are a figure, not a swatch.** `/products`' five-tier band is the ledger
  grammar (one 625px lead, four hairline rows), but a row's photo is
  `clamp(9rem, 14vw, 11rem)` — the old 5.5rem (88×66) is the exact box the captain measured.
  `tests/unit/broken-pages.test.ts` pins the template. `/products/[sku]`'s own tier strip uses
  the SAME `COFFINS[].photo` the band does (two-up at 1440, one-up at 390, top hairline, no
  box) — never the old `COFFIN_SAMPLE_PHOTOS` sheet crops, so one tier cannot look like two
  different coffins across the surfaces; `tests/unit/villa-services-premium.test.tsx` pins it.
- **A `sizes` hint must match the layout it is in.** The measured upscales this pass fixed
  were all one bug: a 480px derivative asked for by a 620–690px column because the hint said
  `22rem`/`26rem` (the lot band lead, the facilities grounds figures, the home rail thumbs).
  When a figure's column width changes, change its `sizes` in the same edit.
- `scripts/build-client-photos.mjs` writes `public/media/client/` (4:3 `*-card-440/880`,
  3:2 `*-wide-960/1600`) from the client's originals kept OUTSIDE `public/` in
  `media-sources/client-photos/` — seven of the twenty-one show identifiable mourners and are
  held by name in `lib/client-photos.ts` (`HELD_CLIENT_PHOTOS`). Re-run it when an original
  changes; `tests/unit/client-photos.test.ts` pins every published file and its honesty class.
  `tests/unit/catalogue-imagery.test.ts` walks every catalogue SKU, fails a missing file, a
  sample without its caption, a casket photo that disagrees with `casketModelPhotoId()`, or a
  photograph two items share without a sample label.

## Public services page & casket catalogue — `/services`, `/products`

- `/services` is the **captain-approved 2026-09-16 senior-first design** — the contract
  is `docs/08-delivery/services-design/` (artifact + 5 sample pages + `services-pages.css`),
  the implementation block is the "Services page" `sv-*` section of `styles/components.css`.
  The page is **one hero → straight to the services**: the hero, then `Services we provide`
  (`AlacarteServiceRates`), `Embalming — quoted by the day`
  (`components/villa/embalming-day-picker.tsx`, full day counts behind a disclosure) and
  `Chapel — ask us for dates and a quote` (the park's own record → the chapel cards,
  `ChapelRates`), then the `Talk to a person, any hour` band. The pre-migration sticky subnav,
  the "what happens after you call" steps, the chapel placeholder disclaimer, the full 3–9 day
  chapel stay schedule, the "Guides for what comes next" section and the "Where these figures
  come from" provenance block are all RETIRED — the trim is recorded in
  `docs/08-delivery/services-trim-design/`. It all renders from
  `components/villa/service-rates-2026.tsx`; the sheet's figures stay in `lib/villa-pricing.ts`
  but are no longer displayed.
  **Request-for-Quote (captain's minutes, 2026-09-21, item 5): the funeral-service surfaces
  publish no price and offer no cart action.** Every service line — the five a-la-carte fees,
  each embalming day count and each chapel class — carries ONE `Request a quote` action
  (`lib/public-forms/request-prefill.ts` `buildQuoteHref`) that opens `/quote` with the service
  prefilled; the quote capture records the name, contact details, requested service, preferred
  date and additional requirements in the demo inquiry store
  (`lib/demo-inquiry-captures.ts`) the staff board reads. The chapel booking dialog
  (`components/chapel-booking-dialog.tsx`) is no longer linked from `/services`.
  The 24/7 number is staff-editable landing content (zone 01); the page reads it
  from the same document the header reads — `tests/unit/villa-services-premium.test.tsx`
  pins that an edit reaches every call action, so never type the number again.
  `tests/unit/price-surfacing.test.tsx` and
  `tests/unit/villa-services-premium.test.tsx` both pin the no-price / quote-action split — keep
  them when editing the layout. Senior-first is non-negotiable: 18 px body, nothing under 16 px in
  page content, tap targets ≥ 44 px. The three guide ROUTES
  (`/services/death-at-home`, `/services/death-at-hospital`, `/transport`) stay as editable
  service entries listed from `/staff/landing/services`, but `/services` no longer links them.
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
- **`/products` is an Amazon-familiar product listing, not four collection bands (2026-09-25).**
  The single Lumina band stranded one card in a row of four; the page now renders a
  sticky left refine rail (Collection · Cover · Price — `lib/casket-listing.ts`,
  `components/kit/listing-shell.tsx` + `refine-panel.tsx`) beside one even
  picture-first grid in the sheet's collection order, with a results count and a
  sort control. The old static collection index (name · count · entry price, no
  filter) was removed — the rail's Collection group does that job and stays in
  view. `.casket-grid` (not the shared `.shop-grid`) owns the column floor:
  **3 across at 1440/1280, 2 at 1024 and below the rail breakpoint** —
  `min(100%, 16.5rem)` beside the 17rem rail. A card is
  picture → family → name → ONE supporting line (the cover; Lumina reads "Cover confirmed by the
  office", the long `COFFIN_COVER_UNSTATED` stays on the detail view) → the prominent SRP → one
  compact senior line → **ONE primary action** (the gold `Add to cart`), with `Request order` and
  `View details` as quiet `.catalogue-actions__link` links and the photograph/title as the detail
  path. `CatalogueActions`' `secondaryAsLink` option is what demotes the pair on a card.
  The card's caption is one short
  `COFFIN_SAMPLE_NOTE` ("Illustration purposes only."); the full `COFFIN_TIER_NOTE` prints once
  below the tier band and on the detail view. Cards fell from a 50–73-word `<li>` (avg 54.8) to
  29–39 (avg 32.9). The listing restructure's record + structural inventory:
  `docs/08-delivery/storefront-listing-design/`; the word/one-primary-action rules are pinned by
  `tests/unit/products-listing.test.tsx`, the pure model by `tests/unit/casket-listing.test.ts`.
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

## Immediate assistance — `/immediate-assistance` (read before touching it or its entry points)

- The F-01 screen (captain 2026-09-18): the hardest moment gets its own page. Its content
  order is the contract — the enormous `tel:` call first (read from the landing document's
  contact region, zone 01; never typed), then four numbered steps, then one reassurance line,
  then the secondary alternatives (location · `/contact` · `/client/login`). Full width
  belongs to the call; nothing else asks for a decision. One `h1`, no motion, tokens only.
  Honest states: the content document carries no street address and no office hours, so they
  are omitted — never invent a second number or a schedule.
- Entry points are the phone bar's `anchored-phonebar__btn--help` target (mobile;
  the approved D3 bar carries three targets — recorded in
  `docs/08-delivery/public-nav-design/README.md` §4) and the guide pages'
  "Immediate assistance" buttons. The retired header utility row's
  `anchored-header__assist` chip and the home rail's `rail-call__assist` link are
  both gone (captain 2026-09-21); the phone bar's "Call 24/7" is the one-tap call.
  Never add a nav menu entry.
- It is a reading-budget page: `tests/unit/reading-budget.test.tsx` renders it (paragraphs
  ≤ 30 words, opening sentence ≤ 12, list items ≤ 30) and the phone number + step 1 must
  stay above the fold at 390 px (evidence + screenshots under
  `docs/08-delivery/immediate-assistance-design/`). `tests/unit/immediate-assistance.test.tsx`
  pins the call-first order, the doc-driven number, the steps and the honest omissions;
  `lib/seo.ts` publishes the route in `PUBLIC_PAGES` and `sitemap.xml`.

## Facilities page — `/facilities` (the rooms a family is choosing between)

- F-02's screen: `app/(public)/facilities/page.tsx` (`.fac-*` block in
  `styles/components.css`) shows the two chapel classes with the client's own sample
  photographs, what each suits and one `Request a quote` action per room — the sheet's
  per-day rate is no longer displayed (Request-for-Quote, captain's minutes 2026-09-21 item
  5). `tests/unit/facilities-page.test.tsx` renders `/services` too and fails if either page
  publishes a service rate. The 24/7 number is the staff-editable
  landing content, never typed. The grounds list is the client masterplan's own labels
  (`lib/park-3d/masterplan.ts`), and the map / 3D walk-through are linked, never redrawn.
- **Its honest state deliberately differs from `/services`**: the park's real chapel
  names, count and capacities are an open client question
  (`docs/07-client-villa/open-questions.md`), so this page publishes no room name, no
  capacity and no count and says so in one line (`.fac-placeholder`). Do not "fix" it by
  copying `/services`' app-authored `Chapel A`/`120 people` placeholders onto it.
- It is a reading-budget page (`tests/unit/reading-budget.test.tsx`) and a public-nav
  page: the grouped "Explore more" menu, the phone quick menu, the footer's
  "Explore" column and `PUBLIC_PAGES`. Render record + shots:
  `docs/08-delivery/facilities-design/README.md`.

## Public gallery & virtual tour — `/gallery` (read before touching the gallery or its media)

- `/gallery` is the one photographic front door to the park: grouped client photography
  (gate · pavilion & grounds · chapels/viewing/carriage) plus the ONE entry to the existing
  `/map` (map + full-screen 3D) — the walk-through is linked, never rebuilt, and the line
  beside it says which view is which. The 24/7 number is read from the landing content's
  `contact` (never typed). Nav: the grouped "Explore more" menu + footer/mobile flyout; `PUBLIC_PAGES` in
  `lib/seo.ts` (its test fails a public page missing from it).
- Content and honesty rules live in `lib/gallery.ts`: every photo is client material in
  `public/media`; the sheet's samples keep `CHAPEL_SAMPLE_NOTE` / `SERVICE_SAMPLE_NOTE`
  ("Illustration purposes only"), the masterplan is captioned as a drawing, and the carriage
  card is cropped from the sheet's own photograph — the 350×140 `service-carriage.jpg` tile is
  only the photo's top strip and crops to the building behind it.
  `tests/unit/gallery-page.test.tsx` pins the labels, the single `/map` link, reserved image
  dimensions and the published file weights; `tests/unit/reading-budget.test.tsx` gates the copy.
- Derivatives, not originals: `scripts/build-gallery-images.mjs` writes
  `public/media/gallery/*.webp` (1×/2× widths, 3:2 card crops, no upscaling). Re-run it when a
  source photo changes — the page loads ~287 KB at 1440/DIP1 and ~510 KB at 390/DIP3 from
  ~3 MB of source originals, so never republish a multi-MB original.

## Digital memorial — `/memorials`, `/memorials/[id]`, `/memorials/find` (F-04; read before touching them)

- The three public memorial screens: the search shows its **privacy rules before its results**,
the memorial page is one person's family-published record, and `/memorials/find` is the family's
gentler path (how the office looks, what to bring, how a memorial is created or changed).
- **NOTHING IS PUBLISHED BY DEFAULT and no fabricated person may ship.** The rules live in
`lib/memorials.ts` (visibility vocabulary — `familyLabel` pinned by reading the family portal
page — searchable/never-shown lists, the empty-query-is-nobody matcher). `lib/api-client/memorials.ts`
is the tolerant reader and **drops every record whose visibility is not `published`**; the fixture
`lib/fixtures/memorials/memorials.json` records `service_state: "not_wired"` and an EMPTY
`memorials` list (the demo family's consent is `null` — “Not decided yet”). `memorialsLiveModeEnabled()`
is always false: no service or contract exists, and no flag may pretend one does. The published
profile is proven by tests with a test-only record (`tests/helpers/memorial-record.ts`), never by
fixture data.
- **One uniform answer for absent AND unpublished ids** (both → `UnavailableMemorial`): the page
never confirms that a private person exists, never echoes the id, and its head is noindex
(`UNPUBLISHED_MEMORIAL_ROBOTS` in `lib/seo.ts`). A published record gets normal `pageMetadata` and
enters `app/sitemap.ts`; `/memorials?…` is `noindex` + `Disallow: /memorials?` in `app/robots.ts`
(a robots blanket ban on `/memorials/` would hide published memorials too). `/memorials` and
`/memorials/find` are in `PUBLIC_PAGES`; the detail shape never is.
- The two static routes are in the reading budget (`tests/unit/reading-budget.test.tsx`) with the
not-available detail state; `tests/unit/memorials.test.ts`, `memorials-pages.test.tsx`,
`memorials-published-page.test.tsx` and `tests/fixture-contract/memorials.test.ts` pin the rules.
Evidence: `docs/08-delivery/memorials-design/`.
- **Public-minimal identity pass (lane 4 of `data/villa-public-design-plan`).** The
  three memorial routes render the Phase 0 primitives — `PublicHero` (`interior`),
  `SectionHead`, `PublicDisclosure` — inside the **reading envelope**
  (`.mem-page` = `--layout-reading-w`, 60 rem); long vocabulary and the family's
  choices sit behind the shared disclosure. The new CSS is the
  `/* public: identity block */` at the tail of `styles/components.css` (never
  edit it from another lane). `/register` renders on the same
  `signin-shell--premium` / `signin-card` grammar as the three sign-in doors, so
  the identity surface is one design. Full-page shots + the measured audit table:
  `docs/08-delivery/identity-minimal-design/`; the section blueprint for
  `/memorials` and `/memorials/find` is in `tests/unit/public-page-budget.test.tsx`.
- Honest gaps that must stay honest: the client's own public search/privacy rules are still an
open question (`docs/07-client-villa/open-questions.md`) and are named on `/memorials/find`.

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

- **`/services` no longer books a chapel (Request-for-Quote, captain's minutes 2026-09-21
  item 5):** each chapel card carries one `Request a quote` action to `/quote`, not the
  booking step. The booking flow itself still lives here —
  `components/chapel-booking-dialog.tsx` (choose chapel → start date + 3–9 day stay →
  per-day availability → exact range price → Add to cart) — but nothing on a public service
  page links it any more; re-linking it is a product decision. Never re-add a direct chapel
  Add-to-cart button.
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

## Smart Service Builder — `/builder` (F-05; read before touching the configurator or its prices)

- **It is an ESTIMATE over the client's published figures, never a computed quotation.** The
  PRD's live pricing/availability rule engine does not exist, so nothing is priced by a service:
  `lib/service-builder-catalog.ts` joins `lib/villa-pricing.ts` (casket catalogue + both senior
  columns · the a-la-carte fees · the embalming ladder · the chapel schedule) with the CURRENT
  pricing store document (plan tables) into the plain catalog the client component renders. No
  amount is ever typed into the view, and an office edit on `/staff/plans` is what a visitor sees.
- **One rules home, pure: `lib/service-builder.ts`** — the selection/answers, the estimate
  (priced lines · covered lines · owned items · pending steps · office-quoted items · the plan's
  separate monthly amount) and the request prefill. It adds up what it is handed and holds no
  figure. The plan is an instalment product: its amount is NEVER part of the one-time total, and
  a held or chosen plan reduces that total by OMISSION (its lines list as covered, no amount) —
  never by a fake zero.
- **The senior choice applies only where the sheet prints a senior column** (casket · chapel ·
  plan) — never to an a-la-carte fee. Casket rows publish BOTH sheet columns, as the sheet's own
  table does; the picked model repeats the other column as a comparison.
- **Honest states are the deliverable**: the four withdrawn catalogue lines appear only as
  "ask the office" labels (`WITHDRAWN_CATALOG_ITEMS`), the burial lot stays an office per-plot
  quotation (the lot sheet's families are never published here), under three preparation days and
  any unanswered step print words with no figure, and an arrangement already with the office
  stops the pricing entirely. The panel says outright it is an estimate the office confirms; the
  screen ends on the office — the staff-editable 24/7 number plus the existing `/contact`
  request path (`buildRequestHref`, with the arrangement written into the note).
- **Nav/SEO**: `Builder` in the grouped "Explore more" menu (`EXPLORE_MORE_LINKS`),
  the footer's Explore column, and `/builder` in `lib/seo.ts` `PUBLIC_PAGES`
  (indexable — a selling surface, unlike the memorial pages).
- Evidence: `tests/unit/service-builder.test.ts` (sheet figures, store-read rates, the senior
  rules, the covered total, the request note), `tests/unit/service-builder-page.test.tsx`
  (rendered screen + honest states), `tests/unit/reading-budget.test.tsx`,
  `tests/unit/seo.test.ts`; record + shots `docs/08-delivery/service-builder-design/`.

## Villa park — `/map` hosts TWO connected modes (read before touching the park map)

- The Villa Memorial Park page (`app/(public)/map/page.tsx` → `components/public-park-map.tsx`)
  switches between **Map** (the plain masterplan image) and **3D** (the orbit-navigated park,
  react-three-fiber). The 3D mode owns the whole screen: entering requests full screen from
  the switch gesture (graceful where the browser refuses) and every control — exit, camera,
  zoom/frame, section/search/filter list, settings, details — lives inside the experience,
  never in the page chrome. The product carries ONE park — Villa Memorial Park; the
demo Loyola Gardens / Golden Haven records were removed 2026-09-21 and no surface
renders a park switcher (`tests/unit/single-park.test.tsx`).
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
- **Plotting is admin-only, and the public map never carries it** (captain, 2026-09-20):
  `app/(public)/map/page.tsx` reads no session and passes no capability — `/map` is VIEW-ONLY
  for everyone, signed in or not, in Map mode and 3D alike; a signed-in administrator plots
  from the admin area, not there. Plot authoring lives on `/staff/property`: the page resolves
  `canEditPlots` (`lib/park-3d/capability.ts`, scope `property:write`) and hands it to
  `PropertyExplorer`, which passes `canEdit` to the shared `park-maps-view.tsx` editor. Never
  resolve a plotting capability on a public route again —
  `tests/unit/public-map-view-only.test.tsx` fails it.
- **Navigation is Blender-style orbit, not a game camera** (captain, 2026-09-17): drag orbits,
  wheel/pinch/± zoom, middle-drag or Shift+drag (two fingers on touch) pans, and selecting a
  plot/section/place frames it with a damped glide (never a teleport; no roll, no ground
  clipping — the rig keeps the camera above `ORBIT.minCameraHeightM` and the focus point near
  the site). The envelope + framing math is `lib/park-3d/orbit.ts` (pure, unit-tested); the
  gestures are `components/park3d/camera-rig.tsx` (OrbitControls). "Masterplan view" is a
  top-down angle of the same camera, not a second camera. A plot drag disables the orbit
  controls for its duration (`draggingPlot` in the view store).
- **Reserving on the public map is the request path only** (2026-09-20): the 3D plot panel
  keeps the request-to-reserve enquiry link for everyone (the `reserveSlot` capability door is
  no longer wired on `/map`). The real transition lives on `/staff/property`
  (`components/lot-reserve-action.tsx`, the same BFF route `POST /api/property/lots/:id/reserve`;
  only `available → reserved`, the property service is the authority). A reservation is the
  LOT's status, and `lib/park-live-lots.ts` overlays it onto the same plot records both modes
  draw — never write a lot's status into the plot store.
- **The 2D canvas is an image map, so it must not snap zoom.** `ParksCanvas` sets
  `zoomSnap: 0` (craft pass, 2026-09-18): Leaflet's default snap of 1 makes `fitBounds`
  **floor** the fitted zoom (2.84 → 2), which left the square masterplan 300px wide inside a
  1062×540 frame with every plot label piled into one smear. With no snap the plan fills the
  frame; `refit` runs on the ResizeObserver plus two post-layout rAFs and a 320ms timer (all
  skipped after the visitor pans/zooms). The home band renders the same canvas in a narrow
  column, so `.mid-section--map .map-embed .geo-map` drops the shared 540px height for the
  park frame's own 4:3 — keep both rules together.
- **Plot labels paint only once their own plot is wide enough** (captain's home review,
  2026-09-21: the ~140 placeholder plots each painted a code in a few pixels, an unreadable smear).
  `lib/park-maps.ts` `labelDensityFor(plotWidthPx)` is the one rule — `off` below
  `LABEL_MIN_PLOT_PX`, `code` only, `full` (legend type + owner) above `LABEL_FULL_PLOT_PX`; the
  canvas sets a per-marker `data-label-density` from the plot's own width (circle diameter / bbox)
  times `pxPerUnit`, refreshed on `zoomend` and after each redraw, and the CSS hides/trims the
  marker. The legend below the map is what names types at the overview.
- **3D internals**: scene/blockout `components/park3d/scene.tsx`, real raycast plot picking +
  instanced slabs `components/park3d/plots-3d.tsx`, vegetation instancing
  `components/park3d/vegetation.tsx`, UI/store state `lib/park-3d/view-store.ts` (zustand),
  orbit envelope + framing `lib/park-3d/orbit.ts` + `components/park3d/camera-rig.tsx`,
  POIs `lib/park-3d/masterplan.ts`. The developer
  overlay (`components/park3d/debug-layer.tsx`) is dev-builds-only. Pure modules have unit tests
  in `tests/unit/park-3d-*`.

