/**
 * park-3d/coords.ts — the ONE documented conversion between the shared plot
 * store's image-space coordinates and the 3D world.
 *
 * WHY THIS FILE EXISTS
 * Two modes (the plain masterplan image and the walk-in 3D park) show the SAME
 * spatial frame, so they must agree on where a plot is. Rather than inventing a
 * second coordinate system, the 3D world is derived from the frame the plot
 * store already uses (`lib/park-maps.ts`, drawn by `components/parks-canvas.tsx`):
 *
 *   store frame      x ∈ [0, 100], y ∈ [0, 75]      ("image units")
 *   masterplan PNG   1254 × 1254 px, contain-fitted into that frame
 *   world            X (east) / Z (south) in METRES, Y is height
 *
 * Pipeline (one direction; the inverse is `worldToImage` / `imageToFrame`):
 *
 *   masterplan px  --imagePxToFrame-->  store frame  --imageToWorld-->  world
 *
 * Every geometry value in `lib/park-3d/masterplan.ts` is authored in masterplan
 * pixels (the client's drawing is the only spatial source of truth) and pushed
 * through these functions — so nothing in the 3D scene can drift away from the
 * image the other mode draws.
 *
 * SCALE — an assumption, not a measurement. Nothing on the masterplan states a
 * distance, so `METRES_PER_IMAGE_UNIT` is chosen for a believable, walkable park
 * (see ASSUMPTIONS in masterplan.ts). It is the single knob: replace it with a
 * real survey figure and every derived dimension follows.
 *
 * Accuracy disclaimer: the masterplan is an illustration. Everything here is
 * approximate by definition — never claim survey/CAD accuracy, and keep new
 * geometry in one place so survey/CAD/GIS data can replace it later.
 */

/** The store's image-space frame — MUST match `W`/`H` in components/parks-canvas.tsx. */
export const IMAGE_FRAME = { width: 100, height: 75 } as const;

/** The client masterplan's pixel size (public/media/Park map.png). */
export const MASTERPLAN_PX = { width: 1254, height: 1254 } as const;

/**
 * Where the masterplan is drawn inside the store frame.
 *
 * `parks-canvas.tsx` fits the image with "contain" (natural aspect, centred, no
 * stretch). The masterplan is square, so it fits by height: 75 × 75 centred in
 * the 100 × 75 frame.
 */
export const PLAN_RECT = {
  x: (IMAGE_FRAME.width - IMAGE_FRAME.height) / 2, // 12.5
  y: 0,
  width: IMAGE_FRAME.height, // 75
  height: IMAGE_FRAME.height, // 75
} as const;

/** World metres per store-frame unit. ASSUMPTION — see masterplan.ts. */
export const METRES_PER_IMAGE_UNIT = 2.4;

/** World origin = frame centre, so the masterplan is centred on the world axes. */
export const WORLD_ORIGIN_IMAGE = { x: IMAGE_FRAME.width / 2, y: IMAGE_FRAME.height / 2 } as const;

export type ImagePoint = { x: number; y: number };
export type WorldPoint = { x: number; z: number };

/** Masterplan pixels → store-frame units. */
export function imagePxToFrame(px: number, py: number): ImagePoint {
  return {
    x: PLAN_RECT.x + (px / MASTERPLAN_PX.width) * PLAN_RECT.width,
    y: PLAN_RECT.y + (py / MASTERPLAN_PX.height) * PLAN_RECT.height,
  };
}

/** Store-frame units → masterplan pixels (inverse of `imagePxToFrame`). */
export function frameToImagePx(x: number, y: number): ImagePoint {
  return {
    x: ((x - PLAN_RECT.x) / PLAN_RECT.width) * MASTERPLAN_PX.width,
    y: ((y - PLAN_RECT.y) / PLAN_RECT.height) * MASTERPLAN_PX.height,
  };
}

/** Store-frame units → world metres (X east, Z south). */
export function imageToWorld(x: number, y: number): WorldPoint {
  return {
    x: (x - WORLD_ORIGIN_IMAGE.x) * METRES_PER_IMAGE_UNIT,
    z: (y - WORLD_ORIGIN_IMAGE.y) * METRES_PER_IMAGE_UNIT,
  };
}

/** World metres → store-frame units (inverse of `imageToWorld`). */
export function worldToImage(wx: number, wz: number): ImagePoint {
  return {
    x: wx / METRES_PER_IMAGE_UNIT + WORLD_ORIGIN_IMAGE.x,
    y: wz / METRES_PER_IMAGE_UNIT + WORLD_ORIGIN_IMAGE.y,
  };
}

/** Masterplan pixels → world metres. */
export function pxToWorld(px: number, py: number): WorldPoint {
  const f = imagePxToFrame(px, py);
  return imageToWorld(f.x, f.y);
}

/** World metres → masterplan pixels. */
export function worldToPx(wx: number, wz: number): ImagePoint {
  const f = worldToImage(wx, wz);
  return frameToImagePx(f.x, f.y);
}

/** A length in the store frame expressed in world metres. */
export function imageUnitsToMetres(units: number): number {
  return units * METRES_PER_IMAGE_UNIT;
}

/** A length in world metres expressed in store-frame units. */
export function metresToImageUnits(metres: number): number {
  return metres / METRES_PER_IMAGE_UNIT;
}

/**
 * The masterplan's own scale: pixels per world metre. Used when a geometry
 * value is easier to express directly in metres (road widths, wall heights).
 */
export function pxPerMetre(): number {
  return (PLAN_RECT.width / MASTERPLAN_PX.width) * METRES_PER_IMAGE_UNIT;
}

/** Convenience: a masterplan-pixel path/ring → world points. */
export function pxPathToWorld(path: ReadonlyArray<readonly [number, number]>): WorldPoint[] {
  return path.map(([px, py]) => pxToWorld(px, py));
}

/** Convenience: a masterplan-pixel polygon → flat world XZ tuples (three.js friendly). */
export function pxOutlineToWorldFlat(
  path: ReadonlyArray<readonly [number, number]>,
): Array<[number, number]> {
  return path.map(([px, py]) => {
    const w = pxToWorld(px, py);
    return [w.x, w.z] as [number, number];
  });
}

/** Centroid of a masterplan-pixel polygon (averaged vertices — outline data is simple). */
export function pxCentre(path: ReadonlyArray<readonly [number, number]>): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const [px, py] of path) {
    sx += px;
    sy += py;
  }
  return [sx / path.length, sy / path.length];
}

/** Round to centimetres — keeps generated world coordinates readable and stable. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
