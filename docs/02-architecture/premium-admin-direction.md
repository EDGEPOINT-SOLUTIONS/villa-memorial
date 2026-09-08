# Premium admin direction — blue/gold sample for captain approval

Status: **awaiting approval (Phase 1 checkpoint — revision 2, blue/gold)** · Owner: Gab ·
Scope: villa-memorial staff/admin portal (whole-portal rollout after sign-off)

Screenshots (worktree-local review copy, not committed): `.premium-review/`
`dashboard-before.png` = original design (pre-pass baseline) ·
`bluegold-dashboard-top.png` = the new blue/gold sample (top) ·
`bluegold-dashboard-lower.png` = the new blue/gold sample (lower region).

## Why revision 2

The first sample refined the existing granite/marble/brass identity into a "premium craft"
treatment. The captain reviewed it and found the change **too subtle to read as a premium
step**, and asked for the **COO blue/gold "Radiant Compassion" palette** adapted for admin
screens instead. This sample delivers that: deep navy sidebar with warm gold accents, navy
display titles, cool paper content area, gold focus/active/hairline moments — unmistakably
different from the current look while staying robust (all states, RBAC and per-route titles
intact — this pass is pure tokens + scoped CSS; no markup, behavior or fixture changed).

## The direction — "Radiant Compassion" blue/gold for the staff portal

| Token | Value | Where it shows |
|---|---|---|
| `--navy-700/800/900/950` | `#1c4366 → #081c31` | Sidebar gradient, top-bar avatar, table headers (navy-600) |
| `--gold-300/400/500/700` | `#f1cc5e / #e2b633 / #c79b1e / #7a5c00` | Sidebar bloom + active rail + brand eyebrow, hairline family, KPI arrows, ink on light surfaces |
| `--color-bg-desk` | cool paper + sky-tinted desk light | staff content column |
| `--color-rule*` | cool hairlines (`#dbe4ec` ladder) | card/table/top-bar separators |
| `--gold-wash-soft/strong`, `--gold-hairline` | translucent gold washes | active nav, accent chips, 2px gold top-bar hairline |
| `--color-figure`, `--text-title-page`, `--text-stat` | navy-900 ink; 30–36px display serif | page titles, KPI numerals |

Treatment on the sample (staff dashboard):
- **Sidebar:** deep navy gradient with a soft gold bloom at the top; ivory serif brand; gold
  eyebrow; active nav = gold-tinted wash + gold left rail; links lift on hover.
- **Chrome:** 2px **gold hairline** along the top edge of the staff top bar (matching the
  hairline family the public/family shells wear — one product, four doors); gold "Demo" chip;
  navy avatar with a gold ring; gold focus ring across the staff portal.
- **Page header:** gold uppercase eyebrow; page title in navy display serif (36px).
- **KPI tiles:** navy display figures on white paper; a gold hairline draws across the top of
  each tile on hover with a navy border lift; gold arrows travel on hover.
- **Cards/tables:** cool hairline separators, uppercase navy column headers, sky-tinted row
  hover — data reads like a ledger.
- **Finance figures** keep gold ink (ceremonial key figures); status hues stay desaturated.

## Scope consequence — this decision needs the captain's ruling

Blue/gold on the **staff portal only** visibly **splits the product**: public, family and
agent surfaces keep the DOC granite/marble/brass look they wear today. Staff see both
surfaces (they run the public storefront from the admin portal), so the split is real, not
hypothetical — though only staff see the admin side. Two clean ways to rule:

1. **Staff portal goes blue/gold now (recommended); a full-product re-theme is tracked
   separately.** Boundary per the captain's earlier scoping answer is the staff portal, the
   COO mockups (client-approved) already carry blue/gold, and this repo centralizes every
   visual decision in tokens — so adopting blue/gold on staff first does not foreclose
   moving public/family/agent later; it makes that later re-theme a contained tokens task
   and this branch delivers the captain's ask on the agreed boundary.
2. **Escalate the palette as a product-wide decision first**, then apply blue/gold everywhere
   in one sweep (bigger change; public/family/agent design is COO/DOC-owned and unchanged by
   this branch if option 1 wins).

If option 1 is approved, Phase 2 rolls this system across every staff route and Phase 3 keeps
the three paper forms document-accurate with real .docx + PDF export (same wording as
`lib/contracts/*` + `villa-terms.ts`, honest em-dash/blank conventions intact).

## Approval question for the captain

Approve **option 1** (blue/gold staff portal; full-product palette decision tracked
separately — recommended), or **option 2** (product-wide blue/gold re-theme first)?
