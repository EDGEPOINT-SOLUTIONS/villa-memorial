# Portal basics — view-only public map, plotting in the admin area, Admin Portal naming

Captain's report, 2026-09-20: *"customers should not be able to add plots, they only should see
the map without admin settings. That is basic. Why did you do that."* — plus: the admin area
called itself the **Staff Portal** when he signed in as an administrator.

The direction was backwards from how the product is meant to work: the customer-facing map is
the viewer, and plotting is an administrative act that belongs in the admin area.

## What shipped

### 1. `/map` is view-only for everyone — signed in or not

`app/(public)/map/page.tsx` no longer reads a session (`optionalSession` is deleted from
`lib/auth/guard.ts`) and passes no capability. `components/public-park-map.tsx` takes no
plotting prop; it hardcodes `canEdit={false}` / `canPlot={false}` for the shared map and 3D
explorer, imports neither `Park3dPlotTools` nor `LotReserveAction`, and `Park3dView`'s
`canPlot` now defaults to `false` when a host passes nothing.

Map mode and 3D mode both render the viewer only: park switcher, sections, plots, availability,
lot details, deep links, the 3D walk-through, and the request-to-reserve enquiry link (which
claims nothing). **No editing control exists in the DOM** — not hidden, not disabled. The 3D
panel's note now says plotting is handled by the office on the property map.

### 2. Plot authoring lives on the administrative property map

`app/(staff)/staff/property/page.tsx` resolves the ONE capability module,
`canEditPlots()` from `lib/park-3d/capability.ts` (scope `property:write`), and hands it to
`PropertyExplorer`, which passes `canEdit` to the shared `components/park-maps-view.tsx`
editor. `property:write` alone decides who gets the tools; nothing about the gate was weakened.
The editor is the same implementation the public page used to carry (legend types, image
upload/resize, + Add plot, Move plots, Lock plots, delete, Reset demo data) — moved, not
forked. The agent portal's `canEdit={false}` (property:read) is unchanged.

### 3. The area is the Admin Portal

- `app/(staff)/staff/layout.tsx`: `brandTitle="Admin Portal"`.
- All 62 staff page metadata titles: `— Admin Portal` (was a mixed set of `— Staff Portal`).
- Sign-in door: title **"Admin portal"**, button "Sign in to the admin portal", eyebrow
  "Villa Memorial · Admin" (`lib/sign-in.ts`, `components/sign-in-card.tsx`).
- Portal switcher label for `/staff/dashboard`: **Admin** (`components/portal-switch.tsx`).
- Counter-authored document provenance: `Admin portal (<actor>)`
  (`lib/api-client/billing-store.ts`, record-payment screen fallback).
- The Users & roles roster's per-account door label (`portal_label`, built by
  `lib/api-client/access-control.ts`) reads `Admin portal` — a string main added after this branch
  opened; the naming sweep covers it and the gate scans `lib/` and `components/` for regressions.
- "Staff" still names people and things — the staff directory, staff roles, the
  `staff@vm.demo` persona and the `/staff/*` routes are untouched.

**Note — the frozen documents contract.** `docs/08-delivery/contracts/documents-api-v1.md`
(platform-owned, never edited here) describes manually generated document rows as carrying
`uploaded_by: Staff portal (<sub prefix>)`. That value is only app-authored in **fixture mode**
(`lib/api-client/billing-store.ts` writes the receipt row for a recorded payment) and renders in
the Admin Portal's Documents table; a live service returns the row and its own string flows
through unchanged. The fixture now says `Admin portal (<actor>)` for naming consistency — a
platform-side naming update is a contract matter, not an app edit.

## Evidence (1440 × 1000, fixture mode)

| Shot | What it shows |
|---|---|
| `shots/01-public-map-signed-out-map-mode.png` | signed-out `/map`, Map mode — park switcher, "click a plot to inspect", no editor |
| `shots/02-public-map-signed-out-3d-mode.png` | signed-out 3D — Plots explorer with search/filters only; no Place/Move a plot |
| `shots/08-signed-in-admin-public-map.png` | **the admin signed in on `/map`** — identical viewer; DOM query for editing controls returned `[]` |
| `shots/09-signed-in-admin-public-3d.png` | the admin in the public 3D — still no plot tools, no reserve control |
| `shots/06-admin-property-plot-tools.png` | `/staff/property` as admin — the full plot editor (Legend, Image, Plots) |
| `shots/07-admin-property-plot-added.png` | the editor **working**: "+ Add plot" → click → "Plot VM-41 added.", PREMIUM LOTS 44 → 45 |
| `shots/04-admin-portal-sidebar.png` | sidebar brand **Admin Portal**; tab title `Dashboard — Admin Portal` |
| `shots/03-signin-admin-portal.png` | sign-in door: **Admin portal** / "Sign in to the admin portal" |

Tab titles read from the live render: `Dashboard — Admin Portal`, `Property map — Admin Portal`,
`Villa Memorial Park — Villa Memorial` (the public page keeps its own title).

## Regression gates

- `tests/unit/public-map-view-only.test.tsx` — the page resolves no capability; the rendered
  public map (map mode) and the 3D explorer with no capability contain **none** of the 13
  editing affordances; the public component imports no editor and forwards only `false`; the
  administrative wiring (`canEditPlots` → `canPlot` → `canEdit={canPlot}`) is pinned.
- `tests/unit/admin-portal-naming.test.ts` — no file under `app/(staff)`, `lib/` or `components/`
  says "Staff Portal"; the brand title is "Admin Portal" and 62 page titles carry the suffix;
  the sign-in door, portal switcher and document provenance say Admin.
- `tests/unit/agent-park-map.test.tsx` (existing) still pins admin `canEdit: true`,
  agent `canEdit: false` on the shared map.

Records the change: `AGENTS.md` (park-map section) and `docs/07-client-villa/park-3d-spec.md`
(§3 role separation, §11 decision 1, 2026-09-20 revisions).

## Verification

`npm run lint` · `npm run typecheck` · `npm test` (144 files / 1766 tests) · `npm run build` —
all green.
