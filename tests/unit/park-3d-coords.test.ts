import { describe, expect, it } from "vitest";
import {
  IMAGE_FRAME,
  MASTERPLAN_PX,
  METRES_PER_IMAGE_UNIT,
  PLAN_RECT,
  frameToImagePx,
  imagePxToFrame,
  imageToWorld,
  pxToWorld,
  worldToImage,
  worldToPx,
} from "@/lib/park-3d/coords";
import {
  ASSUMPTIONS,
  GARDEN_LOTS_PX,
  GARDEN_NICHES_PX,
  MAUSOLEUM_LAWN_PX,
  PREMIUM_LOTS_PX,
  PRIMARY_LOTS_PX,
  ROAD_WIDTH_PX,
  pxLengthToMetres,
  SITE_BOUNDARY_PX,
  SITE_BOUNDARY_WORLD,
  SITE_SIZE_M,
} from "@/lib/park-3d/masterplan";
import { pointInPolygon } from "@/components/park3d/geometry";
import parksFile from "@/lib/fixtures/property/parks.json";

/**
 * The 3D park hangs off ONE conversion (lib/park-3d/coords.ts). These tests pin
 * its contract, the masterplan's calibration, and the fact that the recorded
 * Villa plots sit on the drawn sections they claim.
 */

const villaPark = (parksFile as { parks: Array<{ id: string; plots: Array<Record<string, unknown>> }> }).parks.find(
  (p) => p.id === "villa",
)!;

type Rect = { x0: number; y0: number; x1: number; y1: number };

function centreOf(plot: { outline?: number[][]; circle?: { x: number; y: number } }) {
  if (plot.circle) return { x: plot.circle.x, y: plot.circle.y };
  const xs = (plot.outline ?? []).map((p) => p[0]);
  const ys = (plot.outline ?? []).map((p) => p[1]);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

describe("image-space ⇄ world conversion", () => {
  it("fits the square masterplan into the store frame the 2D canvas draws", () => {
    expect(PLAN_RECT.width).toBe(IMAGE_FRAME.height);
    expect(PLAN_RECT.x).toBeCloseTo((IMAGE_FRAME.width - IMAGE_FRAME.height) / 2, 6);
    expect(PLAN_RECT.x + PLAN_RECT.width).toBeCloseTo(87.5, 6);
  });

  it("maps the masterplan's corners to the world's corners", () => {
    // The frame is 100 × 75 units at 2.4 m/unit → the world is 240 × 180 m,
    // centred on the masterplan, so the PNG spans x/z ∈ [-90, 90].
    const topLeft = pxToWorld(0, 0);
    const bottomRight = pxToWorld(MASTERPLAN_PX.width, MASTERPLAN_PX.height);
    expect(topLeft.x).toBeCloseTo(-90, 6);
    expect(topLeft.z).toBeCloseTo(-90, 6);
    expect(bottomRight.x).toBeCloseTo(90, 6);
    expect(bottomRight.z).toBeCloseTo(90, 6);
  });

  it("round-trips pixels → frame → pixels and frame → world → frame", () => {
    for (const [px, py] of [
      [0, 0],
      [1254, 1254],
      [627, 313],
      [872, 1185],
    ]) {
      const frame = imagePxToFrame(px, py);
      const back = frameToImagePx(frame.x, frame.y);
      expect(back.x).toBeCloseTo(px, 6);
      expect(back.y).toBeCloseTo(py, 6);

      const world = imageToWorld(frame.x, frame.y);
      const backToFrame = worldToImage(world.x, world.z);
      expect(backToFrame.x).toBeCloseTo(frame.x, 6);
      expect(backToFrame.y).toBeCloseTo(frame.y, 6);

      const backToPx = worldToPx(world.x, world.z);
      expect(backToPx.x).toBeCloseTo(px, 6);
      expect(backToPx.y).toBeCloseTo(py, 6);
    }
  });

  it("centres the masterplan on the world origin", () => {
    expect(pxToWorld(MASTERPLAN_PX.width / 2, MASTERPLAN_PX.height / 2)).toEqual({ x: 0, z: 0 });
  });

  it("keeps the scale within believable park proportions (documented assumption)", () => {
    expect(ASSUMPTIONS.some((a) => a.includes("metres-per-image-unit"))).toBe(true);
    expect(METRES_PER_IMAGE_UNIT).toBe(2.4);
    // A two-lane park road is ~7 m wide, and the whole parcel is a plausible size
    // for a memorial park — this is the calibration that makes the blockout walkable.
    expect(pxLengthToMetres(ROAD_WIDTH_PX)).toBeGreaterThan(5.5);
    expect(pxLengthToMetres(ROAD_WIDTH_PX)).toBeLessThan(8.5);
    expect(SITE_SIZE_M.width).toBeGreaterThan(80);
    expect(SITE_SIZE_M.width).toBeLessThan(400);
    expect(SITE_SIZE_M.depth).toBeGreaterThan(80);
    expect(SITE_SIZE_M.depth).toBeLessThan(400);
  });
});

describe("masterplan geometry stays inside the drawn parcel", () => {
  it("has a closed, non-degenerate boundary polygon", () => {
    expect(SITE_BOUNDARY_PX.length).toBeGreaterThan(8);
    expect(SITE_BOUNDARY_WORLD.length).toBe(SITE_BOUNDARY_PX.length);
    const ring = SITE_BOUNDARY_WORLD.map(([x, z]) => ({ x, z }));
    const area = Math.abs(
      ring.reduce((sum, p, i) => {
        const q = ring[(i + 1) % ring.length];
        return sum + (p.x * q.z - q.x * p.z);
      }, 0) / 2,
    );
    expect(area).toBeGreaterThan(5000); // a park, not a sliver
  });

  it("places every named section inside the boundary", () => {
    const rects: Array<Rect & { name: string }> = [
      { name: "premium", ...PREMIUM_LOTS_PX },
      { name: "primary", ...PRIMARY_LOTS_PX },
      { name: "garden", ...GARDEN_LOTS_PX },
      { name: "niches", ...GARDEN_NICHES_PX },
    ];
    for (const rect of rects) {
      const world = pxToWorld((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2);
      expect(
        pointInPolygon(
          world.x,
          world.z,
          SITE_BOUNDARY_WORLD.map(([x, z]) => ({ x, z })),
        ),
        `${rect.name} section centre should be inside the site boundary`,
      ).toBe(true);
    }
  });
});


describe("recorded Villa demo plots sit in the sections they claim", () => {
  const sectionForCode: Record<string, Rect> = {
    A: PRIMARY_LOTS_PX,
    B: PREMIUM_LOTS_PX,
    C: GARDEN_NICHES_PX,
    D: MAUSOLEUM_LAWN_PX,
  };

  it("keeps A/B/C/D inside primary / premium / niches / mausoleum areas", () => {
    for (const plot of villaPark.plots) {
      const code = String(plot.code);
      const rect = sectionForCode[code[0]];
      expect(rect, `no section mapped for ${code}`).toBeTruthy();
      const centre = centreOf(plot as { outline?: number[][] });
      const px = frameToImagePx(centre.x, centre.y);
      expect(px.x, `${code} x`).toBeGreaterThan(rect.x0);
      expect(px.x, `${code} x`).toBeLessThan(rect.x1);
      expect(px.y, `${code} y`).toBeGreaterThan(rect.y0);
      expect(px.y, `${code} y`).toBeLessThan(rect.y1);
    }
  });

  it("points the Villa park at the client masterplan", () => {
    const image = (villaPark as { image?: string }).image;
    expect(image).toBe("/media/Park%20map.png");
  });
});
