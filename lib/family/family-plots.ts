/**
 * My plots — resolving a family's lot record to the park's own 3D deep link.
 *
 * The deep link already ships (`components/memorials/memorial-plot.tsx`):
 * `/map?park=villa&plot=<code>&view=3d`, and the map reads `?view=3d` and frames
 * the plot. So the portal side is a list plus a link — no new map work.
 *
 * THE HONESTY RULE THIS MODULE ENFORCES. The family's recorded lot number is a
 * DISPLAY string from the plan name (“Premium Lawn · Lawn A-01”); the park's own
 * plot codes are the office's lot numbers (“A-001”). They are NOT the same, and
 * the family record carries no plot code, so the two cannot be joined today.
 * Guessing `A-01 → A-001` would frame the wrong grave, so this module resolves a
 * plot ONLY when the record explicitly carries a code that exists in the park's
 * recorded plots; otherwise it answers the park-map link and the honest state.
 *
 * The park map file is the same recorded masterplan the map page renders; a code
 * that is not on it cannot be deep-linked.
 */
import parksFile from "@/lib/fixtures/property/parks.json";

/** The one park this product carries (the demo Loyola/Golden Haven records were removed 2026-09-21). */
export const FAMILY_PARK_ID = "villa";

/** Where a lot stands relative to the map. */
export type FamilyPlotState =
  /** The record carries a code that resolves to a recorded park plot — 3D works. */
  | "linked"
  /** No plot code is recorded for this lot — the park map, never a dead 3D link. */
  | "no_code"
  /** A code is recorded but is not a plot on the park masterplan — do not deep-link it. */
  | "unpinned";

export type FamilyPlotLink = {
  /** The recorded plot code, when there is one. */
  code: string | null;
  state: FamilyPlotState;
  /** The map URL to open: the 3D park framed on the plot, or the plain park map. */
  href: string;
  /** The button's words. */
  label: string;
};

/** The plain park map (no plot selection) — always a real destination. */
export function parkMapHref(): string {
  return "/map";
}

/** The 3D deep link for a resolving plot code. */
export function plotThreeDHref(code: string): string {
  const params = new URLSearchParams({ park: FAMILY_PARK_ID, plot: code, view: "3d" });
  return `/map?${params.toString()}`;
}

/** Every recorded plot code on the park masterplan. */
export function recordedPlotCodes(): Set<string> {
  const raw = parksFile as unknown as {
    parks?: Array<{ id?: string; plots?: Array<{ code?: unknown }> }>;
  };
  const park = raw.parks?.find((entry) => entry.id === FAMILY_PARK_ID);
  const codes = new Set<string>();
  for (const plot of park?.plots ?? []) {
    if (typeof plot.code === "string" && plot.code.trim() !== "") codes.add(plot.code.trim());
  }
  return codes;
}

/**
 * Resolve a family lot record to its map action. `plotCode` is the explicit
 * office plot code the family record may one day carry — never derived from the
 * display lot number.
 */
export function familyPlotLink(plotCode?: string | null): FamilyPlotLink {
  const code = (plotCode ?? "").trim();
  if (code === "") {
    return {
      code: null,
      state: "no_code",
      href: parkMapHref(),
      label: "View the park map",
    };
  }
  if (!recordedPlotCodes().has(code)) {
    return {
      code,
      state: "unpinned",
      href: parkMapHref(),
      label: "View the park map",
    };
  }
  return {
    code,
    state: "linked",
    href: plotThreeDHref(code),
    label: "View this plot in the 3D map",
  };
}
