# Agent portal — the remaining screens on the workbench

**Task:** `villa-agent-screens-pass` · **Repo:** villa-memorial · **Branch:** `fm/villa-agent-screens-pass` · **Date:** 2026-10-02
**Contract:** the captain's accepted agent-portal plan (`data/villa-agent-portal-plan/report.md`) §5.5/§5.6/§15 **PR 4**, plus the captain's 2026-10-02 note: *"apply that creativity all throughout the page, we should implement a very smart way and user friendly ui for our agents so that they can easily transact and access all the things they need for everyday transactions, for future planning."*

The dashboard, prospects, performance, quote, profile and sales were rebuilt one by one.
`/agent/applications`, `/agent/clients` and `/agent/marketing` still carried the old wordy
design. This pass lands the plan's PR-4 table/materials grammar on those three, so the whole
portal reads as one tool.

---

## 1 · What shipped

| # | The captain's ask | Where it lives |
|---|---|---|
| 1 | **Applications as a table** — family · product · stage · waits-on · promise · action, action-first | `app/(agent)/agent/applications/page.tsx` |
| 2 | **Clients as a table** — family · holds · next amount · check-in · action, with search by name/lot/plan/phone and four filters | `app/(agent)/agent/clients/page.tsx` |
| 3 | **Marketing as the office's materials grid** — the client's own covers, open/share, tracking honestly disabled | `app/(agent)/agent/marketing/page.tsx` |
| 4 | **One hover + keyboard-focus affordance** on every clickable row, card and pill | `styles/components.css` (`.wb-clickable`), applied in the three views |
| 5 | **Facts in tables, prose cut hard** | the same three pages + the workbench grammar |

### Applications — the plan's table

Six columns in the plan's order — `Family · Product · Stage · Waits on · Promise · action` — with
the recorded owner as the family's sub-line and the filed-date/amount detail under the product. The
page opens **action-first**: the files whose `stage` is `waiting_you` ride a `.wb-alerts` strip above
the table, so the agent sees whose move it is before reading a single row.

The action column is honest per row. `approved` opens the record it belongs to; `office` dials the
office on the one contact number (`lib/family/contact.ts`); `waiting_you` and `waiting_family` are
disabled controls naming the exact contract they wait on (the documents object store, the
crm-families write contract). A row links to the record that actually exists: a `prospect-…` id
opens the lead record, a `client-…` id opens the client (the old dashboard link pointed every
prospect id at `/agent/clients/…`, which 404s — this page does not repeat that).

### Clients — the book of business as a table

Five columns — `Family · Holds · Next amount · Check-in · action` — over the families the office
assigned to the agent. Search matches name, lot, plan number or phone (`findClients`); the four
filters are All · Plans · Lots · Due a visit. Money is only ever the next amount and its date, and
the foot says once where the full record lives (the PRD's sensitive-data principle).

### Marketing — the office's shelf

One panel, one grid of the six materials, each with the client's own cover, the recorded
description, the example share/open figure (labelled `Example:`), an **Open & share** link to the
office's own public page, and a **Copy link** control that is disabled because per-link tracking
waits on a share service. Covers render through `lib/media.ts` (`libraryThumb`/`libraryThumbSet`),
so a library asset serves its 320/640/960 px derivative instead of the original.

### The affordance — one grammar, reused

Every application row, client row, material card and filter pill carries the `.wb-clickable`
modifier and answers on `:hover` **and** on the keyboard with the dashboard's approved sky control
wash (`--sky-50` ground, a `--sky-200` hairline ring closing inside). It is the same grammar the
dashboard's boxes and the panel/flow open actions already wear — not a second treatment invented
next to it. A table row is not itself focusable (the name inside is the link), so its keyboard half
is `:focus-within`; a pill is an anchor and keeps `:focus-visible`. No lift, no shadow, no
transform, no second outline.

---

## 2 · Measured: the words before → after

Rendered over the real page components (server render) with the same
`tests/helpers/prose.ts` measure the reading-budget guard uses. "Content words" is every visible
word; "paragraph prose" is the text inside `<p>` elements (the reading budget's unit).

| Page | Content words before → after | Paragraph prose before → after | Longest paragraph before → after |
|---|---:|---:|---:|
| `/agent/applications` | 335 → **256** | 151 → **47** | 46 → **25** |
| `/agent/clients` | 356 → **333** | 316 → **40** | 46 → **29** |
| `/agent/marketing` | 352 → **226** | 284 → **139** | 92 → **22** |

The recorded facts did not shrink; the prose did. Each row's facts moved into table cells and each
tile's description is the client's own recorded text; only the sentences a table cannot hold (the
action's wait, the privacy line, the sharing boundary) remain as prose. The three pages also join
`tests/unit/reading-budget.test.tsx` in this PR, and their own guards pin `paragraphWords ≤ 150`.

**Phone heights** (390 px, full page) fell as the layout tightened: applications 2477 → **1647**,
marketing 3396 → **3123**; clients is roughly flat (2552 → 2427) because every family's holdings
are kept.

---

## 3 · Evidence — `before/` and `after/`

Captured against `next dev --port 4210`, signed in as the fixture agent
(`agent@vm.demo`, `Demo-Passw0rd!`), at 1440 × 900 and 390 × 844 (full page). The "before" set is
the branch point (`main` at `c7ffd38`) with the three views **and** `styles/components.css`
temporarily restored, so each pair is the real before and the real after.

| Screen | 1440 | 390 (full page) |
|---|---|---|
| Applications | `before/applications-1440.png` → `after/applications-1440.png` | `before/applications-390-full.png` → `after/applications-390-full.png` |
| Clients | `before/clients-1440.png` → `after/clients-1440.png` | `before/clients-390-full.png` → `after/clients-390-full.png` |
| Marketing | `before/marketing-1440.png` → `after/marketing-1440.png` | `before/marketing-390-full.png` → `after/marketing-390-full.png` |

---

## 4 · Tests

- **New** `tests/unit/agent-screens-pass.test.tsx` — the three real pages: the plan's columns,
  every recorded row/fact, the honest actions and disabled controls by name, one `h1`, the
  keyboard-reachable table regions, and the ≤150-word paragraph budget.
- **New** `tests/unit/agent-screens-hover.test.tsx` — the markup half (every row, card and pill
  carries `.wb-clickable`; the header, panels, search and notes do not; no row is an anchor) and the
  rule half (hover and keyboard declarations identical; the sky control wash; no lift, shadow,
  transform, pointer cursor or second outline; nothing parked in a media query).
- **New** `tests/unit/agent-screens-empty.test.tsx` — the empty states with the reads stubbed to
  the empty record (a calm line and a way forward, never a blank panel).
- **Updated** `tests/unit/reading-budget.test.tsx` — the three routes join `PAGES` (the guard's own
  rule: a page joins in the PR that compresses it).
- **Updated** `tests/unit/page-backgrounds.test.ts` — one allowlist entry names the `.wb-clickable`
  hover/focus control state; the retired `.ag-filter--on` entry is removed.
- **Updated** `tests/unit/portal-calm.test.ts` — the retired `.ag-material` entry removed.

Dead CSS went with the old views: `.ag-materials`, `.ag-material*`, `.ag-filters`,
`.ag-filter--on` and `.ag-self-start` are removed from `styles/components.css`, and the retired
`.ag-material` entry is out of the flat-grammar manifest.

Standing guards re-run green: `typography-system`, `broken-pages`, `page-backgrounds`,
`dashboard-hover`, `agent-density`, `agent-acquisition-flow`, `demo-consistency`, `portal-calm` and
`accessibility-craft`.

## 5 · Not in this change

`/agent/appointments` (just reworked as a calendar) and `/agent/lots` (already on the plan) are
untouched. The client record `/agent/clients/[id]` keeps its shape. No booking, CRM, document-upload
or share-tracking write is added — every write that has no contract stays disabled and names it.
