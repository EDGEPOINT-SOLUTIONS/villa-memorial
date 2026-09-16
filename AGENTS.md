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
  **3D** (the walk-in park, react-three-fiber). The 3D mode owns the whole screen: entering
  requests full screen from the switch gesture (graceful where the browser refuses) and every
  control — exit, camera, section/search/filter list, settings, details, plot tools — lives
  inside the experience, never in the page chrome. The other parks (Loyola, Golden Haven) keep
  their own images and are untouched by the 3D world.
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
- **3D internals**: scene/blockout `components/park3d/scene.tsx`, real raycast plot picking +
  instanced slabs `components/park3d/plots-3d.tsx`, vegetation instancing
  `components/park3d/vegetation.tsx`, UI/store state `lib/park-3d/view-store.ts` (zustand),
  drone flight envelope + controls `lib/park-3d/flight.ts` + `components/park3d/camera-rig.tsx`
  (pointer-lock look, Minecraft grammar: WASD relative to view, Space/Shift vertical, Space×2
  toggles free flight, Ctrl or W×2 sprints), POIs `lib/park-3d/masterplan.ts`. The developer
  overlay (`components/park3d/debug-layer.tsx`) is dev-builds-only. Pure modules have unit tests
  in `tests/unit/park-3d-*`.

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
