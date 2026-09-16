/**
 * park-3d/masterplan.ts — the park's spatial configuration, read off the client
 * masterplan (`public/media/Park map.png`, 1254 × 1254 px).
 *
 * CONTRACT (docs/07-client-villa/park-3d-spec.md §0): the masterplan is the only
 * spatial source of truth. Every value here is a pixel coordinate measured on
 * that drawing — no section, road, building, gate or landmark exists in this file
 * that is not visible on it. Positions are approximate by definition (an
 * illustration is not a survey); they are expressed ONCE, in pixels, and pushed
 * through `coords.ts` so the 3D world and the 2D masterplan can never disagree.
 *
 * ASSUMPTIONS — every value that was chosen rather than measured, each one
 * configurable in this file (or in coords.ts) and nothing else:
 *  1. METRES_PER_IMAGE_UNIT (coords.ts) — no distance is printed on the
 *     masterplan. 2.4 m per store-frame unit makes the plot squares that the
 *     drawing shows (~2–3 m across) and the road (~8 m) believable, and keeps the
 *     park walkable end to end. Replace with a survey figure when one exists.
 *  2. Wall/hedge heights, road and path widths — read as proportions from the
 *     drawing, not stated on it.
 *  3. The mausoleum is drawn as a plan; its roof form, the entrance gate's
 *     columns and the parking cars are inventions of SCALE ONLY (a body of the
 *     drawn footprint), never of layout.
 *  4. The west lawn strips (x 300–450) carry no legend label on the plan: they
 *     are modelled as what they visibly are — parallel paved strips with lawn
 *     bands — and are deliberately NOT named as parking, service or pasture.
 *  5. The mausoleum forecourt arc is drawn ~15 px further south than the plan's
 *     curve so the placeholder mausoleum plots in front of it do not sit on the
 *     path. A placeholder-layout adjustment, flagged here, reversible in one
 *     number.
 *  6. Section rectangles are axis-aligned boxes fitted to the drawn grids, not
 *     traced per-lot outlines.
 */

import {
  IMAGE_FRAME,
  MASTERPLAN_PX,
  METRES_PER_IMAGE_UNIT,
  PLAN_RECT,
  pxOutlineToWorldFlat,
  pxPathToWorld,
  pxToWorld,
  round2,
  type WorldPoint,
} from "@/lib/park-3d/coords";

export { IMAGE_FRAME, METRES_PER_IMAGE_UNIT, PLAN_RECT };

/** Documentation mirror of the assumptions list above (asserted by unit tests). */
export const ASSUMPTIONS: readonly string[] = [
  "metres-per-image-unit = 2.4 (no distance is printed on the masterplan)",
  "road/path widths and wall or hedge heights are read as proportions from the drawing",
  "the west lawn strips are modelled as undifferentiated paved strips — the plan labels them nothing",
  "the mausoleum forecourt arc is shifted ~15 px south to clear the placeholder mausoleum plots",
  "section rectangles are fitted boxes around the drawn lot grids, not per-lot traces",
];

/* ---------------------------------------------------------------------------
 * 1. Site boundary — traced from the illustration (the point where the drawing's
 * white margin ends). Masterplan pixels, clockwise from the north-west corner.
 * ------------------------------------------------------------------------- */
export const SITE_BOUNDARY_PX: ReadonlyArray<readonly [number, number]> = [
  [450, 62], // north-west corner — the premium loop's outer edge
  [895, 40], // north edge, east end
  [1000, 80], // north-east slope
  [1040, 230],
  [1158, 828], // east edge beside the landscaped garden
  [1160, 848],
  [1016, 878], // step west onto the future-development parcel
  [1122, 1214], // future-development east edge
  [1122, 1246], // down to the drawing's south edge (the entrance drive)
  [828, 1246],
  [826, 1054], // north along the entrance drive's west side
  [320, 1228], // the long south-west diagonal
  [300, 1228], // south-west corner
  [300, 512], // west edge
  [422, 508], // small west step
  [450, 468],
];

/* ---------------------------------------------------------------------------
 * 2. Road network — centrelines + widths (masterplan px → world metres).
 * ------------------------------------------------------------------------- */

/** The loop around the premium lots (closed ring). */
export const ROAD_LOOP_PX: ReadonlyArray<readonly [number, number]> = [
  [487, 468],
  [487, 300],
  [491, 170],
  [505, 96],
  [545, 70],
  [640, 60],
  [780, 60],
  [872, 70],
  [910, 96],
  [922, 170],
  [915, 300],
  [905, 400],
  [897, 468],
  [780, 480],
  [620, 482],
  [510, 478],
];

/** The spine from the loop's south-east corner down to the main entrance. */
export const ROAD_SPINE_PX: ReadonlyArray<readonly [number, number]> = [
  [897, 462],
  [890, 520],
  [872, 620],
  [858, 720],
  [845, 830],
  [833, 940],
  [830, 1040],
  [845, 1120],
  [872, 1185],
];

/** The entrance drive leaving the site south-east from the gate. */
export const ENTRANCE_DRIVE_PX: ReadonlyArray<readonly [number, number]> = [
  [868, 1178],
  [950, 1228],
  [1120, 1252],
];

export const ROAD_WIDTH_PX = 48;
export const ENTRANCE_DRIVE_WIDTH_PX = 70;

/** The walking path: the tan band along the premium lots' south side and its
 * long diagonal descent to the garden-niche turnaround. */
export const WALK_HORIZONTAL_PX: ReadonlyArray<readonly [number, number]> = [
  [492, 512],
  [640, 526],
  [800, 534],
  [884, 540],
];
export const WALK_DIAGONAL_PX: ReadonlyArray<readonly [number, number]> = [
  [495, 512],
  [478, 600],
  [458, 700],
  [438, 800],
  [424, 876],
];
export const WALK_WIDTH_PX = 46;
/** Turnaround bulb at the foot of the diagonal (the hammerhead on the plan). */
export const WALK_BULB_PX = { x: 392, y: 926, r: 36 };

/** Garden-niche driveways (east and west of the niche block, from the plan). */
export const NICHE_DRIVE_EAST_PX: ReadonlyArray<readonly [number, number]> = [
  [424, 936],
  [472, 962],
  [506, 1006],
  [512, 1090],
  [508, 1158],
];
export const NICHE_DRIVE_WEST_PX: ReadonlyArray<readonly [number, number]> = [
  [392, 934],
  [352, 962],
  [322, 1002],
  [313, 1080],
  [311, 1158],
];
export const NICHE_DRIVE_WIDTH_PX = 40;

/* ---------------------------------------------------------------------------
 * 3. Section areas (fitted rectangles around the drawn lot grids).
 * ------------------------------------------------------------------------- */

export type PxRect = { x0: number; y0: number; x1: number; y1: number };

export const PREMIUM_LOTS_PX: PxRect = { x0: 508, y0: 92, x1: 898, y1: 468 };
export const PRIMARY_LOTS_PX: PxRect = { x0: 588, y0: 700, x1: 797, y1: 812 };
export const GARDEN_LOTS_PX: PxRect = { x0: 588, y0: 895, x1: 797, y1: 1020 };
export const GARDEN_NICHES_PX: PxRect = { x0: 330, y0: 990, x1: 492, y1: 1152 };
export const PARKING_PX: PxRect = { x0: 640, y0: 788, x1: 818, y1: 852 };
export const MAUSOLEUM_LAWN_PX: PxRect = { x0: 550, y0: 528, x1: 760, y1: 665 };
export const FUTURE_DEVELOPMENT_PX: PxRect = { x0: 884, y0: 890, x1: 1082, y1: 1200 };

/** The landscaped memorial garden on the right — an irregular area, not a box. */
export const LANDSCAPED_GARDEN_PX: ReadonlyArray<readonly [number, number]> = [
  [884, 250],
  [1010, 250],
  [1046, 400],
  [1090, 560],
  [1146, 780],
  [1152, 856],
  [1012, 880],
  [1000, 760],
  [950, 640],
  [900, 560],
  [884, 470],
];

/** The unlabelled west lawn strips (see ASSUMPTIONS #4). */
export const WEST_STRIPS_PX: PxRect = { x0: 300, y0: 508, x1: 452, y1: 986 };
/** Parallel paved bands inside the west strips, measured on the drawing. */
export const WEST_STRIP_BANDS_PX: ReadonlyArray<{ y: number; height: number }> = [
  { y: 536, height: 28 },
  { y: 631, height: 28 },
  { y: 726, height: 28 },
  { y: 821, height: 28 },
  { y: 916, height: 28 },
];

/* ---------------------------------------------------------------------------
 * 4. Structures.
 * ------------------------------------------------------------------------- */

export const MAUSOLEUM_BUILDING_PX: PxRect = { x0: 600, y0: 545, x1: 700, y1: 620 };
export const MAUSOLEUM_PLAZA_PX: PxRect = { x0: 585, y0: 540, x1: 715, y1: 635 };
export const MAUSOLEUM_STEPS_PX: PxRect = { x0: 620, y0: 630, x1: 680, y1: 656 };
/** Forecourt arc south of the mausoleum (see ASSUMPTIONS #5). */
export const MAUSOLEUM_FORECOURT_PX: ReadonlyArray<readonly [number, number]> = [
  [566, 700],
  [620, 692],
  [700, 692],
  [756, 700],
];
export const MAUSOLEUM_BUILDING_HEIGHT_M = 7;
export const MAUSOLEUM_PLAZA_HEIGHT_M = 0.45;

/** Main entrance gate (bottom-right corner of the plan). */
export const ENTRANCE_GATE_PX = { x: 872, y: 1180 };
export const ENTRANCE_GATE_WIDTH_PX = 44;
export const ENTRANCE_GATE_HEIGHT_M = 4.2;

/** Parking: two bay rows with a drive aisle between them. */
export const PARKING_BAYS = {
  /** Rows run east–west; the aisle is the parking rect's middle band. */
  count: 10,
  rowDepthM: 5,
  bayWidthM: 2.6,
  aisleM: 6,
} as const;

/* ---------------------------------------------------------------------------
 * 5. Landscaped garden features (curved paths, circular plazas, groves). The
 * plan shows curved walks and circular features in the right-hand garden; these
 * are fitted approximations of them.
 * ------------------------------------------------------------------------- */

export type PxDisc = { x: number; y: number; r: number };

export const GARDEN_DISCS_PX: ReadonlyArray<PxDisc> = [
  { x: 992, y: 415, r: 30 },
  { x: 1012, y: 548, r: 22 },
  { x: 1008, y: 700, r: 26 },
  { x: 962, y: 800, r: 20 },
];

export type PxArc = { cx: number; cy: number; r: number; from: number; to: number };

export const GARDEN_ARCS_PX: ReadonlyArray<PxArc> = [
  { cx: 1046, cy: 470, r: 126, from: 150, to: 355 },
  { cx: 1064, cy: 690, r: 148, from: 175, to: 330 },
];
export const GARDEN_PATH_WIDTH_PX = 18;

/** Sampled curved walks (px arcs → world polylines). */
export const GARDEN_ARCS_WORLD: ReadonlyArray<WorldPoint[]> = GARDEN_ARCS_PX.map((arc) => {
  const steps = 28;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const t = (arc.from + ((arc.to - arc.from) * i) / steps) * (Math.PI / 180);
    pts.push([arc.cx + Math.cos(t) * arc.r, arc.cy + Math.sin(t) * arc.r]);
  }
  return pxPathToWorld(pts);
});

/** Circular plazas in the landscaped garden (world centre + radius). */
export const GARDEN_DISCS_WORLD = GARDEN_DISCS_PX.map((d) => {
  const c = pxToWorld(d.x, d.y);
  return { x: c.x, z: c.z, r: pxLengthToMetres(d.r) };
});

/* ---------------------------------------------------------------------------
 * 6. Points of interest — the named places the navigation menu travels to.
 * `label` is the only copy used; nothing beyond the masterplan's own labels.
 * The camera does not need a stance here: navigating the park is orbit/framing
 * (`lib/park-3d/orbit.ts`), and framing only needs the point itself + a radius.
 * ------------------------------------------------------------------------- */

export type PointOfInterest = {
  id: string;
  label: string;
  /** Where the marker/region is. */
  at: readonly [number, number];
};

export const POINTS_OF_INTEREST: readonly PointOfInterest[] = [
  { id: "main-entrance", label: "Main Entrance", at: [872, 1185] },
  { id: "premium-lots", label: "Premium Lots", at: [700, 280] },
  { id: "mausoleum", label: "Mausoleum", at: [650, 585] },
  { id: "primary-lots", label: "Primary Lots", at: [692, 756] },
  { id: "garden-lots", label: "Garden Lots", at: [692, 955] },
  { id: "garden-niches", label: "Garden Niches", at: [410, 1070] },
  { id: "future-development", label: "Future Development", at: [985, 1045] },
];

/** Overhead/masterplan camera: what the plan is centred on. */
export const SITE_CENTRE_PX: readonly [number, number] = [700, 640];

/* ---------------------------------------------------------------------------
 * Derived world-space values (everything above pushed through coords.ts).
 * ------------------------------------------------------------------------- */

export const SITE_BOUNDARY_WORLD: ReadonlyArray<readonly [number, number]> =
  pxOutlineToWorldFlat(SITE_BOUNDARY_PX);

export const ROAD_LOOP_WORLD: WorldPoint[] = pxPathToWorld(ROAD_LOOP_PX);
export const ROAD_SPINE_WORLD: WorldPoint[] = pxPathToWorld(ROAD_SPINE_PX);
export const ENTRANCE_DRIVE_WORLD: WorldPoint[] = pxPathToWorld(ENTRANCE_DRIVE_PX);
export const WALK_HORIZONTAL_WORLD: WorldPoint[] = pxPathToWorld(WALK_HORIZONTAL_PX);
export const WALK_DIAGONAL_WORLD: WorldPoint[] = pxPathToWorld(WALK_DIAGONAL_PX);
export const NICHE_DRIVE_EAST_WORLD: WorldPoint[] = pxPathToWorld(NICHE_DRIVE_EAST_PX);
export const NICHE_DRIVE_WEST_WORLD: WorldPoint[] = pxPathToWorld(NICHE_DRIVE_WEST_PX);
export const MAUSOLEUM_FORECOURT_WORLD: WorldPoint[] = pxPathToWorld(MAUSOLEUM_FORECOURT_PX);

export const SITE_CENTRE_WORLD: WorldPoint = pxToWorld(SITE_CENTRE_PX[0], SITE_CENTRE_PX[1]);
export const ENTRANCE_GATE_WORLD: WorldPoint = pxToWorld(ENTRANCE_GATE_PX.x, ENTRANCE_GATE_PX.y);
export const WALK_BULB_WORLD = (() => {
  const c = pxToWorld(WALK_BULB_PX.x, WALK_BULB_PX.y);
  return { x: c.x, z: c.z, r: round2(pxLengthToMetres(WALK_BULB_PX.r)) };
})();

/** World metres for one masterplan pixel: the plan spans PLAN_RECT.width image
 * units, which are METRES_PER_IMAGE_UNIT metres each. */
export function pxPerWorldUnit(): number {
  return (PLAN_RECT.width / MASTERPLAN_PX.width) * METRES_PER_IMAGE_UNIT;
}

/** Rect (masterplan px) → world centre + size in metres. */
export function rectToWorld(rect: PxRect): {
  centre: WorldPoint;
  width: number;
  depth: number;
} {
  const a = pxToWorld(rect.x0, rect.y0);
  const b = pxToWorld(rect.x1, rect.y1);
  return {
    centre: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
    width: Math.abs(b.x - a.x),
    depth: Math.abs(b.z - a.z),
  };
}

/** Masterplan-pixel length → world metres. */
export function pxLengthToMetres(px: number): number {
  return px * pxPerWorldUnit();
}

const SITE_XS = SITE_BOUNDARY_PX.map((p) => p[0]);
const SITE_YS = SITE_BOUNDARY_PX.map((p) => p[1]);
export const SITE_SIZE_M = {
  width: round2(pxLengthToMetres(Math.max(...SITE_XS) - Math.min(...SITE_XS))),
  depth: round2(pxLengthToMetres(Math.max(...SITE_YS) - Math.min(...SITE_YS))),
};

/** The site's world-space footprint — what the orbit camera keeps its focus near. */
export const SITE_BOUNDS_WORLD = (() => {
  const xs = SITE_BOUNDARY_WORLD.map((p) => p[0]);
  const zs = SITE_BOUNDARY_WORLD.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
})();

/** Half the site's diagonal — the radius that frames the whole park. */
export const SITE_RADIUS_M = round2(
  Math.hypot(
    SITE_BOUNDS_WORLD.maxX - SITE_BOUNDS_WORLD.minX,
    SITE_BOUNDS_WORLD.maxZ - SITE_BOUNDS_WORLD.minZ,
  ) / 2,
);

/** Points of interest with world coordinates resolved. */
export type WorldPoi = PointOfInterest & {
  world: WorldPoint;
};

export const POIS_WORLD: ReadonlyArray<WorldPoi> = POINTS_OF_INTEREST.map((poi) => ({
  ...poi,
  world: pxToWorld(poi.at[0], poi.at[1]),
}));
