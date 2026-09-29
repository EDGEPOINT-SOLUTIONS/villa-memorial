"use client";

/**
 * park3d/planting.ts — WHERE the procedural planting stands.
 *
 * The captain's fix (2026-09-30): "in the 3d park, can you please put the trees
 * not on the grass, look at the map again and see where trees are." The old
 * generator scattered groves anywhere inside the boundary that was not a road or
 * a plot, so trees stood on the mausoleum lawn, the west strips and the open
 * grass. This module plants ONLY on the rows and groves the illustration draws:
 *
 *   · the boundary belt (the perimeter row);
 *   · both flanks of the loop, the spine, the entrance drive, the walking path
 *     and the two niche driveways;
 *   · the lot-grid dividers and the primary/garden lot borders;
 *   · a ring around the mausoleum, open at its forecourt;
 *   · the three groves traced in `PLANTING_AREAS_PX` (the east garden and the
 *     two meadows).
 *
 * Every position is deterministic (fixed seeds) and re-checked against the same
 * exclusions the scene has always used — the 16 recorded plots, the roads and
 * paths, the mausoleum, the parking bays and the garden plazas. A determinate
 * thinning keeps the park's overall density and character: the same ~260 trees
 * and ~220 shrubs as before, just standing where the drawing puts them.
 *
 * `computePlanting()` is pure and unit-tested: every returned tree/shrub must
 * fall on a planting row/grove and clear the lots, roads and buildings.
 */
import {
  distanceToPolyline,
  distanceToRing,
  mulberry32,
  pointInPolygon,
} from "@/components/park3d/geometry";
import { imageToWorld, pxToWorld } from "@/lib/park-3d/coords";
import { plotBounds } from "@/lib/park-3d/plot-geometry";
import {
  ENTRANCE_DRIVE_WORLD,
  GARDEN_ARCS_WORLD,
  GARDEN_DISCS_WORLD,
  MAUSOLEUM_BUILDING_PX,
  MAUSOLEUM_PLAZA_PX,
  NICHE_DRIVE_EAST_WORLD,
  NICHE_DRIVE_WEST_WORLD,
  PARKING_PX,
  PLANTING_AREAS_PX,
  PLANTING_LINES_PX,
  ROAD_LOOP_WORLD,
  ROAD_SPINE_WORLD,
  SITE_BOUNDARY_WORLD,
  WALK_DIAGONAL_WORLD,
  WALK_HORIZONTAL_WORLD,
  WEST_STRIPS_PX,
  FUTURE_DEVELOPMENT_PX,
  pxLengthToMetres,
  rectToWorld,
  type PxPolyline,
} from "@/lib/park-3d/masterplan";
import type { PlotArea } from "@/lib/park-maps";

export type Plant = { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number };

type Vec2 = [number, number];

/** Same overall count as the original scatter — density is deliberately kept. */
export const TREE_COUNT = 260;
export const SHRUB_COUNT = 220;
const SEED = 20260916;
/** The rows are generated generously, then thinned evenly to the count above. */
const TREE_SEED = 20261001;
const SHRUB_SEED = 20261002;

function xzFlat(points: ReadonlyArray<{ x: number; z: number }>): Vec2[] {
  return points.map((p) => [p.x, p.z] as Vec2);
}

function inRect(
  x: number,
  z: number,
  rect: { centre: { x: number; z: number }; width: number; depth: number },
  pad = 0,
): boolean {
  return (
    Math.abs(x - rect.centre.x) < rect.width / 2 + pad &&
    Math.abs(z - rect.centre.z) < rect.depth / 2 + pad
  );
}

/** Everything greenery must keep out of, in world metres. */
function exclusionZones(areas: PlotArea[]) {
  const clearance = 1.6; // metres around every plot
  const plots = areas
    .map((area) => plotBounds(area))
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .map((b) => {
      const a = imageToWorld(b.minX, b.minY);
      const c = imageToWorld(b.maxX, b.maxY);
      return { x0: a.x, z0: a.z, x1: c.x, z1: c.z };
    });

  const ribbons: Array<{ line: Vec2[]; half: number }> = [
    { line: xzFlat(ROAD_LOOP_WORLD), half: pxLengthToMetres(48) / 2 + 2 },
    { line: xzFlat(ROAD_SPINE_WORLD), half: pxLengthToMetres(48) / 2 + 2 },
    { line: xzFlat(ENTRANCE_DRIVE_WORLD), half: pxLengthToMetres(70) / 2 + 2 },
    { line: xzFlat(WALK_HORIZONTAL_WORLD), half: pxLengthToMetres(46) / 2 + 2 },
    { line: xzFlat(WALK_DIAGONAL_WORLD), half: pxLengthToMetres(46) / 2 + 2 },
    { line: xzFlat(NICHE_DRIVE_EAST_WORLD), half: pxLengthToMetres(40) / 2 + 2 },
    { line: xzFlat(NICHE_DRIVE_WEST_WORLD), half: pxLengthToMetres(40) / 2 + 2 },
    ...GARDEN_ARCS_WORLD.map((arc) => ({
      line: xzFlat(arc),
      half: pxLengthToMetres(18) / 2 + 2,
    })),
  ];

  // The mausoleum LAWN is deliberately not excluded: the drawing rings it with
  // trees and `MAUSOLEUM_RING_PX` plants that ring. The building + plaza stay
  // clear. The west lawn strips and the future-development parcel are flat
  // green on the drawing — no tree stands on either (captain 2026-09-30).
  const rects = [
    { rect: rectToWorld(MAUSOLEUM_BUILDING_PX), pad: 3 },
    { rect: rectToWorld(MAUSOLEUM_PLAZA_PX), pad: 2 },
    { rect: rectToWorld(PARKING_PX), pad: 1 },
    { rect: rectToWorld(WEST_STRIPS_PX), pad: 0 },
    { rect: rectToWorld(FUTURE_DEVELOPMENT_PX), pad: 0 },
    // The gate forecourt is the drive, not a grove.
    { rect: rectToWorld({ x0: 1020, y0: 1140, x1: 1200, y1: 1254 }), pad: 0 },
  ];

  const discs = GARDEN_DISCS_WORLD;

  return { plots, ribbons, rects, discs, clearance };
}

type Zones = ReturnType<typeof exclusionZones>;

function makeBlocked(zones: Zones) {
  return (x: number, z: number): boolean => {
    if (!pointInPolygon(x, z, SITE_BOUNDARY_WORLD)) return true;
    for (const p of zones.plots) {
      if (
        x > p.x0 - zones.clearance &&
        x < p.x1 + zones.clearance &&
        z > p.z0 - zones.clearance &&
        z < p.z1 + zones.clearance
      ) {
        return true;
      }
    }
    for (const ribbon of zones.ribbons) {
      if (distanceToPolyline(x, z, ribbon.line) < ribbon.half) return true;
    }
    for (const entry of zones.rects) {
      if (inRect(x, z, entry.rect, entry.pad)) return true;
    }
    for (const disc of zones.discs) {
      if (Math.hypot(x - disc.x, z - disc.z) < disc.r + 2) return true;
      if (distanceToRing(x, z, disc.x, disc.z, disc.r) < 2.4) return true;
    }
    return false;
  };
}

/** Offset a px polyline by `offsetPx` to its left (negative = right). */
function offsetPolyline(path: PxPolyline, offsetPx: number): Vec2[] {
  const n = path.length;
  return path.map((p, i) => {
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(n - 1, i + 1)];
    let dx = next[0] - prev[0];
    let dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    return [p[0] - dy * offsetPx, p[1] + dx * offsetPx] as Vec2;
  });
}

/** Evenly spaced points along a px polyline. */
function samplePolyline(path: ReadonlyArray<readonly [number, number]>, spacingPx: number): Vec2[] {
  const out: Vec2[] = [];
  let carry = spacingPx / 2;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i];
    const [bx, by] = path[i + 1];
    const seg = Math.hypot(bx - ax, by - ay);
    if (seg === 0) continue;
    let d = carry;
    while (d < seg) {
      const t = d / seg;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      d += spacingPx;
    }
    carry = d - seg;
  }
  return out;
}

/** A jittered grid of candidate points inside a px polygon. */
function samplePolygon(polygon: PxPolyline, spacingPx: number): Vec2[] {
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const out: Vec2[] = [];
  for (let y = Math.min(...ys) + spacingPx / 2; y < Math.max(...ys); y += spacingPx) {
    for (let x = Math.min(...xs) + spacingPx / 2; x < Math.max(...xs); x += spacingPx) {
      if (pointInPolygon(x, y, polygon)) out.push([x, y]);
    }
  }
  return out;
}

function jitterXZ(point: Vec2, jitterPx: number, random: () => number): Vec2 {
  return [
    point[0] + (random() - 0.5) * 2 * jitterPx,
    point[1] + (random() - 0.5) * 2 * jitterPx,
  ];
}

/** Deterministically keep `target` items, spread evenly across the input. */
function thin<T>(items: T[], target: number, seed: number): T[] {
  if (items.length <= target) return items;
  const random = mulberry32(seed);
  return items
    .map((item) => ({ item, k: random() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, target)
    .map((entry) => entry.item);
}

function treeFrom(px: Vec2, scale: "small" | "standard", random: () => number): Plant {
  const world = pxToWorld(px[0], px[1]);
  const standard = scale === "standard";
  const h = standard ? 4.5 + random() * 4.5 : 3 + random() * 2;
  const width = standard ? 0.65 + random() * 0.35 : 0.5 + random() * 0.2;
  return {
    x: world.x,
    y: 0,
    z: world.z,
    sx: width,
    sy: h,
    sz: standard ? 0.65 + random() * 0.35 : 0.5 + random() * 0.2,
    ry: random() * Math.PI,
  };
}

function shrubFrom(px: Vec2, random: () => number): Plant {
  const world = pxToWorld(px[0], px[1]);
  const r = 0.5 + random() * 0.7;
  return { x: world.x, y: r * 0.5, z: world.z, sx: r, sy: r * 0.8, sz: r, ry: random() * Math.PI };
}

/**
 * The park's planting, in world XZ. Pure and seeded — the same park every load.
 *
 * Trees and shrubs come from the traced rows and groves, are checked against the
 * shared exclusions, and are then thinned to `TREE_COUNT` / `SHRUB_COUNT` so the
 * density matches the pre-fix park.
 */
export function computePlanting(areas: PlotArea[]): { trees: Plant[]; shrubs: Plant[] } {
  const blocked = makeBlocked(exclusionZones(areas));
  const treeRandom = mulberry32(TREE_SEED);
  const shrubRandom = mulberry32(SHRUB_SEED);

  const treeCandidates: Plant[] = [];
  const shrubCandidates: Plant[] = [];

  const addRow = (px: Vec2, scale: "small" | "standard", withShrub: boolean) => {
    const tree = treeFrom(px, scale, treeRandom);
    if (!blocked(tree.x, tree.z)) treeCandidates.push(tree);
    if (withShrub) {
      const shrub = shrubFrom(jitterXZ(px, 4, shrubRandom), shrubRandom);
      if (!blocked(shrub.x, shrub.z)) shrubCandidates.push(shrub);
    }
  };

  // 1. Boundary belt — the perimeter row the drawing draws (world-space, as
  //    before). Kept first so the belt always reads.
  {
    const random = mulberry32(SEED);
    const boundary = SITE_BOUNDARY_WORLD.map((p) => [p[0], p[1]] as Vec2);
    for (let i = 0; i < boundary.length; i++) {
      const [ax, az] = boundary[i];
      const [bx, bz] = boundary[(i + 1) % boundary.length];
      const length = Math.hypot(bx - ax, bz - az);
      const count = Math.max(1, Math.round(length / 9));
      for (let k = 0; k < count; k++) {
        const t = (k + 0.5) / count;
        const jitter = (random() - 0.5) * 2.4;
        const x = ax + (bx - ax) * t - ((bz - az) / length) * (2.6 + jitter);
        const z = az + (bz - az) * t + ((bx - ax) / length) * (2.6 + jitter);
        if (blocked(x, z)) continue;
        const h = 5.5 + random() * 3.5;
        treeCandidates.push({
          x,
          y: 0,
          z,
          sx: 0.7 + random() * 0.2,
          sy: h,
          sz: 0.7 + random() * 0.2,
          ry: random() * Math.PI,
        });
      }
    }
  }

  // 2. Rows along every road, path, divider and the mausoleum ring.
  for (const planting of PLANTING_LINES_PX) {
    const sides: number[] =
      planting.sides === "both"
        ? [planting.offsetPx, -planting.offsetPx]
        : planting.sides === "left"
          ? [planting.offsetPx]
          : planting.sides === "right"
            ? [-planting.offsetPx]
            : [0];
    for (const offset of sides) {
      const row = offset === 0 ? planting.path : offsetPolyline(planting.path, offset);
      for (const point of samplePolyline(row, planting.spacingPx)) {
        addRow(jitterXZ(point, planting.jitterPx, treeRandom), planting.scale, true);
      }
    }
  }

  // 3. Groves traced from the drawing.
  for (const grove of PLANTING_AREAS_PX) {
    for (const point of samplePolygon(grove.polygon, grove.spacingPx)) {
      addRow(jitterXZ(point, grove.jitterPx, treeRandom), grove.scale, true);
    }
  }

  return {
    trees: thin(treeCandidates, TREE_COUNT, TREE_SEED + 1),
    shrubs: thin(shrubCandidates, SHRUB_COUNT, SHRUB_SEED + 1),
  };
}
