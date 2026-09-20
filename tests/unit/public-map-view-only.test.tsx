import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import lotsFile from "@/lib/fixtures/property/lots.json";
import { PublicParkMap } from "@/components/public-park-map";
import { Park3dView } from "@/components/park3d/park-3d-view";
import type { Lot } from "@/lib/api-client/property";
import { readSource } from "../helpers/css-rules";

/**
 * The public park map is VIEW-ONLY for everyone (captain 2026-09-20):
 * "customers should not be able to add plots, they only should see the map
 * without admin settings."
 *
 * The capability itself (`lib/park-3d/capability.ts`, scope `property:write`) is
 * unchanged — what moved is WHICH surface resolves it. `/map` must not read a
 * session and must not pass a capability; plot authoring lives on the
 * administrative property map (`/staff/property` → `PropertyExplorer`). These
 * gates fail the moment an editing affordance can reach the public page again:
 *
 *   1. the page resolves nothing capability-shaped (source contract);
 *   2. the rendered public map contains no editing control (map mode);
 *   3. the 3D explorer's capability is absent-by-default and renders no plot
 *      tools when nobody passes it (3D mode);
 *   4. the administrative wiring that replaced it is still in place.
 */

const lots = lotsFile.lots as unknown as Lot[];

/**
 * Every editing affordance the shared map editor (ParkMapsView, canEdit) and the
 * 3D plot tools (Park3dView, canPlot) render when capability is on. A public
 * render must contain none of them — not hidden, not disabled.
 */
const EDITING_AFFORDANCES = [
  "+ Add plot",
  "Move plots",
  "Lock plots",
  "Plot size:",
  "Delete plot",
  "New plot type",
  "Reset demo data",
  "Upload image",
  "Lock image",
  "Add legend type",
  "Plot tools",
  "Place a plot",
  "Move a plot",
];

describe("the public park map is view-only for everyone", () => {
  it("resolves no plotting capability on the page", () => {
    const page = readSource("app/(public)/map/page.tsx");
    expect(page).not.toContain("canEditPlots");
    expect(page).not.toContain("optionalSession");
    expect(page).not.toMatch(/canPlot/);
  });

  it("signed-in or not, the rendered map mode carries no editing control", () => {
    const html = renderToStaticMarkup(
      <PublicParkMap lots={lots} initialPark="villa" enable3d />,
    );
    for (const label of EDITING_AFFORDANCES) {
      expect(html, `public map unexpectedly renders “${label}”`).not.toContain(label);
    }
    // …while the viewer's own affordances are still there.
    expect(html).toContain("click a plot to inspect");
    expect(html).toContain("3D · enter the park");
  });

  it("the 3D explorer defaults to no capability and renders no plot tools without one", () => {
    const html = renderToStaticMarkup(
      <Park3dView
        areas={[]}
        legendById={{}}
        selectedCode={null}
        onSelect={() => {}}
        onExit={() => {}}
        fullscreen="off"
        details={<p>Plot details</p>}
      />,
    );
    for (const label of EDITING_AFFORDANCES) {
      expect(html, `3D explorer unexpectedly renders “${label}”`).not.toContain(label);
    }
    // …while the explorer itself is still a viewer.
    expect(html).toContain("Plots");
    expect(html).toContain("Back to the map");
  });

  it("the public component imports no editor and forwards only a false capability", () => {
    const map = readSource("components/public-park-map.tsx");
    expect(map).not.toContain("Park3dPlotTools");
    expect(map).not.toContain("LotReserveAction");
    expect(map).toContain("canEdit={false}");
    expect(map).toContain("canPlot={false}");
    expect(map).not.toMatch(/canEdit=\{true\}|canPlot=\{true\}/);
  });

  it("keeps plot authoring on the administrative property map, on property:write", () => {
    const page = readSource("app/(staff)/staff/property/page.tsx");
    expect(page).toContain("canEditPlots");
    expect(page).toContain("canPlot={canPlot}");
    expect(page).not.toMatch(/canPlot\s*=\s*true/);

    const explorer = readSource("components/property-explorer.tsx");
    expect(explorer).toContain("canEdit={canPlot}");
  });
});
