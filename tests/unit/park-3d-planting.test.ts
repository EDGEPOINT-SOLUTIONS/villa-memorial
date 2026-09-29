import { describe, expect, it } from "vitest";
import { computePlanting, SHRUB_COUNT, TREE_COUNT } from "@/components/park3d/planting";
import { pointInPolygon } from "@/components/park3d/geometry";
import { frameToImagePx, worldToPx } from "@/lib/park-3d/coords";
import { plotBounds } from "@/lib/park-3d/plot-geometry";
import {
  FUTURE_DEVELOPMENT_PX,
  MAUSOLEUM_BUILDING_PX,
  MAUSOLEUM_PLAZA_PX,
  PARKING_PX,
  PLANTING_AREAS_PX,
  PLANTING_LINES_PX,
  SITE_BOUNDARY_PX,
  WEST_STRIPS_PX,
  type PxRect,
} from "@/lib/park-3d/masterplan";
import parksFile from "@/lib/fixtures/property/parks.json";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const plots = (parksFile as { parks: Array<{ id: string; plots: Array<Record<string, unknown>> }> })
  .parks[0].plots;

/** The recorded plot rectangles in masterplan px (frame bounds → px). */
const plotRectsPx = plots
  .map((plot) => plotBounds(plot as never))
  .filter((b): b is NonNullable<typeof b> => b !== null)
  .map((b) => {
    const a = frameToImagePx(b.minX, b.minY);
    const c = frameToImagePx(b.maxX, b.maxY);
    return { x0: Math.min(a.x, c.x), y0: Math.min(a.y, c.y), x1: Math.max(a.x, c.x), y1: Math.max(a.y, c.y) };
  });

function inRect(px: { x: number; y: number }, r: PxRect, pad = 0): boolean {
  return px.x > r.x0 - pad && px.x < r.x1 + pad && px.y > r.y0 - pad && px.y < r.y1 + pad;
}

/**
 * Where the 3D planting may stand (captain 2026-09-30): trees and shrubs follow
 * the rows and groves the masterplan draws — never the flat lawn the drawing
 * leaves open (the west strips, the future-development parcel) and never a
 * burial lot, a building or the parking bays. The pure placement is
 * `components/park3d/planting.ts`; these pin its contract.
 */
describe("the 3D planting follows the drawing", () => {
  const { trees, shrubs } = computePlanting(plots as never);

  it("keeps the park's overall density", () => {
    expect(trees.length).toBeGreaterThan(0);
    expect(trees.length).toBeLessThanOrEqual(TREE_COUNT);
    expect(shrubs.length).toBeGreaterThan(0);
    expect(shrubs.length).toBeLessThanOrEqual(SHRUB_COUNT);
  });

  it("is deterministic — the same park every load", () => {
    const again = computePlanting(plots as never);
    expect(again.trees).toEqual(trees);
    expect(again.shrubs).toEqual(shrubs);
  });

  it("never stands a tree or shrub off the property", () => {
    for (const plant of [...trees, ...shrubs]) {
      const px = worldToPx(plant.x, plant.z);
      expect(
        pointInPolygon(px.x, px.y, SITE_BOUNDARY_PX),
        `a planting at (${px.x.toFixed(0)}, ${px.y.toFixed(0)}) left the site`,
      ).toBe(true);
    }
  });

  it("never stands on a burial lot, a building or the parking bays", () => {
    for (const plant of [...trees, ...shrubs]) {
      const px = worldToPx(plant.x, plant.z);
      for (const rect of plotRectsPx) {
        expect(
          inRect(px, rect),
          `a planting at (${px.x.toFixed(0)}, ${px.y.toFixed(0)}) stands on a recorded lot`,
        ).toBe(false);
      }
      expect(inRect(px, MAUSOLEUM_BUILDING_PX, 2)).toBe(false);
      expect(inRect(px, MAUSOLEUM_PLAZA_PX, 1)).toBe(false);
      expect(inRect(px, PARKING_PX)).toBe(false);
    }
  });

  it("plants only on the traced rows and groves, never the flat lawn", () => {
    for (const plant of [...trees, ...shrubs]) {
      const px = worldToPx(plant.x, plant.z);
      // The west strips and the future-development parcel are flat green on
      // the drawing: they carry no tree.
      expect(inRect(px, WEST_STRIPS_PX), "a planting stands on the west lawn strips").toBe(false);
      expect(
        inRect(px, FUTURE_DEVELOPMENT_PX),
        "a planting stands on the future-development parcel",
      ).toBe(false);
    }
  });

  it("still carries the masterplan's planting model", () => {
    expect(PLANTING_LINES_PX.length).toBeGreaterThan(8);
    for (const line of PLANTING_LINES_PX) {
      expect(line.path.length).toBeGreaterThan(1);
      expect(line.spacingPx).toBeGreaterThan(0);
    }
    expect(PLANTING_AREAS_PX.length).toBeGreaterThanOrEqual(3);
  });

  it("no longer scatters groves anywhere inside the boundary", () => {
    // The defect: `Vegetation` used to reject-sample the whole site. It now
    // delegates to the traced planting model.
    const vegetation = read("components/park3d/vegetation.tsx");
    expect(vegetation).toContain("computePlanting");
    expect(vegetation).not.toContain("while (treeItems.length < TREE_COUNT");
    const planting = read("components/park3d/planting.ts");
    expect(planting).toContain("PLANTING_LINES_PX");
    expect(planting).toContain("PLANTING_AREAS_PX");
    expect(planting).not.toContain("minX + random() * (maxX - minX)");
  });
});
