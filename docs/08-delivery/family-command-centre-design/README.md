# Family portal — the command centre

**Task:** `villa-family-portal` · **Repo:** villa-memorial · **Branch:** `fm/villa-family-portal` · **Date:** 2026-09-30
**Brief:** the captain's own 2026-09-30 request — *redesign the Family Portal as a lavish, sophisticated, premium, dense command centre; every part must earn its space; collapsible navigation; a Papers popup with PDFs; My plots with the 3D deep link; lighter type; the account owner's identity top-right and a private Remembering portrait.* Direction = **option A on every board decision, D1–D11** (the planning task's `data/villa-family-portal-plan/report.md` + board `9d91a218d432be59`).

This record lands with the feature (the repo's design-record convention). It carries the
before/after evidence, the measured numbers, the deviations the plan's own numbers forced, and
the exact files whose shared rendering changed.

---

## 1 · What shipped

| # | The captain's ask | Where it lives |
|---|---|---|
| 1 | **Collapsible rail** (expanded/collapsed, remembered) + **account block top-right** (round picture, name, menu) | `components/portal-frame.tsx`, `components/portal/account-chip.tsx`, `components/portal/rail-toggle.tsx`, `components/portal/avatar.tsx`; CSS `family dashboard` block; the pre-paint script in `app/(family)/client/layout.tsx` |
| 2 | **The dashboard as a command centre** — compact header, attention strip, six KPIs, seven colour-role panels, dense ladder, tabular figures | `app/(family)/client/dashboard/page.tsx`, `components/family/dash-ui.tsx`, `lib/family/family-dashboard.ts`, the `.dash*` CSS block |
| 3 | **Papers box + popup, each paper as a PDF** | `components/family/papers-table.tsx`, `components/family/papers-dialog.tsx`, `lib/family/family-documents.ts::familyPaperPopupItems`, `app/api/family/papers/receipt/[reference]/route.ts` |
| 4 | **My plots** with **View in 3D map** | `lib/family/family-plots.ts`, the dashboard's plots panel; the deep link `/map?park=villa&plot=<code>&view=3d` already ships |
| 5 | **Remembering portrait** (private) + the attach path | `components/family/family-image-uploader.tsx`, `lib/family-image-store.ts`, `app/api/family/images/route.ts`, `app/api/family/images/[slot]/route.ts` |
| 6 | **Responsive** 1440 / 1024 / 390 | the `.dash` responsive blocks in `styles/components.css` |

The board decisions: **D1 A** full command centre · **D2 A** dashboard + record screens dense,
narrative calm · **D3 A** compact base + opt-in magnifier · **D4 A** icon-only 64px rail, persisted ·
**D5 A** inline per-panel state chip · **D6 A** one command centre, `/client/family` stays household ·
**D7 A** thin rules + labels + header-strip washes · **D8 A** HTML-first popup, PDF as enhancement ·
**D9 A** ship the plots panel, 3D when a code resolves · **D10 A** guarded family image route + store ·
**D11 A** the top-right account chip.

## 2 · Measured against the plan (§10/§12), on the built page

Measured on the production build (`next build` + `next start`), signed in as `customer@vm.demo`,
with the plan's own Appendix-A script plus `getBoundingClientRect`/`getComputedStyle`.

| Measure | Before (plan §3) | Plan target | **Shipped** |
|---|---:|---:|---:|
| Dashboard content words @1440 | 113 | — | **406** |
| Dashboard viewport heights @1440 | 1.04 | 1.6–2.2 | **1.91** |
| Labels / facts on the dashboard | 4 above fold | ≥ 14 above fold | **10 above fold (32 total)** |
| KPI tiles / panels | 3 / 0 | 6 / 8 | **6 / 7** |
| Tables on the dashboard | 0 | — | **4** (visits · instalments · papers · plots) |
| Dashboard paragraph prose @1440 | ~40 w | ≤ 120 w | **109 w** |
| Longest dashboard paragraph | 11 w | ≤ 20 w | **17 w** |
| Body / page title / panel head | 16 / 35.2 / 25.6 px | 13.6 / 25.6 / 19.2 px | **13.6 / 25.6 / 19.2 px** |
| Rail width expanded / collapsed | 211 / n/a | 240 / 64 | **240 / 64 px** |
| Content envelope @1440 | 794 px (64 rem) | ≤ 96 rem | **1,046 px** (fills the 1,200 px column) |
| Compact header height | ~250 px (hero) | 72–88 px | **99 px** |
| Dashboard heights @1024 / @390 | — | ~2.4 / ~3 | **3.18 / 4.51** |
| Horizontal overflow @390 | — | none | **none** |
| Body / money / date figures | prose | tabular | **`font-variant-numeric: tabular-nums`** on `.dash` + `.dash-table` |
| Portal `font-weight: 700` | 4 (chrome) | 0 | **0** |
| Lighthouse accessibility @1440 / @390 | — | zero violations | **100 / 100** |

**Three honest deviations from the plan's own targets** (the plan's numbers were estimates and
the real recorded data changed the maths):

1. **10 facts above the fold, not ≥14.** The header (99 px), attention strip (2 rows) and KPI row
   (110 px) consume ~360 px before the first panel row; with 900 px of viewport that leaves the
   funeral/visits row and their table headers visible. It is still ~2.5× the before value, and the
   dashboard is 1.91 screens (inside the plan's 1.6–2.2). Reaching 14 would mean cutting the KPI or
   attention rows, which the captain asked for.
2. **7 panels, not 8.** The plan's §6.3 table lists exactly seven panels (funeral · visits · money ·
   papers · plots · remembering · help); the §12 "8" appears to count the attention strip. Seven
   shipped.
3. **The dashboard is 4.5 phone-screens, not ~3.** A command centre with four tables, six KPIs and
   seven panels cannot fit three phone screens while keeping every fact; the tables restack to
   compact inline label/value rows (not one block per cell) and there is no sideways scroll. The
   plan's ≤2.5-screen target is a **record-screen** ceiling and still holds for the untouched record
   screens (Payments 2.30 → unchanged).

## 3 · The six additions, in detail

### 3.1 The chrome — collapsible rail + account block
- **Expanded 240 px** (plan §7.2, up from 211), grouped, icon + label, a 2 px sky left accent on the
  current item; **collapsed 64 px**, icon-only, group names become hairline separators, every item
  keeps its `title` + `aria-label`.
- The toggle is a real `aria-expanded` / `aria-controls="portal-nav"` button; the choice is stored
  per device under `fv-rail` and applied to `<html data-rail>` by a tiny inline script **before
  first paint** (no flash). When collapsed the help block becomes a phone icon and sign-out an icon.
- **The account chip** sits in a slim right-aligned content header (desktop) — round picture + the
  owner's name + a menu (Your details · Your family · Privacy Center · Sign out), with `Esc`,
  arrow keys, click-outside and focus-return handled. On a phone the avatar joins the top bar and the
  drawer carries the account block with the name. The initials disc is the fallback until a picture
  exists.
- The sidebar's email-only line is gone (the email lives in the chip's menu).

### 3.2 The dashboard
Compact header → attention strip (≤4, most urgent first) → six KPI tiles → a 12-column grid of seven
panels. Each panel carries a meaning role (plan §8.3) as a **2 px top rule + uppercase role label in
an `-ink` token + a wash confined to the head strip**; the body stays white. Money and dates are
tabular. Every panel that waits on a service says so inline ("Not connected yet") with the office
number, never a page-level paragraph.

### 3.3 The Papers popup
The Papers panel lists the first five papers (Paper · Type · Date · State); **Read** or **Open your
papers** opens the popup. The reader is the shared **`PaperSheet` HTML** by default (always readable,
accessible, the same sheet the counter prints) with an **On screen / PDF** toggle. **Open PDF /
Download / Print** sit beside it; the PDF comes from the **family-scoped** route
`GET /api/family/papers/receipt/<ref>` (inline, `private, no-store`), which rebuilds the receipt from
the signed-in family's own snapshot — never client-supplied blocks, never the public media store.
On a phone the inline frame is hidden and the Open/Download actions remain (the HTML sheet stays the
readable copy). Empty ("No papers yet") and error (the route's readable sentence) states are
designed.

### 3.4 My plots
One row per recorded lot (Plot + Section · Held in the name of · State) with a **View the park map**
action today, and **View this plot in the 3D map** the moment the record carries a code that resolves
on the park masterplan. The recorded lot number `A-01` is a display string and the park's codes are
`A-001`, so **no mapping is guessed** (`lib/family/family-plots.ts`); an unpinned code is never
deep-linked. No interred name is shown — no family-facing interment projection exists.

### 3.5 Remembering + the private images
One identity, two pictures: the account owner's avatar (chrome) and the loved one's portrait
(Remembering) — both stored in a per-user private store and read only through the guarded
`GET /api/family/images/<slot>` (`private, no-store`; a stranger, a missing picture and an unknown
slot all 404). The attach control is the shared device-downscaler pointed at the family route; a
failed image falls back to the initials disc, never a broken glyph.

## 4 · Honest data changes (flagged loudly)

- **One recorded receipt was added to the snapshot** (`OR-2026-00201`, 27 July 2026, ₱10,000) so the
  Papers popup can open a real sheet. Its amount is the **recorded first instalment** the
  `payment_schedule` already marks paid; its number is a recorded fixture value in the family
  portal's own receipt namespace. Provenance is in the fixture and the nested `AGENTS.md` was
  corrected. When the payments/AR projection freezes it is replaced by the service's receipt.
- **The fixture's installation amounts now render in the money table** (the outstanding, not the
  instalment, was briefly shown — fixed).
- **No plot code, no chapel, no amount, no interred name is invented.** The unwired services are the
  plan's inline chips.

## 5 · Shared files whose rendering changed (the agent portal)

The brief asked that the agent surface be kept intact or the change stated. Three shared chrome
declarations moved to the portal's lighter weight ladder (plan §8.1), which the earlier
`b4435f4` "lighter step" already began for both portals:

| File | Change | Why |
|---|---|---|
| `styles/components.css` `.portal-nav__label` | `700 → 500` | labels ride the label weight (plan §8.1) |
| `styles/components.css` `.portal-frame[…].portal-nav__item--active` | `700 → 600` | emphasis rides 600 |
| `styles/components.css` `.portal-topbar__call` | `700 → 600` | emphasis rides 600 |
| `components/portal-frame.tsx` `SignOutButton` | "Log Out" wrapped in a `<span>` | so the collapsed rail can hide the word and keep the icon — markup only, the agent button renders the same |

Everything else in the agent portal is untouched: `PortalFrame` only renders the account chip, the
collapse toggle and the content header when the family passes `account`/`collapsible`, and
`tests/unit/family-portal-shell.test.tsx` asserts the agent portal carries neither.

## 6 · Verification

- `npm test` — **2,843 tests, 253 files, all pass**, including the new
  `family-density`, `family-plots`, `family-image-store`, `family-image-route`,
  `family-paper-pdf-route` guards and the extended `typography-system` (weight) and
  `page-backgrounds` (one named `--sky-50` allowlist entry) guards.
- `npm run lint` (clean), `npx tsc --noEmit` (clean), `npm run build` (success).
- `npm run smoke --base http://localhost:4100` — **all 54 advertised routes render** against the
  production build.
- Lighthouse accessibility **100** at 1440 and 390; no console errors.
- The plan's own guards updated: `family-pages` (dashboard headline), `family-calm-state` (a genuinely
  quiet workspace), `family-owned-papers` (the getting-ready state now uses an explicit field-less
  record), `page-backgrounds` (four named allowlist entries for the dashboard's role/control states).

## 7 · Evidence

`shots/` (this repo, after) — the plan's **before** shots are the read-only set at
`/home/edgepoint/Edgepoint_05/firstmate/.lavish/villa-family-portal-plan/shots/` (referenced by
`data/villa-family-portal-plan/report.md` Appendix C).

| File | Shows |
|---|---|
| `dashboard-1440-full.png` | the full command centre, expanded rail |
| `dashboard-1440.png` | the first viewport |
| `dashboard-1024.png` | KPIs 3-across, panels stacked |
| `dashboard-390-full.png` | the phone command centre (4.51 screens, no sideways scroll) |
| `rail-collapsed-1440.png` | the icon-only rail, group separators, phone + sign-out icons |
| `account-chip-1440.png` / `account-menu-1440.png` | the top-right picture + name, and its menu |
| `papers-popup-pdf-1440.png` | the popup with the real receipt PDF open |
| `plots-3d-landing-1440.png` | `/map?park=villa&plot=A-001&view=3d` framing plot A-001 |
| `remembering-portrait-1440.png` | the private round portrait and the attach/remove controls |

The portrait and avatar in the evidence were attached through the real guarded route as a
stand-in monogram (no family photograph exists in the demo) and are local-only (the store is under
`.data/`, gitignored).

## 8 · Review record

| Date | What happened |
|---|---|
| 2026-09-30 | Board `9d91a218d432be59` — eleven decisions, all option A taken. Implemented the chrome, the command centre, the Papers popup + the family PDF route, My plots, the Remembering portrait + the guarded store, and the responsive rules; the measured numbers and the three deviations above. |
