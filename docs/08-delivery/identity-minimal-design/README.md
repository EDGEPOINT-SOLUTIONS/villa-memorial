# Public-minimal identity pages — Lane 4 of Wave A

**Task:** `villa-public-minimal-identity-pages` · **Plan:**
`data/villa-public-design-plan/report.md` §4–7 (captain released it on the Lavish
board, 2026-09-21: _"ok implement now"_) · **Base:** `main` after PR #112 ·
**Date:** 2026-09-22

## What this PR is

Lane 4 of the four parallel Wave A lanes. It sweeps the **memorial and identity
pages** onto the frozen Phase 0 contract (`lib/public-layout.ts` + `PublicHero` /
`SectionHead` / `PublicDisclosure` / `PublicImage`):

- `/memorials` (Digital Memorial Search)
- `/memorials/find` (Find My Loved One)
- `/memorials/[id]` (the published profile, and the one uniform unavailable state)
- `/register`
- `/login` · `/client/login` · `/agent/login` (the three sign-in doors)

No new grammar was invented and no other lane's CSS block was touched. All of
this lane's new CSS lives in the `/* public: identity block */` at the tail of
`styles/components.css`; the only edits outside it are the `.mem-page`
envelope/rhythm values in the pre-existing memorial block (this lane is its only
owner).

## 1 · What changed, route by route

| route | before | after |
|---|---|---|
| `/memorials` | boxed `hero-premium` + reassurance card, a two-card rules wall, the three visibility choices, a **five-fact "things a family decides" band**, a page-local closing band — 6 stacked sections, and the shell's shared closing band under them | `PublicHero` (one ≤12-word answer), `SectionHead` for the rules, the full searchable / never-shown vocabulary **and** the family's three choices behind one `PublicDisclosure`, the search form, and one office-line foot. The shape band and the page-local closing band are gone (the shell's `NextSteps` is the one closing layer). |
| `/memorials/find` | hero + card, 4 step cards, "what to have ready", two ask cards, the visibility choices, a **separate privacy promises section**, a page-local closing band — six sections / 194 paragraph words | hero (call-first), the 4 steps as **hairline rows** (not four equal boxes), "what to have ready" behind a disclosure, a single "A family's decision, never a default" band whose creation/change cards, choices and promises sit behind one disclosure. Six sections collapse to three; the page-local closing band is gone. |
| `/memorials/[id]` (unavailable) | bespoke `mem-unavailable` panel with a lock mark, `hero-premium` title/lead, then the choices and a service note | the same uniform answer expressed in the shared grammar: `PublicHero` (title · lead · Find my loved one · Call), a `SectionHead` for the family's three choices in a disclosure, the service note. Published ids still render `MemorialProfile`, whose sub-sections now use `SectionHead`. |
| `/register` | its own `.auth-card` family — a different card grammar from every sign-in door | the shared `signin-shell--premium` / `signin-card` grammar the three doors use: one card, one commit action ("Create my account"), labelled fields, left-aligned head. The form logic and the honest demo success state are unchanged. |
| `/login` · `/client/login` · `/agent/login` | one shared card (already at the 1.0–1.2 screen target), but the head was centred on staff/agent and left-aligned in the family scope; register was a fourth grammar | one card grammar for all four doors: **left-aligned head**, a calmer blurb step, a left-aligned route note/help line, one card width. Copy is unchanged (the family headline "Sign in to see what is happening" is the approved family-portal copy and stays). |

The memorial pages render inside the reading envelope: `.mem-page` is now
`max-width: var(--layout-reading-w)` (60 rem / 960 px) with the contract's
section gap, instead of the old 76 rem. The interior hero's h1 rides the
page-title rung (`--text-page-title`, 36 px; steps down on a phone through the
one token map) rather than the home's fluid display size — the captain's "large
labels feel cheap" fix.

## 2 · The identity block

Appended at the tail of `styles/components.css`, after the Phase 0 grammar block:

```
/* public: identity block — the memorial pages and the identity doors (lane 4) */
```

It carries only: the reading-envelope hero treatment, the section-head rhythm,
the hairline step/ask rows, the office-line foot, and the sign-in head alignment.
No other lane edits it; every declaration rides a ladder/role token, so
`typography-system.test.ts` stays green.

## 3 · The re-run audit

Phone heights are full-page scroll / 844, desktop / 900, measured in Chrome at
DPR 1 on this branch (before figures are the plan's audit and the captured
`before-*` shots at `main`).

| route | phone screens before | phone screens after | desktop screens before | desktop screens after | paragraph words before → after | longest paragraph before → after |
|---|---:|---:|---:|---:|---:|---:|
| `/memorials` | 6.2 | **3.78** | 2.9 | 2.08 | 68 → 63 | 16 → 22 |
| `/memorials/find` | 6.9 | **3.79** | 3.5 | 2.17 | 194 → 164 | 19 → 18 |
| `/memorials/[id]` (unavailable) | 3.8 | **3.13** | 1.7 | 1.58 | 43 → 49 | 18 → 18 |
| `/register` | 1.0–1.2 (family scale) | **1.07** | 1.0 | 1.0 | — | — |
| `/login` | 1.0 | **1.00** | 1.0 | 1.0 | — | — |
| `/client/login` | 1.2 | **1.20** | 1.0 | 1.0 | — | — |
| `/agent/login` | 1.0 | **1.00** | 1.0 | 1.0 | — | — |

- **Memorials family ceiling** (`lib/public-layout.ts`): ≤4 phone / ≤3.5 desktop
  — all three routes now inside (only `/memorials/find` was over before, at 6.9).
- **Paragraph words** include the copy inside closed disclosures (the metric is
  conservative: the drawn page is lighter still). Longest paragraph stays ≤30,
  longest list item ≤14, and every opening sentence stays ≤12 words on every
  route — the reading-budget guard enforces all three.
- **Max image height:** `—` on all seven routes — the demo store publishes no
  memorial, so the default/search/unavailable pages render **no `<img>`**, and
  the identity doors carry no photograph. The published profile's portrait is
  proven by `tests/unit/memorials-pages.test.tsx` with a test-only record, never
  by fixture data.

## 4 · Guards

| guard | role in this PR |
|---|---|
| `tests/unit/reading-budget.test.tsx` | the three memorial routes' opening-lead selector moves to `public-hero__lead`; all budgets stay green |
| `tests/unit/public-page-budget.test.tsx` | **extended** with the three memorial routes (section order, one `h1`, the shared primitives) |
| `tests/unit/memorials-pages.test.tsx` · `memorials-published-page.test.tsx` | unchanged and green: the uniform unavailable answer, the rules-before-form order, the published profile, no fabricated person |
| `tests/unit/typography-system.test.ts` · `public-layout.test.ts` · `public-cta-contract.test.tsx` · `public-image-rules.test.tsx` · `accessibility-craft.test.tsx` · `demo-quick-fill.test.tsx` | unchanged and green |

`npm run lint && npm run typecheck && npm test` (206 files / 2,417 tests) and
`npm run build` all pass.

## 5 · Evidence

Full-page screenshots at 1440×900 and 390×844 for **every** route in scope, in
`shots/`:

- `before-*` — the captured state at `main` (the previous worker's pass).
- `after-memorials-{390x844,1440x900}.jpeg`
- `after-memorials-find-{390x844,1440x900}.jpeg`
- `after-memorials-unavailable-{390x844,1440x900}.jpeg`
- `after-register-{390x844,1440x900}.jpeg`
- `after-login-{390x844,1440x900}.jpeg`
- `after-client-login-{390x844,1440x900}.jpeg`
- `after-agent-login-{390x844,1440x900}.jpeg`

## 6 · Honest limits

- No content, price, privacy rule or honesty state changed. The digital-memorial
  service still does not exist, so the fixture publishes no one and the pages
  still say so; the office number is still read from the landing document.
- The memorial **published profile** has no live demo record to screenshot (the
  store publishes nobody by design) — its rendering is covered by the page tests,
  as before.
- The shared footer/`NextSteps` chrome is out of this lane's scope and untouched;
  it is why the phone ceilings still carry ~1.6 screens of footer.
