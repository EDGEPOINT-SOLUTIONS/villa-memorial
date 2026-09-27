# AGENTS.md — `web` (React/Next.js + TypeScript, all portals + BFF)

> Gab-owned with agent assistance; Keb reviews every PR. Adapted from the exemplar
> (`docs/08-delivery/exemplars/web-AGENTS.md`) at scaffold time; extends the template's
> frontend adaptation (`docs/02-architecture/service-template.md` §"Frontend adaptation").

## Purpose
Single frontend codebase serving all portals (staff · customer · agent) plus the BFF layer.
Per ADR-004 the Next.js server side IS the BFF: fetch · aggregate · reshape · session-manage.
Screens are built **fixtures-first** against recorded contract fixtures so UI work never waits
on backend services.

## Instruction map — where the rest of the rules live

This file carries what applies to almost every session. The per-surface detail lives in
nested `AGENTS.md` files, which a harness loads only once a session touches a file in that
directory — they are not loaded up front, and they are not `@` imports (a harness that does
not interpret `@path` imports reads this text literally).

| Nested file | Covers |
|---|---|
| [`app/(public)/AGENTS.md`](app/(public)/AGENTS.md) | Landing page and its content model · public services and casket catalogue · gallery · digital memorial · facilities · reach-us forms · `/plans/[sku]` · `/builder` · `/map` · `/immediate-assistance` · storefront imagery · public SEO surface |
| [`app/(staff)/AGENTS.md`](app/(staff)/AGENTS.md) | Content catalogue (page documents) · billing and provisional receipts · orders admin · catalog admin · cases, ops board, preparation, lot records, guarantee instruments · chapel administration · commission · copilot · admin platform and data screens |
| [`app/(agent)/AGENTS.md`](app/(agent)/AGENTS.md) | Agent lots map · agent lead record |
| [`app/(family)/AGENTS.md`](app/(family)/AGENTS.md) | Family portal |
| [`app/(platform)/AGENTS.md`](app/(platform)/AGENTS.md) | Platform operator surface |
| [`infra/AGENTS.md`](infra/AGENTS.md) | AWS deployment, shape A |

If a rule you need is not here, read the nested file for the directory you are working in.
Never copy a nested rule back into this file — the budget below is why.

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
- **Typing a font or an off-ladder size.** The product owns **one** face — Inter, SIL OFL 1.1,
  self-hosted under `public/fonts/inter/` and declared in `styles/fonts.css` (imported first in
  `app/globals.css`); `--font-serif` and `--font-sans` both resolve to it (hierarchy comes from
  weight + the role steps, not a second typeface). Every readable text size is one of the seven
  ladder steps in `styles/tokens.css` (12px hard floor; the public hero is the one fluid
  `--text-display`, except the home, which scopes the display roles down inside `.anchored-page`
  — hero 36px, section heads 22px, card titles/prices 18px — per the 2026-09-25 storefront pass)
  chosen through the **role→step map** there (`--text-hero` · `--text-page-title`
  · `--text-section-title` · `--text-card-title` · `--text-body` · `--text-ui` · `--text-caption`
  · `--text-micro`; the display roles step down one rung below 48rem through the same aliases).
  A role class must not ride a raw rung: consume the alias. Text ink is pure black (`--color-text-primary` /
  `--color-figure`) with neutral-grey support roles (`--color-text-secondary` #333 / `--color-text-muted`
  #595959) — no text colour carries the `--navy-*` tint, which stays a surface/border/background ladder
  (captain, 2026-09-21) — and decorative gold never carries text. The paper/legal print layer is
  NOT Inter — it keeps the client's own faces (`lib/export/paper-profile.ts`).
  `tests/unit/typography-system.test.ts` fails a raw/off-ladder size, a sub-12px value, a second
  typeface, a gold-as-text rule, or a mapped role class moved off its step;
  `tests/unit/park-map-labels.test.ts` pins the map's per-plot label density rule (a label paints
  only once its plot is wide enough — see the park-map section). **The face carries
  no emoji**, so a published one is not an emoji but a missing glyph — an empty box on the page,
  which the home's newsfeed lead caption shipped (U+1F33F). `unrenderableGlyphs()` in
  `lib/api-client/landing.ts` is the one rule and the content publish gate refuses them by name.
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
  ≤40rem radius cap), and the `/price-list` hero printed 560px logos because
  `.plan-logo-row`'s rule had been deleted while the page kept the class (`.text-xs`, `.stack-2`,
  `.sr-only`, `nowrap`, `.table__name/__sub` were the same "referenced, never defined" bug).
  Read `docs/08-delivery/visual-regression-2/README.md` before touching a public phone layout;
  `tests/unit/phone-layout.test.tsx` gates the class (phone re-layout for the rate table, capsule
  caps, pan containers' `overflow-x`, and the closed utility vocabulary — add the rule in the
  same commit as the class, and `grep "^\\.<class> {"` first).
- **Never run `npm run build` while `npm run dev` is live.** They share `.next`, and the production
  build rewrites the dev server's chunks underneath it: the build dies with
  `Cannot find module './<n>.js'` from `.next/server/webpack-runtime.js`, and the dev server then
  answers **500 on every route** until it is restarted — deleting `.next` does not heal the
  running process. Stop the dev server first, or run the gate from a separate checkout (a
  `git worktree` of the commit with a junction to `node_modules` builds without touching :4000).

## Component kit — the settled patterns (read before building any new screen)

- **`components/kit/` is the one home for the repeated layouts.** `DataTable` (admin tables:
  header, sortable columns, status chips, empty state, self-panning), `ResultsGrid` +
  `ProductCard` (the card grid and the photograph-first product card), `ListingShell` +
  `RefinePanel` (the storefront listing frame: sticky rail, results/sort bar, phone sheet, and
  the Amazon-familiar refine controls) with `ListingNav` for a browse rail, `FilterRail` (an
  admin result list's sticky grouped filter panel), `StatCard` (a KPI figure), `StatusChip` and
  `EmptyState`. The kit's own `README.md` carries the rules it
  encodes (tokens only; figures/labels/status lead; every list has an empty AND a no-match
  state; photographs lead; honest data only) and its adoption status.
- **New screens render the kit; they do not invent a layout.** A table, chip, KPI tile or empty
  state copied into a page is the defect this kit exists to stop. If a screen truly needs a
  shape the kit lacks, add it to `components/kit/` (small, typed, tested, honesty rule in the
  file header) so the next screen inherits it. Domain vocabulary stays in the feature module;
  the kit stays generic.
- **Migration is markup-for-markup, no restyle.** The kit emits the existing
  `styles/components.css` classes (`.table`/`.table-wrapper`, `.badge`, `.empty-state`,
  `.kpi-card`, `.shop-card`/`.shop-grid`); a migration that changes how a page looks is a bug.
  Migrated: `/staff/inventory`, `/staff/accounting`, `/staff/notifications`, `/staff/workflows`,
  `/staff/settings`, `/staff/users`, and the public storefront card grids `/lots`, `/plans`,
  `/price-list`, `/products` (2026-09-21). The `components/villa/shop-card.tsx` duplicate is gone —
  kit `ProductCard` owns that grammar exactly (status under the figure, plus the casket `senior`
  line); `ResultsGrid.label` is optional so a grid inside a labelled band adds no `aria-label`.
  `FilterRail` stays for admin result lists; the captain promoted the `/lots` Amazon rail into
  the kit on 2026-09-25 as `ListingShell` + `RefinePanel` (now rendered by `/lots`,
  `/products` and `/gallery`), with `ListingNav` for a browse rail (`/price-list`). The
  byte-identical DOM delta and the 1440/390 evidence for the 2026-09-21 adoption are in
  `docs/08-delivery/component-kit-public-adoption-design/`; the 2026-09-25 listing grammar
  record is `docs/08-delivery/storefront-listing-design/`. Kit CSS lives in the
  "Component kit" blocks of `styles/components.css` so the typography gate scans it.

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
  a border and a shadow applied to every tile. The home's "Memorial plans & garden lots" band is
  the deliberate exception: it is a kit `ResultsGrid` + `ProductCard` card grid (`plan-lot-grid`,
  three across at 1440), because the captain asked for equal cards there — do not force the ledger
  grammar on it.
  Evidence + measured before/after (gradients, shadows, page heights):
  `docs/08-delivery/composition-pass-design/README.md`.
- **One class, one declaration.** Before adding a rule, `grep "^\.<class> {"` the file — the
  same trap AGENTS.md records for `.chapel-month` vs `.chapel-grid`, and the one that hit
  `.tier-row` (the package page's tier × term segmented control is the older owner; `/products`'
  tier ledger row had re-used the name and inherited `repeat(5, …)` plus its box chrome — it is
  `.tier-ledger__*` now). Six classes are still declared twice at top level; `tests/unit/
  broken-pages.test.ts` walks them and fails a collision that re-templates another component
  (the retired home services band was that same collision: a dead `.svc-grid`/`.svc-card*` block
  re-templated a later same-name block).
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
  one picture; the catalogue now publishes it once, captioned as a sample, and lists the collection's models as
  priced rows. `/plans` carries 42 catalogue items and **no** item image — it is a price index.
- **A tile is never a page's picture — not even in a card.** The craft pass (2026-09-18) found
  the last two surfaces still printing the marketing tiles: `/lots/[id]` (cropped to the tile's
  logo corner) and `/lots/price-list-2026` (tile title + logo above a caption that repeats it).
  `VILLA_SECTION_PHOTOS` now maps sections to `PARK_PLACE_BY_TYPE` derivatives (section D
  included), and a photograph card sets its own box with `.media-block--photo` (4:3,
  `object-fit: cover`) so a row of photographs keeps one baseline. A detail page that shows the
  whole picture uses `.media-block--natural` — an unsized `<img>` inside the plain 16:10
  `.media-block` is the bug this records.

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

## Eye-friendly public surfaces — the minimalist grammar (captain, 2026-09-21)

- **The home is the reference pattern; the captain's `public/media/frontend-home.png`
  guides proportion and rhythm only.** The settled grammar (evidence + measured
  before/after: `docs/08-delivery/eye-friendly-sizing-design/`): a hero of one
  display headline + one ≤12-word lead + one primary action; `kicker · heading ·
  one-line intro` per section; the live figure leads its band (`from ₱X`) with the
  words as one supporting line; detail behind progressive disclosure; and the same
  public word budget as the reading-budget guard. Follow-ups carry this grammar to
  the rest of the public site; do not invent a second visual language.
- **The middle column is ONE sheet, sections are hairlines.** `.anchored-mid__inner`
  is the raised sheet; `.mid-section` is transparent with a top hairline (no box,
  no shadow, no per-section radius). Keep the section classes (`about-grid`,
  `plan-lot-grid`, `plan-board`, `mid-section--map`, `blog-feed`) and their
  order — `tests/unit/landing-view.test.tsx` + `composition-pass.test.tsx` pin them.
- **Imagery is right-sized, never upscaled.** A gallery/figure is bounded to its
  sensible column (the PDP `.pdp-layout` caps the media at 40rem / 64.5rem total)
  and every `sizes` hint must match the real box — an underestimated hint makes the
  browser stretch the next-smaller derivative (`CasketCard`, `.gal-feature` were
  both fixed this way). Run the audit before/after: resolve each page's
  `currentSrc` file width and confirm it is ≥ the rendered width.
- **Hero type is a treatment, not a second face.** Inter stays the product's one
  face (`styles/tokens.css`); the home hero uses a lighter display weight, tight
  leading and `text-wrap: balance` at `--text-hero` (which steps down one rung on
  a phone through the token map). Introducing an actual second face means updating
  `tests/unit/typography-system.test.ts` in the same PR.

## The public layout contract — Phase 0 (read before touching any public hero, section, image or grid)

- **`lib/public-layout.ts` is the ONE home for the public grammar's numbers** — the
  contract the four lanes of `data/villa-public-design-plan/report.md` build on
  (captain released the plan 2026-09-21). It carries the **three envelopes** (folio
  99 rem · **catalogue 75 rem** · **reading 60 rem** + `66ch`; tokens
  `--layout-catalogue-w` / `--layout-reading-w` / `--measure-prose`), the image/hero
  **ceilings** (phone hero **42 vh**; card 4:3, band lead 3:2, PDP 4:3, map 1:1, …),
  the **3-rung CTA grammar** (sky page-commitment `btn--primary` · gold per-item
  `btn--accent` · outline `btn--secondary`), the **4-across grid** with **"Show all
  N"** (render 12, then disclose), the section rhythm and the per-page height
  ceilings. `tests/unit/public-layout.test.ts` parses the stylesheets and fails on
  drift; the guards `public-image-rules` / `public-cta-contract` / `public-page-budget`
  extend the same contract. Never type a number the contract already carries.
- **The four primitives live in `components/public/*` and are re-exported from
  `components/kit`**: `PublicHero` (`home` / `interior` / `call-first`; carries the
  hero-flexible base — image-only raw photo, 100 % = the clear photo, author text
  colour via `--hero-text-colour`), `SectionHead`, `PublicDisclosure`,
  `PublicImage` (role ratio+ceiling, required `width`/`height`, `sizes` whenever
  `srcSet`). New public screens render these instead of a bespoke head/card/`<img>`;
  the home is the Phase 0 proof surface.
- **The shared grammar block is the tail of `styles/components.css`** (marked
  "public layout grammar — Phase 0"). Phase 0 owns it; each rollout lane appends its
  OWN named block and never edits it. Design record + before/after shots:
  `docs/08-delivery/public-layout-phase0-design/`.
- **Lane 3 (plan, purchase & checkout) owns the `/* public: plan block */`** — the
  tail of `styles/components.css` after the Phase 0 block. It carries
  `.plan-flow` / `.plan-flow--reading` (the catalogue/reading envelope as a
  page wrapper, so a page inside the shelled `.container` does not double-pad),
  `.plan-branch-row` and the phone `.plan-tier` compaction. `/plans`,
  `/plans/[sku]` (package branch), `/price-list` and `/builder` now render
  `PublicHero` / `SectionHead` / `PublicDisclosure`; `/price-list`'s four
  reference sets and the package page's inclusions/price-list/source-sheet
  blocks are disclosed. `/plans` stays >its ceiling because the captain's five
  printed card checklists are pinned (`plans-page-content` fails any `<details>`
  there) and `/builder`'s seven-question body is unchanged (no blueprint).
  Record + table: `docs/08-delivery/plan-minimal-design/`.
- **The left rail's help card is `.rail-assist`** (captain: removed the
  2026-09-21 `rail-call` card, then reinstated an always-reachable help card in
  the 2026-09-25 storefront pass). It reads the staff-editable number from the
  landing document; the number also stays reachable in the footer, `/contact`,
  `/immediate-assistance` and the phone action bar's "Call 24/7". `.rail-call*`
  and the `rail-pulse` keyframe stay retired (`landing-view.test.tsx` fails
  their return).
- **Wave A lane 1 (story · service · support) rebuilt eight routes on this grammar**
  (`/services` + the three guides, `/facilities`, `/immediate-assistance`, `/faq`,
  `/contact`). Its two shared page shapes live in `components/villa/story-ui.tsx`
  (`StoryHelpBand` · `StorySteps`); everything else is the Phase 0 primitives. The
  lane's CSS is the appended `/* public: story block */` at the tail of
  `styles/components.css` — other lanes must not edit it and new story shapes belong
  inside it. Per-route blueprint, measured before/after (phone/desktop screens, prose
  budget, image caps) and the phone-height open item (the shared masthead/footer/closing
  band dominates the budget) live in `docs/08-delivery/story-minimal-design/README.md`;
  the pinned guards are `tests/unit/{villa-services-premium,facilities-page,faq-page,
  immediate-assistance,service-entry-page,reading-budget}`.

## 2026 price list — where every client figure surfaces

- **One transcription home per figure: the pricing store for plan rates + lot prices,
  `lib/villa-pricing.ts` for the rest.** The plan tables and lot families are the editable
  document described in the next section; coffins, inclusions, a-la-carte and chapel rates
  stay in `lib/villa-pricing.ts`. `tests/unit/villa-pricing.test.ts` pins every figure
  (store seed included), and `tests/unit/price-surfacing.test.tsx` renders the real pages:
  the plan/product/lot surfaces publish each figure, while the funeral-service surfaces
  (`/services`, `/facilities`) publish NO figure (Request-for-Quote). Never author or
  restate an amount in a view.
- Sheet → page map (the product/plan/lot surfaces render the sheets; the service surfaces quote):
  `/products` = casket catalogue (`CASKET_MODELS` — SRP, senior SRP, discount,
  discounted price, grouped by collection) + per-family inclusions
  (`CASKET_INCLUSIONS`) via `components/villa/casket-catalogue.tsx`;
  `/services` = the five a-la-carte fees + embalming per day + chapel use, rendered as a
  Request-for-Quote list (NO amount and NO cart action — captain's minutes 2026-09-21
  item 5; the sheet figures stay in `lib/villa-pricing.ts` as the office's quotation
  source), via `components/villa/service-rates-2026.tsx`; `/facilities` shows the two
  rooms with sample photographs and a quote action, not the per-day rate;
  `/price-list` = the five tiers ×
  four terms, regular + senior (moved off /plans), through ONE renderer
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
- Every sellable product/plan/lot line pairs the same two actions:
  `components/villa/catalogue-actions.tsx` (Add to cart with the row's exact catalogue
  SKU/price + the prefilled Request order); the funeral-service lines are
  Request-for-Quote only (no cart action). Lots are never cart items — `components/villa/price-list-2026.tsx` gives each row
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
  static consumers/tests — never render those on a public page. Public pages (`/plans`,
  `/price-list`, `/plans/[sku]`, `/lots/price-list-2026`, the home board, the package page, the agent lot list) read
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

**Budget.** This file is loaded as workspace instructions under a **65,536-byte** budget, and a
broader file that exceeds it is dropped **whole** rather than truncated — before the 2026-09-26
split this file was 153 KB and was silently omitted, so the rules reached no agent at all while
the nested files below still loaded. Keep this file well under the budget: per-surface detail
belongs in the nested files listed under [Instruction map](#instruction-map--where-the-rest-of-the-rules-live),
never back here. Adding a nested file is the correct move when a section only applies to the
directory it governs.

**Overlays.** `AGENTS.local.md` and `CLAUDE.local.md` are machine-local overlay candidates that a
harness loads after the base files (both gitignored) — use them for per-machine notes instead of
editing this file.
