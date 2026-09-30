import { describe, expect, it } from "vitest";
import {
  FAMILY_PARK_ID,
  familyPlotLink,
  parkMapHref,
  plotThreeDHref,
  recordedPlotCodes,
} from "@/lib/family/family-plots";

/**
 * My plots — the 3D deep link's honesty rule (plan §6.8, D9).
 *
 * The deep link `/map?park=villa&plot=<code>&view=3d` already ships; the family
 * record's own lot number (“A-01”) is a display string, NOT the park's plot code
 * (“A-001”), so the 3D action appears only when the record carries a code that
 * actually resolves to a recorded plot. Guessing the mapping would frame the
 * wrong grave — this guard makes that impossible.
 */
describe("resolving a family lot to the park map", () => {
  it("knows the park's recorded plot codes, and the office code is not the display number", () => {
    const codes = recordedPlotCodes();
    expect(codes.size).toBeGreaterThan(0);
    expect(codes.has("A-001")).toBe(true);
    expect(codes.has("A-01")).toBe(false);
  });

  it("offers the plain park map when no plot code is recorded", () => {
    const link = familyPlotLink(undefined);
    expect(link.state).toBe("no_code");
    expect(link.code).toBeNull();
    expect(link.href).toBe(parkMapHref());
    expect(link.href).toBe("/map");
    expect(link.label).toBe("View the park map");
  });

  it("does NOT deep-link the display lot number (A-01 is not a plot on the map)", () => {
    const link = familyPlotLink("A-01");
    expect(link.state).toBe("unpinned");
    expect(link.href).toBe("/map");
    expect(link.label).toBe("View the park map");
  });

  it("frames the plot in 3D once a resolving code is recorded", () => {
    const link = familyPlotLink("A-001");
    expect(link.state).toBe("linked");
    expect(link.href).toBe(plotThreeDHref("A-001"));
    expect(link.href).toBe(`/map?park=${FAMILY_PARK_ID}&plot=A-001&view=3d`);
    expect(link.label).toBe("View this plot in the 3D map");
    expect(link.href).toContain("view=3d");
  });

  it("treats a blank code as absent", () => {
    expect(familyPlotLink("   ").state).toBe("no_code");
  });
});
