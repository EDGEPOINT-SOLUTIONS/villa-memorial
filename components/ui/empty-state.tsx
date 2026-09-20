/**
 * Back-compat re-export. The canonical empty / no-match state now lives in the
 * component kit (`components/kit/empty-state.tsx`) so its wording and its
 * markup have ONE home; this module keeps the many existing
 * `@/components/ui/empty-state` imports working unchanged.
 */
export { EmptyState } from "@/components/kit/empty-state";
