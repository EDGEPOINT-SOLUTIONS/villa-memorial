# Agent portal — the sales workbench

**Task:** `villa-agent-portal` · **Repo:** villa-memorial · **Branch:** `fm/villa-agent-portal` · **Date:** 2026-10-01
**Contract:** the captain's accepted plan `data/villa-agent-portal-plan/report.md` — the six review
decisions (D1–D6) and the three live board rounds, closed with *“go”*. This record lands with the
feature and carries the before/after evidence, the measured numbers, and the deviations the plan's
own estimates forced.

---

## 1 · What shipped

| # | The captain's ask | Where it lives |
|---|---|---|
| 1 | **The dashboard as a workbench** — compact header (hero figure + inline vitals ribbon), attention strip, pipeline stage-flow, one analytics band, eight panels | `app/(agent)/agent/dashboard/page.tsx`, `lib/agent/agent-dashboard.ts`, `components/agent/workbench.tsx`, the `agent workbench` CSS block |
| 2 | **Charts** — a line chart, a sparkline and a funnel with one draw-on-view, zero baseline, ≤4 gridlines, ≤6 x labels, tabular figures, named empty states | `components/kit/line-chart.tsx`, `components/kit/bar-row.tsx`, `components/kit/chart-model.ts`, the `chart kit` CSS block |
| 3 | **A clean prospect list** — the kanban became a filter preset; needs-you first, then oldest contact; 40 px rows, sticky header, call/text/open | `app/(agent)/agent/prospects/page.tsx`, `lib/agent/agent-dashboard.ts::orderProspects` |
| 4 | **The analytics page** | `app/(agent)/agent/performance/page.tsx` |
| 5 | **The quote desk** — price a plan/lot from the office's 2026 store and print the sheet | `app/(agent)/agent/quote/page.tsx` |
| 6 | **Shared collapsible chrome + account chip** | `app/(agent)/agent/layout.tsx`, `components/portal-nav.ts`, `components/portal-frame.tsx` (icons) |
| 7 | **The device-local capture queue as a vitals entry** | `components/agent/offline-queue.tsx` |

The board decisions: **D1 A** read/call/capture/price/print transactions now, writes honestly
disabled · **D2 A** one draw-on-view animation, reduced-motion removes it · **D3 A** the family
portal's material model applied to the agent frame · **D4 A** collapsible 240/64 px rail, remembered ·
**D5 A** the manager surface deferred (needs a role and a reporting read) · **D6 A** the honest
not-connected policy kept on every panel.

## 2 · Measured against the plan (§12), on the built pages

Measured from the live fixture-mode portal (`next dev :4100`) and the production build
(`next build` + `next start`), signed in as `agent@vm.demo`, with the plan's Appendix-A script plus
`getBoundingClientRect`/`getComputedStyle`.

| Measure | Before (plan §3.1/3.2) | Plan target | **Shipped** |
|---|---:|---:|---:|
| Equal KPI tiles @1440 | 3 | **0** | **0** — one hero figure + a 9-entry inline ribbon |
| Panels + bands @1440 | 0 | 5–7 | **8 panels** (the §6.4 table names eight) |
| Tables on the dashboard | 0 | dashboard 3 | **3** (prospects · applications · lots) |
| Charts on the dashboard | 0 | 3 (2 line + 1 snapshot) | **3** (pipeline line · value-closed empty · conversion funnel) |
| Dashboard content words @1440 | 448 | ≤ 550 | **655** |
| Dashboard paragraph prose | — | — | **165 w**, longest paragraph **12 w** |
| Dashboard screens @1440 | 2.45 | 1.8–2.4 | **3.23** |
| Dashboard screens @390 | 4.18 | ≤ 4.0 | **7.8** |
| Page inner column @1440 | 794 px (55 %) | ≥ 1,046 px | **1,136 px** expanded · **1,229 px** collapsed |
| Rail expanded / collapsed | 211 / n/a | 240 / 64 | **240 / 64 px** |
| h1 / page title | 35.2 px | 25.6 px | **25.6 px** |
| Horizontal overflow @390 | none | none | **none** |
| Money / dates / axes | prose | tabular | `font-variant-numeric: tabular-nums` on `.workbench` + `.chart__axis-label` |
| Prospect rows before “Show all” | 7 (all) | 12 | **12 (7 recorded show, none hidden)** |
| Clicks to the eleven dashboard fields | 6+ | 0 | **0** |

**Five honest deviations from the plan's own targets**, all from the same cause: the plan's §6.4
panel table renders the full recorded tables, and its §12 estimates were drawn before that table
was final.

1. **655 words, not ≤550.** Paragraph prose is cut to 165 w (from 377) and no paragraph runs past
   12 w, but the three tables' recorded data (7 prospects, 4 applications, 5 lot types) plus their
   labels alone clear 500. Hiding recorded rows to reach 550 would work against “every box carrying
   a real number”.
2. **3.23 screens @1440, not ≤2.4** — the header + attention strip + brief + stage-flow + analytics
   band are ~1.7 screens before the first panel; the plan's own §6.4 adds five panel rows below.
3. **7.8 screens @390, not ≤4.0.** The phone is one column and every panel restacks; a workbench
   with eight panels and three tables cannot fit four phone screens while keeping every fact.
4. **Compact header 129 px, not 72–88 px** — the plan's §6.0 asks for four information lines
   (eyebrow · headline · lead · start-here) plus the actions, which is 129 px at 1440.
5. **Eight panels, not the §12 summary's “5–7”.** The §6.4 table names exactly eight boxes; the
   summary's count is stale. The panel count is pinned in `agent-density.test.tsx`.

Everything else is met: zero KPI tiles, three charts, three dashboard tables (six+ across the
portal), the wider envelope, the 240/64 rail, the 25.6 px title, tabular figures and no sideways
scroll.

## 3 · The animation, quoted from the live page

`getComputedStyle` on the drawn chart at 1440 (the pipeline line is the only chart with real data):

| Element | Animation | Duration | Easing | Delay | Fill |
|---|---|---:|---|---:|---|
| `.chart__line` | `chart-draw` | **1.1 s** | `cubic-bezier(0.22, 1, 0.36, 1)` | 0 s | both |
| `.chart__area` | `chart-area` | **0.9 s** | `cubic-bezier(0.22, 1, 0.36, 1)` | **0.25 s** | both |
| `.chart__dot` | `chart-dot` | **0.32 s** | `cubic-bezier(0.22, 1, 0.36, 1)` | **0.2 s**, then **+0.14 s** per dot | both |

The last of five dots finishes at 1.08 s (≤ the plan's 1.3 s). The draw fires once, from an
`IntersectionObserver` at 25 % visibility; `prefers-reduced-motion: reduce` removes it (the line is
present, the area at 10 %), pinned by `agent-charts.test.tsx`. No idle loop, no count-up, no pie.

## 4 · The transactions, and the honest boundary

Real and landed where the agent can see the result: **call** / **text** (`tel:` / `sms:` on every
prospect row and the header's first person), **open the record** (every row and tile is a link),
**capture a prospect** (`/agent/new`, device-local, survives a lost signal; the queue count is the
ribbon's “Captured offline”), **price a plan/lot** (`/agent/quote` over the office's editable 2026
pricing store), **print** (the quotation sheet renders through the shared paper layer and
`POST /api/export/paper-pdf`, which accepts the agent's `property:read` — verified end-to-end: a
200 `application/pdf`, one page). Every write that has no contract stays disabled and names it
(“Document upload waits on the documents object store”; commission stays `₱—` with “Rates are not
set yet.”). Deferred and stated: a stage-move service, lead sync, lot hold, appointment booking,
payment — each carried in the panel that touches it.

## 5 · Evidence

`before/` — the plan's own captures of the shipped portal: `dashboard-1440.png`,
`dashboard-390-full.png`, `prospects-1440.png`, `prospects-390-full.png`.
`after/` — this branch at 1440×900 and 390×844: `dashboard-1440.png`, `dashboard-390-full.png`,
`performance-1440.png` (charts drawn), `performance-empty-1440.png` (the honest empty states),
`performance-390-full.png`, `prospects-1440.png`, `prospects-390-full.png`, `quote-1440.png`,
`quote-390-full.png`, `rail-collapsed-1440.png`.

## 6 · Guards

- **New** `tests/unit/agent-charts.test.tsx` — the zero baseline, ≤4 gridlines, ≤6 x labels, the
  2-point floor, the empty/one-point states, the draw declarations, reduced motion, and the 2–12
  point range of the one real series.
- **New** `tests/unit/agent-density.test.tsx` — the hero + ribbon (no KPI farm), the stage-flow and
  time spine, three charts, three tables, the word/prose budget, the disabled-control honesty, the
  prospect list and its filters, the analytics page's named empty states, and the quote sheet.
- **Updated** `tests/unit/family-portal-shell.test.tsx` — the agent portal now opts into the shared
  account chip and rail toggle (plan PR3) instead of being asserted to lack them.
- **Updated** `tests/unit/page-backgrounds.test.ts` — four approved workbench sky grounds named
  (stage-flow fill, panel head-strip wash, info status dot, active filter chip).

## 7 · Deferred, honestly

The table grammar for `/agent/sales`, `/agent/applications`, `/agent/appointments`, `/agent/clients`
and `/agent/marketing` (the plan's PR 4) is not in this change; those routes are untouched and keep
their existing guards. The `/agent/lots` availability-count reconciliation is the running
data-consistency task's, per the brief, and was deliberately not touched. The manager/team surface
(D5) needs an identity role and a reporting read that do not exist.
