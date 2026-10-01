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
