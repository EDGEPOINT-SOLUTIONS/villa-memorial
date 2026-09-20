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
   services. The UI must render graceful 403 states when scopes don't allow an action. Staff
   page gates declare inline scope arrays from the frozen vocabulary
   (`docs/08-delivery/contracts/rbac-scopes-v1.md`); `tests/unit/staff-scope-vocabulary.test.ts`
   fails any token outside it and checks the admin persona resolves every gate.
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
- **Typing a font or an off-ladder size.** The product owns two faces — Alegreya (display serif)
  and Source Sans 3 (interface sans), SIL OFL 1.1, self-hosted under `public/fonts/` and declared
  in `styles/fonts.css` (imported first in `app/globals.css`). Every readable text size is one
  of the seven ladder steps in `styles/tokens.css` (12px hard floor; the public hero is the one
  fluid `--text-display`); text ink is one of the four `--color-text-*` roles, and decorative
  gold never carries text. `tests/unit/typography-system.test.ts` fails a raw/off-ladder size,
  a sub-12px value, a second typeface or a gold-as-text rule; `tests/unit/park-map-labels.test.ts`
  pins the overview map label density rule. **The two faces carry no emoji**, so a published one
  is not an emoji but a missing glyph — an empty box on the page, which the home's newsfeed lead
  caption shipped (U+1F33F). `unrenderableGlyphs()` in `lib/api-client/landing.ts` is the one rule
  and the content publish gate refuses them by name.
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
- **Letting a global form-control rule beat `.visually-hidden`.** The product-wide
  `input:not([type="checkbox"]):not([type="radio"]) { width: 100% }` out-specified the
  1×1px helper, so a hidden file input stretched to its row and pushed the map / property /
  landing-editor pages 57–380px past the viewport (the whole page could be panned sideways).
  Both rules now carry `:not(.visually-hidden)`; keep it that way in `styles/components.css`.
- **A phone width is a rendering contract, not a smaller desktop.** At 390 the `/plans` rate card
  sliced its caption and its third tier to the viewport edge inside a pan frame (it now stacks
  below 40rem — `.price-table--plan` + the cells' `data-tier` labels), the `/lots` type filter's
  999px capsule turned into an ellipse through its own chips (every wrapping capsule needs a
  ≤40rem radius cap), and the `/plans/villa-memorial-plan` hero printed 560px logos because
  `.plan-logo-row`'s rule had been deleted while the page kept the class (`.text-xs`, `.stack-2`,
  `.sr-only`, `nowrap`, `.table__name/__sub` were the same "referenced, never defined" bug).
  Read `docs/08-delivery/visual-regression-2/README.md` before touching a public phone layout;
  `tests/unit/phone-layout.test.tsx` gates the class (phone re-layout for the rate table, capsule
  caps, pan containers' `overflow-x`, and the closed utility vocabulary — add the rule in the
  same commit as the class, and `grep "^\\.<class> {"` first).

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
| Deployed (production profile) | `docker compose --env-file .env.production -f docker-compose.production.yml up -d --build` | Same image, demo conveniences pinned OFF (no quick-fill, no published password, secure cookies, no persona chips), gateway URLs from the env — empty keeps that surface on fixtures. Recipe + proof: `docs/08-delivery/deploying-web.md`; env: `.env.production.example` |

The demo stack is **never** the deployment: `docker-compose.yml` publishes a demo password,
runs non-Secure cookies and starts the stub gateway. It keeps its NOT FOR PRODUCTION banner
and stays usable for development. A production build passes `NEXT_PUBLIC_DEMO_HINTS=0` and the
Dockerfile refuses `NEXT_PUBLIC_DEMO_PASSWORD` outright (Next inlines it into public JS);
fixture-mode sign-in is NOT access control, so an audience-facing box sets `AUTH_BASE_URL`.

Demo one-click persona fill is a **server-side opt-in**: `DEMO_QUICK_FILL=1` (plus
`DEMO_QUICK_FILL_PASSWORD` whenever `AUTH_BASE_URL` is set — the repo seed is never handed to a
gateway) is resolved per request in `lib/demo-quick-fill.ts` and reaches the sign-in card as a
prop. Credentials must never go in `NEXT_PUBLIC_*` (inlined into public JS; the existing
`NEXT_PUBLIC_DEMO_PASSWORD` path is local-dev only). Docs: README "Demo logins (fixture mode)",
`docs/08-delivery/notes/known-limitations-cp1.md`.

## Composition grammar — the "ledger" band (read before rebuilding any public band)

- **A band leads, it does not count.** No public band may be a grid of equal boxes. The one
  grammar is declared in the "composition grammar" block of `styles/components.css`: `.ledger`
  (band) · `.ledger__lead` (ONE dominant element — the client's photograph, the loudest figure) ·
  `.ledger__list`/`.ledger__entry` (supporting entries separated by HAIRLINES, two columns) ·
  `.ledger__row` (what it is · its figure · its actions) · `.band-head` (group name + real count +
  one action, replacing a prose intro). Hierarchy comes from scale, position and a rule — not from
  a border and a shadow applied to every tile. `.svc-band__lead`/`.svc-band__list` are the same
  grammar for the home band under its own names because `landing-view.test.tsx` pins `a.svc-card`.
  Evidence + measured before/after (gradients, shadows, page heights):
  `docs/08-delivery/composition-pass-design/README.md`.
- **One class, one declaration.** `.svc-grid`/`.svc-card*` were declared twice (a dead block in the
  `/services` section and the live home block), and the dead declarations silently re-templated the
  home band into a 13.5rem card grid. Before adding a rule, `grep "^\.<class> {"` the file — the
  same trap AGENTS.md already records for `.chapel-month` vs `.chapel-grid`, and the one that hit
  `.tier-row` (the package page's tier × term segmented control is the older owner; `/products`'
  tier ledger row had re-used the name and inherited `repeat(5, …)` plus its box chrome — it is
  `.tier-ledger__*` now). Six classes are still declared twice at top level; `tests/unit/
  broken-pages.test.ts` walks them and fails a collision that re-templates another component.
- **A stated `aspect-ratio` on an `<img>` is not enough — reset `height: auto`.** A `width`/`height`
  attribute is a presentational hint: it supplies a *definite* height, and a definite height makes
  `aspect-ratio` a no-op, so the picture renders at the attribute's height. Every `img`-level ratio
  in `styles/components.css` carries the reset (the picture's space stays reserved — that part is
  correct); `tests/unit/broken-pages.test.ts` fails one that does not. An `aspect-ratio` on a
  *wrapper* (`.media-block`, `.gal-figure__media`) is safe — the picture inside takes an author
  `height: 100%`, which outranks the hint.
- **Every generated image goes through `lib/media.ts`.** `scripts/build-composition-images.mjs`
  publishes (a) `public/media/composition/*.webp` — the client's lot tiles with their logo lock-up
  and title band cropped off, because a tile is a *marketing tile*, not a photograph — and
  (b) `public/media/composition/thumbs/*.webp` at 320/640 px for every library asset a public view
  can render. Use `libraryThumb(src, w)` / `libraryThumbSet(src)`; an asset they do not know (a
  staff URL, a device upload) comes back unchanged. Never publish a multi-MB original at thumbnail
  size (the home used to ask a phone for 12 MB to paint a rail), and never re-add a decorative
  gradient or `--shadow-card-rest` to a public band or button —
  `tests/unit/composition-pass.test.tsx` fails on both, naming the rule.
- **A photograph printed many times is not many photographs.** The sheet photographs five sample
  coffins and binds none to a named model, so a per-model card could only reprint its collection's
  one picture; the catalogue now publishes it once, chipped, and lists the collection's models as
  priced rows. `/plans` carries 42 catalogue items and **no** item image — it is a price index.
- **A tile is never a page's picture — not even in a card.** The craft pass (2026-09-18) found
  the last two surfaces still printing the marketing tiles: `/lots/[id]` (cropped to the tile's
  logo corner) and `/lots/price-list-2026` (tile title + logo above a caption that repeats it).
  `VILLA_SECTION_PHOTOS` now maps sections to `PARK_PLACE_BY_TYPE` derivatives (section D
  included), and a photograph card sets its own box with `.media-block--photo` (4:3,
  `object-fit: cover`) so a row of photographs keeps one baseline. A detail page that shows the
  whole picture uses `.media-block--natural` — an unsized `<img>` inside the plain 16:10
  `.media-block` is the bug this records.

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
  and the layer helper live in `lib/landing/hero-background.ts`): the colour
  paints as ONE `.hero-home__wash` layer ABOVE the photo + its scrim and BELOW
  all hero copy, transparency 0 = solid and 100 = fully see-through — the
  default, so documents that never touched the fields render today's look
  untouched. The editor control is
  `components/landing/hero-background-field.tsx` (palette · free input · live
  preview · 0–100% slider). The left rail's 24/7 call card is a sky-blue
  surface (navy ink, gold-800 label) — never navy.
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
- **The same document also drives the FAQ page (`/faq`)**: its `faq` region
  (eyebrow · heading · lead · items · next-step links) is edited in editor zone
  09 and rendered by `app/(public)/faq/page.tsx`. Never re-hardcode FAQ copy —
  seed + tolerant reader + validator + save path are `lib/api-client/landing.ts`,
  and `tests/unit/faq-page.test.tsx` pins that an edit reaches the page.
- **ONE content editor** (captain, 2026-09-18): `/staff/landing` (nav
  "Pages & content") is the only content surface; the retired `/staff/store`
  stub is a redirect to it and its duplicate nav entry is gone. Storefront
  COMMERCE settings live on `/staff/catalog`, `/staff/pricing`, `/staff/plans` —
  never recreate a second content route. Evidence: `tests/unit/content-editor-nav.test.ts`.
- Public lot browse (/lots) filters plots by park, status and legend type; the
  type-filter + live chip counts live in `lib/lots-legend.ts` (pure + unit-
  tested at tests/unit/lots-legend.test.ts) and read types from
  `lib/park-types.ts` — never inline that filter logic in the page. The demo
  lots' areas/prices are the 2026 lot sheet's family figures for their section
  (`lib/catalog-sources.ts`, pinned by `tests/fixture-contract/catalog-sources.test.ts`)
  — never a per-plot price.
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
- **The contact surface is `/contact`**: it leads with the office's published
  facts — both hotlines, the main-office and park addresses, availability —
  before the form, plus the quote/appointment paths. Those facts are the
  staff-editable landing contact region (`secondPhoneDisplay/Href`,
  `officeAddress`, `parkAddress`; editor zone 01 at `/staff/landing`), seeded from
  the client's 2026 Purchase Application Form letterhead; the validator keeps the
  second line a number + `tel:` pair or empty. Never type a number into a view and
  never invent walk-in hours (the client material carries none).
- **No public raster art may print a contact detail the landing document does not
  carry.** The plan poster (`public/media/plan-packages.png`, served by `/plans`,
  the package routes and `/packages`) printed the prototype placeholder
  `0917 123 4567`; F-17 masked the advisor strip's left band to the poster's own
  navy (art and gold tagline untouched) and re-derived the composition thumbs
  (`scripts/build-composition-images.mjs`; only the two `plan-packages-*.webp`
  files changed). Check a newly uploaded poster for baked-in numbers before
  publishing it.
- Evidence: `tests/unit/journey-actions.test.tsx` (band, exemption, contact facts,
  placeholder-number source scan), `tests/fixture-contract/landing.test.ts`
  (letterhead provenance); record + 1440/390 shots
  `docs/08-delivery/journey-fixes-design/`.

## Public page copy — the reading budget (captain, 2026-09-18)

- The client read the site as "too wordy… understandable at a glance", so
  `/services` and `/plans` answer first and explain behind: one ≤12-word opening
  sentence + one primary action, every section heading states the answer, and a
  comparison/price/process renders as a table, price block, numbered step or
  labelled chip — not as prose.
- Enforced, not advisory: `tests/unit/reading-budget.test.tsx` renders both pages
  and fails when paragraph prose exceeds 300 words, any paragraph exceeds 30
  words, any list item exceeds 30 words, or the opening sentence exceeds 12 words
  (measure helper `tests/helpers/prose.ts`; the failure names the page and count).
  A further page joins `PAGES` in the PR that compresses it — never re-hardcode
  prose to satisfy it. The home's copy is staff-editable landing content, so it is
  measured in the PR record, never gated.
- Honest notes stay, compressed: the senior-rate conflict, the placeholder chapel
  list and the sheet provenance keep their exact meaning. Sheet footnote constants
  (`CHAPEL_NOTES`, `CHAPEL_SAMPLE_NOTE`) are compressed in place — the figures stay
  pinned by `tests/unit/villa-pricing.test.ts`; the crop/provenance detail lives in
  `lib/media.ts` comments, not on the customer page.

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
  stays the ink/structure ladder. The staff sidebar is sky blue too (captain
  2026-09-17 — the `.app-shell` premium block paints a sky-200→sky-400 gradient with
  navy ink and gold-800 accents; the staff content chrome keeps its navy/gold buttons).
  Home, footer, hero and public surfaces paint
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

## The storefront imagery pass — the client's own photographs, and the shop card (read before changing any product or service picture)

- **One rule home for a model's photograph: `lib/media.ts`'s `CASKET_MODEL_PHOTOS`** — an
  explicit 24-row table (model → `lib/client-photos.ts` id), laid out so no family and no
  neighbouring card repeats a picture. The chosen picture answers two questions only: the
  COVER the model's own name states (Half = lid down or on its half stay; Full / Full Split /
  Flexi = the raised cover the sheet's convertible line describes) and the collection's price
  band. The client's photographs are NOT named after the 2026 sheet models — that
  reconciliation is an OPEN CLIENT QUESTION — so no page may name a photograph as a model, and
  **every** published sample carries the chip and the sheet's substitution note
  (`COFFIN_TIER_NOTE`). Six photographs cannot be twenty-four coffins: the PR that owns this
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
  eight cards printing one picture), `/packages` and `/lots` (one card per legend type, above
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
  The page leads with the 24/7 call panel, a sticky "On this page" bar
  (`components/villa/services-subnav.tsx`, five anchors), the three "what happens after
  you call" steps and the two guide cards; then one `.sv-section` per sheet block:
  at-need cards (`AlacarteServiceRates`), the embalming day picker
  (`components/villa/embalming-day-picker.tsx`, full day counts behind a disclosure) and
  the chapel cards (`ChapelRates`) with one `.sv-stay` row per 3–9 day stay — the raw
  sheet table is never the phone experience. It all renders from
  `components/villa/service-rates-2026.tsx`; figures stay in `lib/villa-pricing.ts`.
  The 24/7 number is staff-editable landing content (zone 01); the page reads it
  from the same document the header reads — `tests/unit/villa-services-premium.test.tsx`
  pins that an edit reaches every call action, so never type the number again.
  The a-la-carte and embalming lines keep the shared Add-to-cart + Request-order pair
  (`components/villa/catalogue-actions.tsx`); **chapel lines are the one documented
  exception — they open the booking step** (`ChapelBookingButton`, "Check dates & price"
  on the cards and "Book N days" per stay row — whose accessible name carries the chapel,
  `aria-label="Book N days — Common|Private chapel"` — per the chapel-booking contract
  below), never a plain add-to-cart. Every line shows its "In your cart" chip after an
  add (`components/villa/in-cart-notice.tsx`). `tests/unit/price-surfacing.test.tsx` and
  `tests/unit/villa-services-premium.test.tsx` both pin that split — keep them when
  editing the layout. Senior-first is non-negotiable: 18 px body, nothing under 16 px in
  page content, prices always with their unit, tap targets ≥ 44 px. The two home/hospital
  **guide cards reuse `.sv-price-card` and must not inherit its two-column ledger template** —
  `.sv-prices--guides .sv-price-card` declares its own one-column stack, because the ledger's
  `auto` track and `align-items: baseline` put the photograph in the right column and dropped
  the heading to the picture's bottom, opening a 174 px hole in both cards.
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

## Immediate assistance — `/immediate-assistance` (read before touching it or its entry points)

- The F-01 screen (captain 2026-09-18): the hardest moment gets its own page. Its content
  order is the contract — the enormous `tel:` call first (read from the landing document's
  contact region, zone 01; never typed), then four numbered steps, then one reassurance line,
  then the secondary alternatives (location · `/contact` · `/client/login`). Full width
  belongs to the call; nothing else asks for a decision. One `h1`, no motion, tokens only.
  Honest states: the content document carries no street address and no office hours, so they
  are omitted — never invent a second number or a schedule.
- Entry points are exactly three render sites, one per surface: the header's
  `anchored-header__assist` chip (desktop, hidden < 75rem), the phone bar's
  `anchored-phonebar__btn--help` target (mobile; the approved D3 bar now carries three
  targets — recorded in `docs/08-delivery/public-nav-design/README.md` §4), and the home
  rail's `rail-call__assist` link under the 24/7 card (`RailPanel`, landing-view.tsx). The
  rail card's number stays the one-tap call; the guide pages' "Immediate assistance"
  buttons point at this route too. Never add a fourth nav menu entry.
- It is a reading-budget page: `tests/unit/reading-budget.test.tsx` renders it (paragraphs
  ≤ 30 words, opening sentence ≤ 12, list items ≤ 30) and the phone number + step 1 must
  stay above the fold at 390 px (evidence + screenshots under
  `docs/08-delivery/immediate-assistance-design/`). `tests/unit/immediate-assistance.test.tsx`
  pins the call-first order, the doc-driven number, the steps and the honest omissions;
  `lib/seo.ts` publishes the route in `PUBLIC_PAGES` and `sitemap.xml`.

## Facilities page — `/facilities` (the rooms a family is choosing between)

- F-02's screen: `app/(public)/facilities/page.tsx` (`.fac-*` block in
  `styles/components.css`) shows the two chapel classes with the client's own sample
  photographs, what each suits, and the sheet's per-day rate read from `CHAPEL_RATES` in
  `lib/villa-pricing.ts` — `tests/unit/facilities-page.test.tsx` renders `/services` too
  and fails if the two pages' amounts ever differ. The 24/7 number is the staff-editable
  landing content, never typed. The grounds list is the client masterplan's own labels
  (`lib/park-3d/masterplan.ts`), and the map / 3D walk-through are linked, never redrawn.
- **Its honest state deliberately differs from `/services`**: the park's real chapel
  names, count and capacities are an open client question
  (`docs/07-client-villa/open-questions.md`), so this page publishes no room name, no
  capacity and no count and says so in one line (`.fac-placeholder`). Do not "fix" it by
  copying `/services`' app-authored `Chapel A`/`120 people` placeholders onto it.
- It is a reading-budget page (`tests/unit/reading-budget.test.tsx`) and a public-nav
  page: one `SITE_NAV_LINKS` chip beside Park, the phone quick menu, the footer's
  "Explore" column and `PUBLIC_PAGES`. Render record + shots:
  `docs/08-delivery/facilities-design/README.md`.

## Public gallery & virtual tour — `/gallery` (read before touching the gallery or its media)

- `/gallery` is the one photographic front door to the park: grouped client photography
  (gate · pavilion & grounds · chapels/viewing/carriage) plus the ONE entry to the existing
  `/map` (map + full-screen 3D) — the walk-through is linked, never rebuilt, and the line
  beside it says which view is which. The 24/7 number is read from the landing content's
  `contact` (never typed). Nav: `SITE_NAV_LINKS` + footer/mobile flyout; `PUBLIC_PAGES` in
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

## 2026 price list — where every client figure surfaces

- **One transcription home per figure: the pricing store for plan rates + lot prices,
  `lib/villa-pricing.ts` for the rest.** The plan tables and lot families are the editable
  document described in the next section; coffins, inclusions, a-la-carte and chapel rates
  stay in `lib/villa-pricing.ts`. `tests/unit/villa-pricing.test.ts` pins every figure
  (store seed included), and `tests/unit/price-surfacing.test.tsx` renders the real pages
  and asserts each one is published. Never author or restate an amount in a view.
- Sheet → page map (all four surfaces already render the full sheets):
  `/products` = casket catalogue (`CASKET_MODELS` — SRP, senior SRP, discount,
  discounted price, grouped by collection) + per-family inclusions
  (`CASKET_INCLUSIONS`) via `components/villa/casket-catalogue.tsx`;
  `/services` = embalming per day + the five a-la-carte fees (incl. the sheet's
  unlabelled ₱19,500 total) + chapel use rates (the per-day rates and sample photos are
  also the rooms page, `/facilities`), via
  `components/villa/service-rates-2026.tsx`;
  `/plans`, `/plans/villa-memorial-plan`, `/plans/senior-benefits` = the five tiers ×
  four terms, regular + senior, through ONE renderer
  (`components/villa/plan-payment-table.tsx`), fed the current pricing store document;
  `/lots/price-list-2026` = the store's lot families (regular + senior).
- The a-la-carte/embalming table and the chapel-use table are scoped by the sheets
  themselves: they apply when the family does NOT take a package (package embalming
  stays "no fixed day count" — the package sheet's "7 days" wording is deliberately
  not published).
- **The sheet items are sellable, not display-only.** `lib/fixtures/commerce/catalog-items.json`
  carries the client's real 2026 figures for all 24 casket models, the five a-la-carte
  fees, the embalming 3–9 day table plus the `>9` extra day, the two chapel per-day
  products and the three plan packages (monthly amortization). `lib/catalogue-skus.ts`
  is the only sheet-label → SKU map; `tests/fixture-contract/commerce.test.ts` pins each
  entry to `lib/villa-pricing.ts`. **One item → client document → figure map:
  `lib/catalog-sources.ts`** — `tests/fixture-contract/catalog-sources.test.ts` walks every
  recorded entry (and every property lot) and fails, naming the item, when a published
  price has no client source or drifts from the sheet's. **This diverges from the upstream
  platform seed** (still placeholder-priced); upstream parity is a captain decision.
  The four upstream items no 2026 sheet prices (`SRV-LIGHTS`, `ADD-COFFIN-LIZO-SR`,
  `ADD-FLOWERS`, `ADD-URN`) were WITHDRAWN 2026-09-18, not re-priced (the 2025 service
  contract names Lights and Lizo JR/SR with a blank amount column; nothing prices them) —
  `WITHDRAWN_CATALOG_ITEMS` in that module records each SKU, its upstream placeholder and
  the office-arranged state; where one is really sold the public answer is "ask the
  office" (the cart's line fallback says so), never an invented figure.
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
  Both, plus the office's per-plot lot quotation vs the lot sheet's families, are carried
  as read-only client `questions` in the pricing fixture — see the next section.

## Plan rates & lot prices — the pricing store (read before touching `/staff/plans`, `/staff/pricing`)

- **One editable home: the pricing store.** The plan tables + lot families live in
  `lib/fixtures/commerce/pricing.json` (recorded from the client's sheets) and persist
  through `lib/api-client/pricing-store.ts` (seed + append-only journal,
  `PRICING_STORE_PATH` or `.data/commerce-pricing.json`, gitignored), read through
  `lib/api-client/pricing.ts`. `lib/villa-pricing.ts` now only re-exports the validated
  seed (`SEED_PRICING`, `VMP_PAYMENTS`, `SENIOR_PAYMENTS`, `LOT_PRICE_CATEGORIES`) for
  static consumers/tests — never render those on a public page. Public pages (`/plans*`,
  `/lots/price-list-2026`, the home board, the package page, the agent lot list) read
  `loadPricingDocument()` per request (`force-dynamic`) and derive every figure through
  `planRateOf` / `lotCategoryFromPriceOf` / `lib/plan-selection.ts`; client components
  receive the document as props.
- **Rules live in `lib/pricing-model.ts`** (pure): four payment modes exactly once,
  whole-peso amounts, annual = semi×2 = quarterly×4 = monthly×12, senior ≤ regular per
  cell, unique family/product names, and lot annual × 6 ≈ selling within
  `LOT_AMORTIZATION_ROUNDING` (₱3 — the sheet's rounding). A violating save is a 422 with
  a plain sentence; the editors run the same function live, disable Save, and render the
  public components (`PlanPaymentTable`, `PriceList2026Tables`) as the preview.
- **Scopes/API/honesty**: `/api/pricing` GET needs `catalog:read`, POST needs
  `catalog:write` (the provisional scope the Commerce nav entries already use). Live mode
  (`COMMERCE_BASE_URL`) keeps the seed for display and refuses writes with 503
  (`PRICING_ADMIN_NOT_WIRED`) — no catalog-pricing read/write contract has frozen; the PR
  carries that ask. The client questions are read-only fixture metadata, outside the
  editable document: a save can never drop or silently resolve one. The static demo
  records that quote a lot price are NOT this editable document — `lib/catalog-sources.ts`
  maps each park section to a lot sheet family and
  `tests/fixture-contract/catalog-sources.test.ts` pins the property lots to it; the
  office's per-plot quotation stays an open question, never folded into a family.
- Evidence: `tests/unit/pricing-model.test.ts`, `tests/unit/pricing-store.test.ts`,
  `tests/unit/pricing-admin-render.test.tsx` (an edit reaches the public pages),
  `tests/unit/pricing-admin-rbac.test.tsx`, `tests/fixture-contract/pricing.test.ts`.

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
- **Nav/SEO**: one short `Builder` chip in `SITE_NAV_LINKS`, the full name in the "Plan ahead"
  menu and the footer's Care & planning column, and `/builder` in `lib/seo.ts` `PUBLIC_PAGES`
  (indexable — a selling surface, unlike the memorial pages).
- Evidence: `tests/unit/service-builder.test.ts` (sheet figures, store-read rates, the senior
  rules, the covered total, the request note), `tests/unit/service-builder-page.test.tsx`
  (rendered screen + honest states), `tests/unit/reading-budget.test.tsx`,
  `tests/unit/seo.test.ts`; record + shots `docs/08-delivery/service-builder-design/`.

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
- **The 2D canvas is an image map, so it must not snap zoom.** `ParksCanvas` sets
  `zoomSnap: 0` (craft pass, 2026-09-18): Leaflet's default snap of 1 makes `fitBounds`
  **floor** the fitted zoom (2.84 → 2), which left the square masterplan 300px wide inside a
  1062×540 frame with every plot label piled into one smear. With no snap the plan fills the
  frame; `refit` runs on the ResizeObserver plus two post-layout rAFs and a 320ms timer (all
  skipped after the visitor pans/zooms). The home band renders the same canvas in a narrow
  column, so `.mid-section--map .map-embed .geo-map` drops the shared 540px height for the
  park frame's own 4:3 — keep both rules together.
- **3D internals**: scene/blockout `components/park3d/scene.tsx`, real raycast plot picking +
  instanced slabs `components/park3d/plots-3d.tsx`, vegetation instancing
  `components/park3d/vegetation.tsx`, UI/store state `lib/park-3d/view-store.ts` (zustand),
  orbit envelope + framing `lib/park-3d/orbit.ts` + `components/park3d/camera-rig.tsx`,
  POIs `lib/park-3d/masterplan.ts`. The developer
  overlay (`components/park3d/debug-layer.tsx`) is dev-builds-only. Pure modules have unit tests
  in `tests/unit/park-3d-*`.

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

## Family portal — one house style with the agent portal (read before touching `(family)/client/*`)

- The family and agent portals render the SAME chrome and page grammar (captain, 2026-09-17):
  both use `components/portal-frame.tsx`, the shared kit `components/portal/portal-ui.tsx`
  (hero · action band · section · card · row · figure · progress · calm note), and the `ag-*`
  block in `styles/components.css` — its sky theme scope covers `[data-portal="agent"]` and
  `[data-portal="family"]`. The agent portal is the visual reference
  (`docs/08-delivery/agent-portal-design`); the family-only frame/bar was deleted, so never
  reintroduce a second family shell. Nav groups/tabs: `components/portal-nav.ts`
  (`FAMILY_PORTAL_GROUPS`, `FAMILY_PORTAL_TABS`); the phone top bar keeps the Call button.
- The calm note (`PortalNote`, re-exported as the family `Note`) is a **block container**
  (`div.ag-note`), never a `<p>`: every call site passes its own `<p>` (and lists are legal),
  so a paragraph wrapper recreates the captain-reported 2026-09-17 `<p> cannot be a descendant
  of <p>` hydration error on every family page. `.ag-note` CSS is class-only — keep the class
  on a block container; `tests/helpers/paragraph-nesting.ts` pins the rendered pages.
- Family FEATURES stay family-owned in `components/family/family-ui.tsx` (answer, five-step
  chain, schedule, planned/honest page): the plain words, the honest not-switched-on states,
  the office number on every screen, the 18 px family reading scale (`.fv-body` overrides the
  `--text-*` tokens inside the kit) and the device-local reading switches
  (`data-fv-reading` large/contrast/calm, `components/family/family-reading-preferences.tsx`).
- `lib/family/portal-coverage.ts` maps every PRD family screen (screen-inventory §Customer/family
  portal + notifications/profile) to route → built/partial/honest → PRD module → what is
  missing; `tests/unit/family-prd-coverage.test.ts` pins it and `family-nav.test.ts` pins the
  rail. `/client/family` is the Family Dashboard. When a contract lands, change the page and
  the coverage row together.
- Data: `lib/api-client/family.ts` is PROVISIONAL fixture-only (no frozen family API
  contract). Two fixtures: the recorded snapshot `lib/fixtures/family/snapshot.json` (plan,
  balance integer cents, the family's own papers) and the app-authored workspace
  `lib/fixtures/family/workspace.json` (the family's requests, appointments and lot record).
  The workspace records are example data with provenance, pinned by
  `tests/fixture-contract/family-workspace.test.ts`: no amount, no chapel name, no ticket
  number, no coordinator name, nothing published — Requests, Ask for a visit, Your lot and
  Remembering render them with the office phone as the action and one calm note naming the
  contract each waits on; `lib/family/family-view.ts` holds the ONE way the portal prints a
  day (calendar dates in UTC, instants in Asia/Manila) and the initials a memorial shows.
  `lib/family/contact.ts` holds the client's numbers. Never invent a figure, date, payment
  destination or contact detail. Tests: `family-pages`, `family-records`, `family-portal-shell`,
  `portal-kit`, `family-nav`, `family-prd-coverage`, `family-ui`, `family-calm-state`,
  `family-view`, `family-workspace`; `docs/08-delivery/family-portal-design` §11–12 records the
  alignment and its side-by-side verification.
- **The family's own papers are never request-gated** (captain, 2026-09-17): the service
  contract and every official receipt are the family's by right — `/client/documents` and the
  funeral page (`/client/cases`) always show them as “Yours”, with a real copy when the record
  can produce one and the honest “getting it ready for this page” state plus the office line
  when it cannot; “Ask for a copy” stays only for certificates/permits/other kinds. The
  classification + words live in `lib/family/family-documents.ts` (rows:
  `components/family/family-papers.tsx`; the snapshot's `recent_documents[].kind` is the
  source, unknown kinds stay requestable). `lib/api-client/family.ts::toFamilyDocument` is the
  family-safe projection (drops uploader, file size, internal notes/ids — pinned by
  `tests/unit/family-documents.test.ts`). One receipt opens as a copy at
  `/client/documents/receipts/[reference]` (shared paper sheet + Print/Word/PDF) only when its
  record carries number + date + amount; a half-record 404s rather than printing a plausible
  receipt. Until the family contract lands, the snapshot carries no receipt detail, so the
  honest state is what ships — the backend ask (generate the document, attach it to the family
  record, notify the family) stays open.

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

## Agent lead record — `/agent/prospects/[id]` (read before touching it or the agent fixture)

- F-09 (captain 2026-09-18) grew the approved page-04 prospect record into the lead record the
  pipeline opens: hero (name · how/when they came in · who handles them · contact chips · stage),
  the recorded next step in the action band with call/text from the record's own phone, then
  **Where they are** (the PRD trail plus the recorded `stage_history` — every move with its date
  and author, oldest first), the two content cards, the conversation timeline, and the designed
  move-forward choices (disabled; the write waits). One short line names what waits on the unbuilt
  customer-records service (crm-families). The record stays at the pipeline's existing route —
  never fork a second lead route for the same person.
- Data is `lib/fixtures/agent/workspace.json` read through `lib/api-client/agent.ts`: each lead
  carries `first_contact_at` + `stage_history` (first move `new` at `first_contact_at`, last move
  the current stage at `last_contact_at`; instants render through `manilaDay`). Never invent a
  stage move, activity entry or value at render time — `tests/fixture-contract/agent.test.ts` pins
  the record, `tests/unit/lead-detail.test.tsx` pins the screen (one h1, the four questions, the
  empty states, the single honest paragraph).
- Vocabulary lives in `lib/agent/agent-view.ts` (`PIPELINE_STAGES`/`stageTrail`,
  `leadSourceLabel`, `activityKindLabel`) — extend it there, not in the view. The office number on
  the screen is read from `lib/family/contact.ts` (the one contact module), never typed. The page
  is in `tests/unit/reading-budget.test.tsx`. Evidence shots:
  `docs/08-delivery/agent-portal-design/shots/`.

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

## Platform operator surface — `/platform/*` (read before touching the platform screens)

- Three designed screens for the platform's own team, NOT the funeral product: tenant
  management (`/platform/tenants`, `/platform/tenants/[id]` — state · plan · address, one
  tenant's record, read-only), the operator door (`/platform/sign-in`, the documented entry
  point, reached by URL) and tenant sign-up (`/platform/sign-up` — a two-step flow that
  creates nothing). No tenancy/identity service or contract exists
  (`docs/02-architecture/platform-administration.md` classifies the surface), so every screen
  states what the platform must provide, and `app/(platform)/layout.tsx` carries the
  operator-surface marker wording. Never link the surface from a public/staff/family/agent
  menu (`tests/unit/platform-screens.test.tsx` fails one), and `/platform/` stays disallowed
  in `app/robots.ts` plus `noindex` in its own head.
- ONE vocabulary home: `lib/platform-admin.ts` (states active_trial / trial_expired /
  cancelled, the single free_trial plan — paid plans deferred — the requirement/deferred
  lists, the onboarding sequence, and `validateTenantSignUpDraft`, the gate the flow runs).
  The fixture is APP-AUTHORED SAMPLES: `lib/fixtures/platform/tenants.json` (every row
  `sample: true`, "Sample"/"Example" named, `.example` addresses) read by
  `lib/api-client/platform.ts`, which REFUSES an unmarked row and has no live mode. Never add
  a real business, plan or hostname — `tests/fixture-contract/platform.test.ts` fails one.
  The accessibility + reading-budget harnesses render these pages (one `h1`, labelled fields,
  short leads and list items).

## Structure conventions
```
web/
├── app/                  # Next.js App Router: routes per portal
│   ├── (staff)/staff/    # RBAC-gated portal frame + sections
│   ├── (platform)/platform/ # platform operator surface (operator-only, /platform/*)
│   ├── login/            # public sign-in (fixtures-first)
│   └── api/auth/         # BFF route handlers ONLY — session mgmt, proxying
├── lib/api-client/       # typed clients (generated from OpenAPI specs once published)
├── lib/fixtures/         # recorded contract fixtures; validated nightly vs specs
├── components/ui/        # design-system components — generic, zero domain vocabulary
├── .agents/skills/       # vendored AWS agent-toolkit skills (skills-lock.json; `.claude/skills` symlinks) — not app code, excluded from lint
└── styles/               # tokens.css is the single source of truth for visuals
```

Documentation lives in `docs/` — read [`docs/README.md`](docs/README.md) before editing anything
there: it is a **platform snapshot plus villa-only records**, so it says which files are read-only
(the frozen contracts, the client papers), which are villa-local and edited with their work, and
what triggers a refresh. The live state pages are
`docs/08-delivery/notes/demo-web-route-coverage.md` (every route's state),
[`docs/08-delivery/frontend-complete.md`](docs/08-delivery/frontend-complete.md) (the completion
record) and [`docs/08-delivery/open-items.md`](docs/08-delivery/open-items.md) (what is open with
the platform and the client).

## Accessibility & craft — the rule contract (F-16; read before touching focus, dialogs, headings, badges)

- **One focus ring, every surface.** `styles/base.css` owns the only global `:focus-visible`
  rule: `--color-focus-ring` (`sky-800`, ≥3:1 on light) + `--color-focus-ring-halo`
  (`marble-50`, visible on navy), outline-offset 2px, no `border-radius` mutation. Never
  re-add a per-surface `outline: none` / brass-only ring — `tests/unit/accessibility-craft.test.tsx`
  fails stray `--sky-500/600` focus overrides, and the old `input:focus { outline: none }`
  in `styles/components.css` was exactly what hid keyboard focus on every field.
- **One modal focus contract**: `components/ui/use-modal-focus.ts` (focus in, Tab trapped,
  Escape closes, body scroll locked, focus returns to the opener). Use it for every new
  dialog/drawer; chapel booking + stage move keep their pre-existing equivalent traps.
  The mobile menu FAB, the phone action bar's Plan-ahead sheet and the portal drawer all
  use the hook — don't re-implement Escape/scroll locally.
- **Badges and statuses carry the `-ink` tokens** (`--color-status-*-ink`), never the banner
  hues at 12 px (3.0–4.2:1 on their own wash). White-ink danger fills use
  `--color-status-danger-strong`; disabled controls are exempt from 1.4.3 and stay dimmed.
- **Headings**: exactly one `h1` per route, no skipped levels. Where a card/section is the
  next level, promote the tag and keep the ladder size (`class="text-lg"` or the
  `.card__header h2` / `.capture-section__title` rules) instead of inserting hidden headings.
  `.capture-section__title` is `h2`; `.capture-subhead` is `h3`.
- **Scrollable tables** (`div.table-wrapper`, `.pl-scroll`, `.plan-scroll`) carry
  `tabIndex={0}` so keyboard users can reach the scroll area; visually-hidden inputs need
  `base.css`'s `!important` box values or the `width:100%` form rule stretches them to the
  viewport (this broke `/staff/property`'s horizontal scroll).
- Public pages keyboard-first: `.anchored-skip` (/`components/ui/skip-link.tsx` for portals)
  is the first focusable and targets `#main`; the phone bar is a `<nav aria-label="Quick actions">`
  (axe `region`). Touch controls get 44 px min-height ≤40 rem (see the `@media (max-width: 40rem)`
  block); dense link lists rely on WCAG 2.5.8 spacing instead.
- The regression gate is `tests/unit/accessibility-craft.test.tsx` (renders the real pages:
  one h1, sequential levels, labelled fields, named buttons, name⊇visible-text, alt).
  Re-run an axe pass over the route set when touching shared chrome: the F-16 PR records
  35 public × 2 viewports + 58 staff + 14 family + 11 agent routes at zero violations.

## Printed papers — the document sheet (read before touching `components/paper/*`, `lib/export/*` or a `lib/contracts/*-paper.ts`)

- **One profile home: `lib/export/paper-profile.ts`.** Page size, margins and faces are
  MEASURED from the client's own `.docx` files staged in `docs/07-client-villa/paper-forms/`:
  service contract 8.5 × 14 Legal (margins 1/1/1.8/1 in), 2026 combined purchase form
  8.5 × 13 folio (0.5 in), 2025 standalone purchase agreement 8.5 × 14 Arial, and the two
  documents with NO archived paper (receipts, membership folio) say so in their provenance.
  Screen (`components/paper/paper-sheet.tsx`), print (the `@page` rule it injects), Word
  (`lib/export/docx.ts`) and PDF (`lib/export/pdf.ts`) all read the profile; every document
  builder returns it beside its blocks and every `PaperSheet`/`PaperExportActions` call
  passes it. Never hardcode a page size, margin or face in a paper view or renderer.
- Faces: Times New Roman (contract + receipt + application body), Arial (2025 purchase
  agreement), Bookman Old Style (the 2026 forms' letterhead — mark the block
  `typeface: "heading"`). `Times-Roman`/`Helvetica` are the metric-compatible PDF base-14
  names; Bookman Old Style embeds the vendored TeX Gyre Bonum (`public/fonts/paper/`, GUST
  Font License) because no base-14 Bookman exists. The 2025 service contract's Latin text
  resolves to Calibri (Word theme default) — the sheet prints Times, reasoning in the module
  header; changing it is that profile's `body` line.
- `tests/unit/paper-profile.test.ts` re-reads the client `.docx` files and fails on drift;
  the typography gate allows pt sizes only for the sheet's `--paper-body-pt`. Evidence and
  before/after artifacts: `docs/08-delivery/paper-layer-design/`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
