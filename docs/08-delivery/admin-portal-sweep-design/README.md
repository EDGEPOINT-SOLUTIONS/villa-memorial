# Admin Portal sweep — implementation record (2026-09-25)

**Brief:** the captain's — *"completely renovate the UI/UX … all background color should be
white, sky blue theme is for buttons only and footer, and don't do anything with the navigation
bar … the look must be sharp, human-made and Apple-inspired, never an AI template."*

The foundation (PR [#121](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/121))
landed the design system: white page/surface/hairline tokens, sharpened radii and two-layer
shadows, flat-fill buttons, and the four shells (public, Admin Portal, agent, family) painting
white. **This lane sweeps the Admin Portal onto that foundation** — every `/staff/*` screen
renders the shared chrome and primitives, the staff content sits flat, and a new guard keeps it
there.

No screenshots (captain's instruction). Evidence is declaration-level measurements and the
guard suite, below.

## What shipped

### 1 · One shared route state: `PageLoading` and `PageError`

Every `/staff/*` route had re-derived its loading and error frame. They are now two components:

- `components/ui/page-loading.tsx` — the header keeps the route's real eyebrow/title, then one
  lead-text placeholder and one block placeholder (a detail route passes no width for a
  block-only state);
- `components/ui/page-error.tsx` — the route's own sentence plus the product's secondary
  "Try again" control, wired to the boundary's `reset`.

**21 `loading.tsx` and 17 `error.tsx` files** now render through them; the hand-rolled blocks are
gone. One source means a route cannot drift its loading/error frame by accident.

### 2 · Kit controls on the admin list screens

- **`StatCard`** replaces the hand-rolled `.kpi-card` markup on **11 screens** (billing,
  commission, customers, dispatch, documents, hr, inquiries, property, reports, work-orders,
  provisional receipts). The kit tile is markup-identical, so the swap is not a restyle. The
  four remaining `.kpi-card` call sites (`/staff/dashboard`, `/staff/cases`, the provisional
  receipt detail and the record-payment screen) keep the same grammar because they add a
  decorative arrow or a `--sm` value the kit tile does not carry; they are not a second look.
- **`DataTable`** now owns three more admin lists (**customers · documents · hr**), joining the
  six already migrated (users, inventory, notifications, settings, workflows, accounting).
  `DataTable` guarantees the pan frame, the keyboard-reachable scroll region and the kit
  `EmptyState`, so a list can never render a bare header.

### 3 · The staff content is flat and sharp

The foundation removed the button sheen; this pass applies the same reasoning to the staff
content. The colour stays, the decoration goes:

| surface | before | after |
|---|---|---|
| top-bar edge | `--gold-hairline` fade gradient | solid `--gold-400` rule |
| section-title underline | `linear-gradient(gold → transparent)` | solid `--gold-400` |
| KPI hover rule | `linear-gradient(gold → 30% gold)` | solid `--gold-400` |
| KPI hover | `box-shadow` + `translateY(-2px)` lift | `box-shadow` + border step only |

A tile now answers through its shadow and its rule; nothing floats.

### 4 · The loading placeholder is neutral

`.skeleton` rode the navy ladder (`--navy-100`/`--navy-50`), so every white-ground screen flashed
a blue tint while its data loaded. It now rides the neutral quiet wash (`--granite-100` /
`--granite-50`) — a state, not a brand surface.

### 5 · Two dead class references fixed

The audit that backs `admin-portal-sweep.test.ts` found two classes referenced in staff views
with no rule anywhere: `.ops-board-view` (the ops board's page wrapper — the notice alert sat
flush against the lanes) and `.week-matrix__day` (the schedule week-matrix day header). Both have
a real declaration now. The guard fails any new dead reference.

## Measured evidence (declaration-level, no screenshots)

| measurement | before | after |
|---|---:|---:|
| staff `loading.tsx` on the shared primitive | 0 / 21 | **21 / 21** |
| staff `error.tsx` on the shared primitive | 0 / 17 | **17 / 17** |
| staff sources with a raw hex / `rgb()` / `hsl()` colour | 0 | **0** (locked) |
| staff sources hand-rolling `.alert` | 8 files / 9 call sites | **0** |
| staff sources hand-rolling `.empty-state` | 0 | **0** (locked) |
| staff class tokens referenced but not defined | 2 | **0** |
| `.app-shell` rules with a `gradient(` (`--gold-hairline` included) | 3 | **0** |
| `.app-shell` rules with a hover `translateY(` | 1 | **0** |
| base `.kpi-card:hover` lift | 1 | **0** |
| `.skeleton` brand-blue tokens | 2 distinct | **0** |

The authoritative re-run is `npx vitest run tests/unit/admin-portal-sweep.test.ts
tests/unit/page-backgrounds.test.ts tests/unit/page-state.test.ts`.

## The guard

`tests/unit/admin-portal-sweep.test.ts` (10 tests) pins the whole lane:

1. every staff `loading.tsx` renders `PageLoading`; every `error.tsx` renders `PageError`;
2. every staff `page.tsx` renders a `PageHeader`, uses `gatedSectionPage`, or redirects;
3. no staff source carries a raw colour literal;
4. no staff source hand-rolls `.alert` or `.empty-state`;
5. no staff class token is referenced without a definition (BEM namespace roots exempt);
6. the staff shell paints no gradient (`--gold-hairline` included) and lifts nothing on hover,
   and the base `.kpi-card` is flat;
7. `.skeleton` rides the granite ladder.

`tests/unit/page-state.test.tsx` pins what the two route-state primitives render. The
foundation's `page-backgrounds.test.ts` (already green) keeps every ground white and sky on
controls + the footer.

## Scope notes

- **The navigation bar is untouched** (captain). No `.anchored-*` rule body changed in this lane.
- **Detail/editor tables stay bespoke** on the shared `.table` / `.table-wrapper` grammar (the
  plan-rate and lot-price editors, the task checklist, the case/order/lot detail tables, the
  chapel availability month grid). They render identical classes; `DataTable` is for admin list
  tables, and forcing it onto a row-of-inputs table would be a restyle.
- The premium dark folio bands (the purchase-application paper hero, the membership folio) are
  deliberate document surfaces, not page grounds; they are unchanged.

## Full check set (all green)

```
npm run lint       # clean
npm run typecheck  # clean
npm test           # 211 files, 2,495 tests passed
npm run build      # production build passed
```

> The three durable-store tests (`order-store`, `billing-payments-rbac`, `orders-admin`) time out
> at vitest's 5 s default when the whole suite runs under load; each passes in isolation and on a
> re-run. Pre-existing flake, unrelated to this lane.
