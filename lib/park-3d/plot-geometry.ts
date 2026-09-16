/**
 * park-3d/plot-geometry.ts — pure transforms between a stored plot (image-space
 * outline) and its 3D representation, plus the derived dimensions the details
 * panel prints.
 *
 * ⚠ DIMENSIONS ARE DERIVED, NOT SUPPLIED. Every metre value here comes from the
 * plot's drawn outline and the single scale constant in coords.ts — the client has
 * published no lot dimensions. The details panel labels them as measured from the
 * plan so nobody mistakes them for a survey.
 */
import { imageToWorld, imageUnitsToMetres, worldToImage, round2 } from "@/lib/park-3d/coords";
import type { PlotArea } from "@/lib/park-maps";

export type PlotBounds = { minX: number; maxX: number; minY: number; maxY: number };

/** Image-space bounding box of a plot (works for polygons and circles). */
export function plotBounds(area: PlotArea): PlotBounds | null {
  if (area.circle) {
    return {
      minX: area.circle.x - area.circle.r,
      maxX: area.circle.x + area.circle.r,
      minY: area.circle.y - area.circle.r,
      maxY: area.circle.y + area.circle.r,
    };
  }
  const pts = area.outline;
  if (!pts || pts.length === 0) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Image-space centre of a plot. */
export function plotCentre(area: PlotArea): { x: number; y: number } | null {
  if (area.circle) return { x: area.circle.x, y: area.circle.y };
  const b = plotBounds(area);
  if (!b) return null;
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

export type PlotWorldXform = {
  code: string;
  id: string;
  /** World centre. */
  x: number;
  z: number;
  /** World size in metres. */
  width: number;
  depth: number;
  height: number;
  /** Circle plots render as cylinders; radius in metres. */
  radius: number | null;
};

/** The plot's blockout slab: centre, size and height in world metres. */
export function plotWorldTransform(area: PlotArea, height = 0.14): PlotWorldXform | null {
  const centre = plotCentre(area);
  const bounds = plotBounds(area);
  if (!centre || !bounds) return null;
  const world = imageToWorld(centre.x, centre.y);
  const width = imageUnitsToMetres(bounds.maxX - bounds.minX);
  const depth = imageUnitsToMetres(bounds.maxY - bounds.minY);
  return {
    code: area.code,
    id: area.id,
    x: world.x,
    z: world.z,
    width: Math.max(0.2, width),
    depth: Math.max(0.2, depth),
    height,
    radius: area.circle ? imageUnitsToMetres(area.circle.r) : null,
  };
}

/** Dimensions the details panel prints — derived from the drawn outline. */
export function plotDimensionsMetres(area: PlotArea): {
  width: number;
  length: number;
  areaSqm: number;
} | null {
  const bounds = plotBounds(area);
  if (!bounds) return null;
  const width = imageUnitsToMetres(bounds.maxX - bounds.minX);
  const length = imageUnitsToMetres(bounds.maxY - bounds.minY);
  return {
    width: round2(width),
    length: round2(length),
    areaSqm: Math.round(width * length),
  };
}

/**
 * Move a plot to a new image-space centre, shape-preserving (translation only —
 * the same rule the map editor's drag uses, so a 3D move and a 2D move produce
 * identical records).
 */
export function translatePlotTo(area: PlotArea, centreX: number, centreY: number): PlotArea {
  const current = plotCentre(area);
  if (!current) return area;
  const dx = centreX - current.x;
  const dy = centreY - current.y;
  const round = (n: number) => Math.round(n * 100) / 100;
  if (area.circle) {
    return { ...area, circle: { x: round(area.circle.x + dx), y: round(area.circle.y + dy), r: area.circle.r } };
  }
  return {
    ...area,
    outline: (area.outline ?? []).map((p) => [round(p[0] + dx), round(p[1] + dy)] as [number, number]),
  };
}

/** A square outline in image space, centred on a point (mirrors the map editor). */
export function squareOutline(
  centreX: number,
  centreY: number,
  sizeUnits: number,
): Array<[number, number]> {
  const h = sizeUnits / 2;
  const round = (n: number) => Math.round(n * 100) / 100;
  return [
    [round(centreX - h), round(centreY - h)],
    [round(centreX + h), round(centreY - h)],
    [round(centreX + h), round(centreY + h)],
    [round(centreX - h), round(centreY + h)],
  ];
}

/** World XZ → image-space centre (3D placement writes the store's coordinates). */
export function worldToImageCentre(x: number, z: number): { x: number; y: number } {
  return worldToImage(x, z);
}
