# The component kit (`components/kit/`)

The repeated patterns this product renders everywhere, settled once. A screen renders
`DataTable`, `StatusChip`, `EmptyState`, `StatCard`, `ProductCard`, `ResultsGrid` or
`FilterRail` instead of re-deriving a table, a chip, a card or a filter panel — and then
re-judging, re-cropping and re-verifying it. The point is speed without drift: two screens
that show the same thing look the same, and the honesty rules below apply on both.

## The components

| Component | Use it for | Lives in |
|---|---|---|
| `DataTable` | Every admin table: header, sortable columns, status chips, empty state, self-contained horizontal scroll. | `data-table.tsx` |
| `ResultsGrid` | A responsive card grid (3 desktop / 2 tablet / 1 phone) with its own empty and no-match states. | `results-grid.tsx` |
| `ProductCard` | One sellable item: photograph first, title, supporting line, price, status chip, one action slot. | `product-card.tsx` |
| `FilterRail` | A sticky filter panel: grouped collapsible sections, per-option counts, a price-range group, a phone sheet. | `filter-rail.tsx` |
| `StatusChip` | One status word + colour (the six `Badge` tones, closed vocabulary). | `status-chip.tsx` |
| `EmptyState` | The empty / no-match state for a list, table or grid. | `empty-state.tsx` |
| `StatCard` | One KPI figure with its label and its basis (`kpi-card` tile). | `stat-card.tsx` |

`FilterRail`'s pure decisions (selected counts, zero-dim, price clamp, result wording) are in
`filter-rail-model.ts` and unit-tested there.

## The rules the kit encodes

1. **Tokens only.** Colour, spacing, radius and type come from `styles/tokens.css`. The kit's
   own CSS block lives in `styles/components.css` (so the typography gate scans it) and declares
   no raw value. Nothing renders below 12px; every readable size is a ladder step.
2. **Answer at a glance.** Figures, labels and statuses lead. A card or a row carries no prose
   paragraph — the supporting line is a line.
3. **Every list is never blank.** An empty list says records appear there once the office adds
   them; a filtered list that found nothing says the filter is the cause and how to widen it.
   Both go through `EmptyState`; `DataTable` and `ResultsGrid` render it for you.
4. **Photographs lead.** In `ProductCard` the picture is the full column width above the facts.
   A card without an image is a bug, not a variant — the one exception is an item the client's
   material genuinely does not cover, which renders text-only with an honest note rather than a
   borrowed picture.
5. **Honest data only.** A chip or figure with no recorded source says so ("Not recorded",
   "—", "Not listed") instead of showing a plausible number. A zero-count filter option is
   dimmed, never hidden. The mapping from a domain state to a tone stays in the module that
   owns the state; the kit only makes its rendering identical.

## Adoption status

- **Migrated (this kit's proof):** the admin screens `/staff/inventory`, `/staff/accounting`,
  `/staff/notifications`, `/staff/workflows` and `/staff/settings` render their tables, KPI
  tiles and empty states through the kit. The migration is markup-for-markup — no visual change.
- **Migrated — public storefront (2026-09-21):** every surface that renders the product card
  grammar reads `ProductCard` + `ResultsGrid`: `/lots`, `/plans`, `/packages` and `/products`
  (the casket catalogue). The duplicate `components/villa/shop-card.tsx` was deleted; its exact
  markup is now `ProductCard`'s (the availability chip under the figure, plus the casket's
  `senior` line), so the swap is byte-identical. `FilterRail` is NOT adopted on `/lots`: the
  captain-approved Amazon rail there is a different grammar (`<button>` group heads with chevron
  carets, count pills, quick price ranges, an in-place sheet) from this rail's `<details>` /
  min-max / modal-sheet shape, so moving it would be a restyle. It stays landed; promoting that
  Amazon grammar into the kit is an open decision. `/services`, `/facilities` and `/gallery`
  keep their captain-approved bespoke card grammars; `/map` and `/builder` have no kit-shaped
  pattern.

## Adding a screen

Render the kit component; do not copy its markup into a new page. If a screen needs a shape the
kit does not have, add it **here** (small, typed, tested, with its honesty rule stated in the
file header) so the next screen inherits it. Keep domain vocabulary (what a status is called,
what a price means) in the feature module, never in `components/kit/`.
