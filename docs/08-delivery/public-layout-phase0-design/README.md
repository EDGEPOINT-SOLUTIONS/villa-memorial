# Public layout — Phase 0, the consistency contract

**Task:** `villa-public-layout-phase0` · **Plan:** `data/villa-public-design-plan/report.md`
(captain released it on the Lavish board, 2026-09-21: _"ok implement now"_) ·
**Base:** `main` after PR #110 (`fm/villa-hero-flexible`) · **Date:** 2026-09-22

## What this PR is

Phase 0 is the **contract the four rollout lanes build on** — not a page sweep.
It freezes the numbers and ships the four primitives, then converts the **home
hero as the proof surface**. The four lanes (`villa-public-minimal-story-pages`,
`…-catalogue-pages`, `…-plan-pages`, `…-identity-pages`) each append their OWN
named block to `styles/components.css` and never edit this one.

## 1 · The contract — `lib/public-layout.ts`

One module owns every number; the primitives consume it and the guard suites tie
it back to the CSS declaration that implements it.

| group | what it pins |
|---|---|
| **envelopes** | folio 99 rem (home trio + nav) · **catalogue 75 rem (1,200 px)** · **reading 60 rem (960 px)** · prose `66ch` (tokens `--layout-catalogue-w` / `--layout-reading-w` / `--measure-prose`) |
| **hero / image ceilings** | phone hero **42 vh**; home photo 26 rem · interior banner 18 rem · band lead 22/14 rem · card 4:3 ≤16 rem · PDP main 26/14 rem · gallery tile 16 rem · map 1:1 ≤32 rem |
| **CTA rungs** | commit **sky** (`btn--primary`, ≤1 per band, ≤1 above the fold) · item **gold** (`btn--accent`, one per row) · support outline (`btn--secondary`) |
| **grid** | 4 across desktop (16.5 rem floor fits 4 × 288 px + 3 × 24 px gaps in the 1,152 px content box), 1 per phone row · gap 24/32 px · render 12 then **“Show all N”** |
| **section rhythm** | gap `clamp(2rem, 4vw, 3.5rem)`; a non-grid section over 40 rem is split/disclosed |
| **page ceilings** | per family, phone/desktop screens (home ≤5 / ≤4.5, catalogue ≤6 / ≤5, …) |
| **reading budget** | 300 paragraph words/page · 30 longest paragraph · 30 list item · 12 opening sentence (mirrors `reading-budget.test.tsx`) |

## 2 · The primitives — `components/public/*` (re-exported from `components/kit`)

| primitive | owns |
|---|---|
| `PublicHero` (variants `home` · `interior` · `call-first`) | the one hero band, including the folded `villa-hero-flexible` base: **image-only** renders the RAW photo (no wash/scrim/gradient), **100 % transparency** is the clear photograph, the author's **text colour** paints `--hero-text-colour`, landscape-only, phone-capped at 42 vh |
| `SectionHead` | `kicker · heading · one lead · one action`; the section-title role step |
| `PublicDisclosure` | the native `<details>` “Show all N” control (CSS caret, no glyph) |
| `PublicImage` | role → ratio + ceiling; **required `width`/`height`**; lazy unless lead; `sizes` whenever `srcSet` |

## 3 · The home proof surface

- `HeroSection` → `PublicHero variant="home"` (hero-flexible base inherited).
- The hero's page-commitment action moved from gold to the **sky commit rung**
  (settles D8 on the proof surface; `/lots`' captain-approved card=gold /
  panel=sky pattern is the generalized rule).
- `AboutSection` → `SectionHead` + `PublicDisclosure` (“Mission and vision” keeps
  the words available, out of the way — captain call 5).
- The left rail's **24/7 assistance card was removed** (captain 2026-09-21,
  correcting the earlier “compact it” note: _“i want to remove this section about
  the left rail”_). The markup, `.rail-call*` styles, the `rail-pulse` keyframe
  and the hero-colour sync that existed only for it are gone. The number stays
  reachable in the header call chip, the footer and `/immediate-assistance` — no
  replacement was added.

### Measured, home (Chrome, DPR 1)

| measure | before | after |
|---|---:|---:|
| phone hero height (390×844) | **599 px (71 % of first screen)** | **331 px (39 %; max-height 42 vh declared)** |
| phone page scroll | 7,501 px (8.89 screens) | 7,107 px (8.42) |
| desktop page scroll | 5,031 px (5.59 screens) | 4,997 px (5.55) |
| left rail card | present, 161 px | **absent** |
| left rail height / scroll | 570 / 570 px | 570 / **570 px (no scrollbar)** |

The home's own family ceiling (≤5 phone / ≤4.5 desktop) is still above today's
numbers — closing it is the lanes' work; Phase 0 fixes the hero and proves the
grammar.

## 4 · Guards

| guard | new / extended | fails when |
|---|---|---|
| `tests/unit/public-layout.test.ts` | **new** | any contract number drifts from its token or CSS declaration |
| `tests/unit/public-image-rules.test.tsx` | **new** | a frame loses its ratio/ceiling, a picture loses its size, `srcSet` without `sizes`, an img-level ratio |
| `tests/unit/public-cta-contract.test.tsx` | **new** | a page-level band paints its commitment gold, or adds a second commit |
| `tests/unit/public-page-budget.test.tsx` | **new** | the home adds an undeclared section, loses a primitive, or leaves one `h1` |
| `tests/unit/phone-layout.test.tsx` | **extended** | the phone hero 42 vh cap or the catalogue envelope/grid declaration is dropped |
| `tests/unit/landing-view.test.tsx` | **updated** | the rail card returns, or the hero text colour leaves the DOM |

`npm run lint && npm run typecheck && npm test && npm run build` all green
(the order-store concurrency case is a pre-existing timing flake under a fully
parallel suite and passes in isolation).

## 5 · Evidence

- `shots/before-home-1440.jpeg` · `before-home-390.jpeg` — `home-1440/390` from
  the plan's audit at `main @ 0b389e4` (the before this PR).
- `shots/after-home-1440.jpeg` · `after-home-390.jpeg` — the transformed home at
  1440×900 and 390×844.
- `shots/after-rail-1440.jpeg` — the left rail at 1440 after removal (the card
  is gone; the rail is 570 px and does not scroll). At 390 the rails collapse
  into the MobileQuickMenu, so there is no rail to show.

## 6 · What the lanes inherit

Append a named block to `styles/components.css` (`/* public: catalogue block */`,
…), never edit the Phase 0 block; render `PublicHero` / `SectionHead` /
`PublicDisclosure` / `PublicImage`; add the route to `public-page-budget.test.tsx`
and `reading-budget.test.tsx` in the PR that sweeps it.
