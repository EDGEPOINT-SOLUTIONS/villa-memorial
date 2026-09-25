/**
 * The component kit — the settled patterns this product repeats everywhere.
 *
 * New admin (and, in the follow-up adoption pass, public) screens render these
 * instead of re-deriving a table, a chip, a card grid or a filter panel. Each
 * component's own file carries its WHY; `README.md` carries the rules the whole
 * kit encodes. Read that before adding a seventh surface that looks like one of
 * these six.
 */
export { DataTable, type DataTableColumn, type DataTableProps, type DataTableSort } from "./data-table";
export { EmptyState } from "./empty-state";
export { ListingNav } from "./listing-nav";
export { ListingShell } from "./listing-shell";
export { ProductCard, type ProductCardPhoto } from "./product-card";
export {
  RefinePanel,
  type RefineGroup,
  type RefineOption,
  type RefinePanelProps,
  type RefinePrice,
  type RefineQuickRange,
} from "./refine-panel";
export { ResultsGrid } from "./results-grid";
export { StatCard } from "./stat-card";
export { StatusChip, type StatusTone } from "./status-chip";
export {
  FilterRail,
  type FilterGroup,
  type FilterOption,
  type FilterRailPrice,
  type FilterRailProps,
} from "./filter-rail";
export {
  clampRange,
  isDimmed,
  isSelected,
  resultSummary,
  selectedInGroup,
  totalSelected,
  type PriceBounds,
  type SelectedFilters,
} from "./filter-rail-model";

/* The public layout primitives (Phase 0 consistency contract) live in
 * components/public/ but are re-exported here so a lane has ONE import surface
 * for the shared grammar. Their numbers are lib/public-layout.ts. */
export {
  PublicHero,
  SectionHead,
  PublicDisclosure,
  PublicImage,
  type PublicHeroAction,
  type PublicHeroProps,
  type PublicImageProps,
  type PublicImageSource,
  type PublicImageRole,
} from "@/components/public";
