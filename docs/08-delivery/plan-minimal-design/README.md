# Plan, purchase & checkout pages — the Lane 3 minimal pass

Phase 0 (`lib/public-layout.ts` + the four `components/public/*` primitives) is
merged. This lane sweeps the **plan, purchase and checkout** family onto that
contract:

`/plans` · the package details (`/plans/PKG-BASIC|STANDARD|PREMIUM` and every
other `/plans/[sku]` item) · `/price-list` · `/builder` · `/cart` · `/checkout`
· `/quote` · `/appointments` · `/orders/[number]`. `/packages` is a
`next.config.ts` redirect to `/plans/PKG-BASIC`, so it has no page of its own.

Authority: `data/villa-public-design-plan/report.md` §4–7 (captain released
2026-09-21). No new grammar was invented; the pages render `PublicHero` /
`SectionHead` / `PublicDisclosure`, consume the contract tokens, and the lane's
own CSS lives only in the `/* public: plan block */` appended to
`styles/components.css`.

## What changed, per page

- **`/price-list`** — the 14.4-phone-screen wall is now the blueprint: the shared
  interior `PublicHero`, one `SectionHead` per band, the "Branches & affiliated
  locations" list compressed to one wrapping row (`plan-branch-row`), and the
  four long reference sets (casket tiers, senior eligibility + schedule, package
  inclusions/conditions/schedule, the lot & mausoleum tables) behind
  `PublicDisclosure`. The detail stays in the DOM — disclosed, never dropped.
- **`/plans`** — the bespoke `hero-premium` block became the shared interior
  `PublicHero`; the tier band gained a `SectionHead`. The captain-mandated five
  tier cards (one comparison row, printed inclusion checklists) are untouched.
  A phone-only padding/list compaction tightens each card one step.
- **Package details (`/plans/[sku]`, the package branch)** — the approved
  `villa-home-ui/package.html` prototype is kept: crumbs · title/lead/tagline ·
  chips · VILLA MEMORIAL PLAN statement · buy-card rail. The three long
  reference blocks (package inclusions + conditions, the Official 2026 price
  list, the client's source sheets) now sit behind `PublicDisclosure`, which
  took the phone page from 9.7 screens to 5.1.
- **`/builder`** — the shared interior `PublicHero`. The seven-question
  configurator body is interactive and unchanged (see "Honest deviations").
- **`/quote`, `/appointments`** — wrapped in the reading envelope
  (`plan-flow--reading`). The form shell, fields and one commit are unchanged;
  they already matched blueprint §5.6.
- **`/cart`, `/checkout`, `/orders/[number]`** — already inside the blueprint
  (title · lines/form · one commit · honest note) and already under their
  ceilings; left byte-identical.

## The audit (390×844 phone / 1440×900 desktop)

Full-page scroll heights measured with the same harness for before and after
(`/tmp/audit.sh`; screens = scrollHeight ÷ viewport height).

| route | phone screens before → after | desktop before → after | longest para before → after | max image h before → after (phone) |
|---|---:|---:|---:|---:|
| `/plans` | 7.10 → **6.31** | 2.43 → 2.21 | 30 → 30 | 177 → 34 |
| `/plans/PKG-BASIC` | 9.70 → **5.11** | 4.62 → 2.44 | 51 → **30** | 227 → 227 |
| `/plans/PKG-STANDARD` | 9.70 → **5.11** | 4.62 → 2.44 | 51 → **30** | 227 → 227 |
| `/plans/PKG-PREMIUM` | 9.70 → **5.11** | 4.62 → 2.44 | 51 → **30** | 227 → 227 |
| `/price-list` | 14.62 → **5.42** | 7.42 → 2.85 | 40 → **30** | 255 → 42 |
| `/builder` | 8.94 → 8.85 | 4.38 → 4.29 | 30 → 30 | 34 → 34 |
| `/cart` | 2.73 → 2.73 | 1.35 → 1.35 | 30 → 30 | 34 → 34 |
| `/checkout` | 2.82 → 2.82 | 1.43 → 1.43 | 30 → 30 | 34 → 34 |
| `/quote` | 3.86 → 3.86 | 2.14 → 2.14 | 30 → 30 | 34 → 34 |
| `/appointments` | 3.96 → 3.96 | 2.09 → 2.09 | 30 → 30 | 34 → 34 |
| `/orders/[number]` | 3.30 → 3.30 | 1.59 → 1.59 | 30 → 30 | 34 → 34 |

Targets from `PAGE_HEIGHT_CEILINGS`: plans ≤4/3 · package PDP ≤6/5 ·
priceList ≤6/5 · purchase ≤3.5/3. The package detail and `/price-list` now meet
their ceilings. All images are inside the contract's role ceilings (the 42 px
max is a logo row; the 227 px package promo is a natural-width upload).

## Honest deviations

- **`/plans` sits at 6.3 phone screens, over the ≤4 target.** The page is the
  captain's own 2026-09-21 mandate — five tier cards in one comparison row with
  the inclusion checklists **printed, never disclosed** (`plans-page-content`
  and `plans-tiers-layout` both pin it, and `plans-page-content` fails any
  `<details>` on the page). On a phone the five stacks necessarily run long; the
  card grammar is the captain's call, so the target loses to the pinned design.
- **`/builder` stays at ~8.9 phone screens.** The plan gives no blueprint for the
  configurator and its seven questions are a working form whose running total is
  the point. Collapsing them behind disclosures would change the interaction the
  PRD's step flow needs, so the lane only moved its hero onto the shared
  grammar and left the body. This is recorded here rather than silently claimed.
- **`/quote` and `/appointments` stay at 3.9 screens** (target ≤3.5). They are
  `public-forms-render`-pinned capture shells whose fields are the deliverable;
  the lane put them on the reading envelope but did not cut form fields.
- **The package page's paragraph total** (≈327 page-only) is dominated by the
  client's transcribed package-inclusion details that the approved prototype
  prints verbatim in the five feature columns; the app-authored prose that was
  over budget (the 51-word buy-card note, the 40-word price-list source note)
  was split. The package page is deliberately NOT added to
  `tests/unit/reading-budget.test.tsx` for that reason — the guard's "move facts
  into a table/list" remedy would mean rewriting client copy.

## Guards

- Extended `tests/unit/public-page-budget.test.tsx` with the lane's blueprints
  (section order + the shared primitives): `/plans`, `/price-list`, `/builder`,
  the package detail.
- Added `/price-list` and updated the `/plans` + `/builder` opening-lead
  selectors in `tests/unit/reading-budget.test.tsx` (the heroes are now the
  shared `public-hero__lead`).
- Updated the two lead selectors that named the retired `sb-hero__lead`
  (`service-builder-page.test.tsx`).
- `public-layout`, `public-image-rules`, `public-cta-contract`, `phone-layout`,
  `typography-system`, `broken-pages`, `composition-pass` stay green unchanged.

## Evidence

`shots/` holds full-page before/after WebP images at 390×844 and 1440×900 for
all eleven routes (44 images). `before-*` were captured from the pre-lane
baseline (`git stash` of this branch's changes); `after-*` from the branch.

## Files

- `app/(public)/price-list/page.tsx`, `app/(public)/plans/page.tsx`,
  `app/(public)/plans/[sku]/page.tsx`,
  `app/(public)/plans/[sku]/plan-term-selector.tsx`,
  `app/(public)/plans/[sku]/price-list-2026-module.tsx`,
  `app/(public)/builder/page.tsx`, `app/(public)/quote/page.tsx`,
  `app/(public)/appointments/page.tsx`
- `styles/components.css` — the `/* public: plan block */` block only
- the four test files above
