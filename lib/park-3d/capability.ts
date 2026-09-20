/**
 * park-3d/capability.ts — WHO MAY PLOT.
 *
 * The captain's direction (spec §3, docs/07-client-villa/park-3d-spec.md):
 * plotting/editing is ADMIN ONLY. A customer visiting `/map` sees the map and the
 * lots, can inspect and select them, and gets no plotting or editing tools at
 * all — in Map mode *or* in the 3D park, since both write the same store.
 *
 * The page resolves the viewer's session server-side (httpOnly cookies, the same
 * defensive parse the Admin Portal uses) and passes ONE boolean down. This module
 * is the only place that turns scopes into that boolean, so the map editor, the
 * 3D plot tools and the 3D place/move gestalts can never drift apart.
 *
 * ⚠ Public map (captain 2026-09-20): `/map` is view-only for EVERYONE and passes
 * no capability at all. The only caller is the administrative property screen
 * (`app/(staff)/staff/property/page.tsx`), which resolves this flag and hands it
 * to `PropertyExplorer`. No public route may call this again.
 *
 * ⚠ `property:write` is the property service's editing scope (see
 * app/(staff)/staff/property/*). Inventing a second scope here would be a
 * contract claim we cannot back — the capability is derived, never widened.
 */
import { hasAnyScope } from "@/lib/rbac/nav";

/** The scopes that grant plot editing. Named once; referenced everywhere. */
export const PLOT_EDIT_SCOPES: readonly string[] = ["property:write"];

/** True when this viewer may create, move, edit or delete plots. */
export function canEditPlots(scopes: readonly string[] | null | undefined): boolean {
  if (!scopes || scopes.length === 0) return false;
  return hasAnyScope([...scopes], [...PLOT_EDIT_SCOPES]);
}
