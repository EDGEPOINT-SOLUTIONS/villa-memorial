# Gateway copy — implementation record (2026-10-02)

**Brief (the captain, 2026-10-02):** *"change this to a more appropriate title  Someone has died.
Call us / we will carry it from here. — right now it just dont feel empathetic, it just feel like a
corporate clown who is greedy with money"* — on the home page's opening band, the immediate-need
gateway a family reads in the worst week of their life.

The band must lead with empathy and keep the any-hour promise, without the blunt death statement
and without the "call us / we carry it" transaction. This is a **copy change only** — no type,
sizing or layout change.

## The replacement

`lib/fixtures/landing/content.json` → `content.home.gateway` (the one editable home document; the
page renders it, the staff editor edits it):

| field | before | after |
|---|---|---|
| `headline` | `Someone has died. Call us` | `When you lose someone you love` |
| `promise` | `we will carry it from here.` | `we are here for you, day or night.` |

Unchanged: the lead (`A coordinator answers any hour, day or night. We come to you, and we stay
with you until the burial is done.`), the place line, the three trust facts, and both actions.

`.home-gateway__promise` is `display: block`, so the promise keeps its own line under the headline:
the band reads *"When you lose someone you love"* / *"we are here for you, day or night."*

## The browser-tab title

`app/(public)/page.tsx` `metadata`:

| before | after |
|---|---|
| `Villa Funeraria — someone has died? Call us. We come to you.` | `Villa Funeraria — when you lose someone you love, we are here for you` |

## No test pinned the old copy

Repo-wide grep for the old strings is clean after the edit; the full suite passes unchanged. The
home's copy is staff-editable landing content and is measured here, never gated
(`AGENTS.md` → "Public page copy — the reading budget").

## Evidence — the band at 1440 and 390

| shot | file |
|---|---|
| 1440 before | [`before-1440.png`](before-1440.png) |
| 1440 after | [`after-1440.png`](after-1440.png) |
| 390 before | [`before-390.png`](before-390.png) |
| 390 after | [`after-390.png`](after-390.png) |

Measured band height (`document.querySelector('.home-gateway').getBoundingClientRect().height`),
production build on :4310 / dev on :4210:

| viewport | before | after | delta |
|---|---|---|---|
| 1440 | 565.0 px | 736.2 px | +171.1 px |
| 390  | 441.7 px | 499.0 px | +57.3 px |

The longer, warmer headline wraps to two lines where the old one was one per clause, so the centred
band grows by one headline line on each viewport. **No horizontal overflow, no clipping, no
reflow of the lead, actions or facts ribbon**; the copy stays inside `.home-gateway__title`'s
existing `22ch` measure and the hero's `--text-hero` step. Type sizing and layout are untouched
(copy-only, per the brief).

## Gates

| command | result |
|---|---|
| `npm run lint` | 0 errors (4 pre-existing warnings in files untouched here) |
| `npm run typecheck` | clean |
| `npm test` | 278 files · 3092 tests passed |
| `npm run build` | exit 0 |
| `node scripts/smoke-public-routes.mjs --base http://localhost:4310` | **All 54 advertised routes render** |

## v2 — make it shorter (the captain, 2026-10-02)

**Brief:** *"this is too long  When you lose someone you love / we are here for you,
 day or night. — make it shorter, simpler and just relax"* — the v1 band still read as a
long sentence set in display type; the captain asked for the calm version and nothing else.

A **copy change** plus dropping the lead's render — no type, sizing or layout change.

`lib/fixtures/landing/content.json` → `content.home.gateway`:

| field | v1 (before) | v2 (after) |
|---|---|---|
| `headline` | `When you lose someone you love` | `We're here for you` |
| `promise` | `we are here for you, day or night.` | `any hour, any day.` |

**Follow-up the same day:** the captain asked for **exactly two text rows** in the band — the
headline and the one-line promise, nothing else — because the any-hour promise already lives in
the facts ribbon and the call button. The lead paragraph was therefore dropped from the band
component only (`components/public/home-page.tsx`); `content.home.gateway.lead` stays in the
fixture, untouched, as instructed.

Unchanged: the place line, the three trust facts, both actions and the tab title. The band now
renders `place` / `headline` + `promise` / actions / trust facts — no lead.

### The browser-tab title

`app/(public)/page.tsx` `metadata`:

| before | after |
|---|---|
| `Villa Funeraria — when you lose someone you love, we are here for you` | `Villa Funeraria — here for you, any hour` |

### No test pinned the old copy

Repo-wide grep for the v1 strings is clean after the edit; the full suite passes unchanged.
The home's copy is staff-editable landing content and is measured here, never gated
(`AGENTS.md` → "Public page copy — the reading budget").

### Evidence — the band at 1440 and 390 (v2)

| shot | file |
|---|---|
| 1440 before | [`before-v2-1440.png`](before-v2-1440.png) |
| 1440 after | [`after-v2-1440.png`](after-v2-1440.png) |
| 390 before | [`before-v2-390.png`](before-v2-390.png) |
| 390 after | [`after-v2-390.png`](after-v2-390.png) |

Measured band height (`document.querySelector('.home-gateway').getBoundingClientRect().height`),
dev server on :4321:

| viewport | before | after | delta |
|---|---|---|---|
| 1440 | 736.2 px | 506.9 px | −229.3 px |
| 390  | 499.0 px | 351.2 px | −147.8 px |

Before is the v1 band (four-line headline + a two-line lead); after is the two-row band. The
shorter headline drops the title from four lines to two on both viewports (title box
342.3 → 171.1 px at 1440; 114.6 → 57.3 px at 390) and dropping the lead removes two more lines,
so the band loses 229.3 px at 1440 and 147.8 px at 390. **No horizontal overflow, no clipping,
no reflow of the actions or facts ribbon** (`scrollWidth === clientWidth` at both widths; the
band renders exactly two text rows plus the place line). Type sizing and layout are untouched
(copy-only, per the brief).

### Gates (v2)

| command | result |
|---|---|
| `npm run lint` | 0 errors (4 pre-existing warnings in files untouched here) |
| `npm run typecheck` | clean |
| `npm test` | 278 files · 3092 tests passed |
| `npm run build` | exit 0 |
| `node scripts/smoke-public-routes.mjs --base http://localhost:4321` | **All 54 advertised routes render** |

A first full-suite run made concurrently with the screenshots' dev server hit the 5 s test
timeout in 7 store-write tests (landing/catalogue/inquiries edits); all 7 pass in isolation
(80/80 in ~1 s) and the clean full-suite run above passes without them timing out.
