"use client";

/**
 * park3d/vegetation.tsx — procedural planting.
 *
 * Rules taken from the spec (§4): planted but controlled, never a jungle; trees
 * keep clear of burial lots, roads, paths, the parking bays and the buildings.
 * Positions are generated deterministically (fixed seed) inside the site
 * boundary and rejected against those exclusions, so the park looks the same
 * every time it loads.
 *
 * No purchased assets: trunks, canopies and shrubs are primitives.
 */
import { useMemo } from "react";
import * as THREE from "three";
import {
  distanceToPolyline,
  distanceToRing,
  mulberry32,
  pointInPolygon,
} from "@/components/park3d/geometry";
import { InstancedGroup, type InstanceSpec } from "@/components/park3d/instanced";
import { scenePalette } from "@/components/park3d/palette";
import {
  ENTRANCE_DRIVE_WORLD,
  GARDEN_ARCS_WORLD,
  GARDEN_DISCS_WORLD,
  GARDEN_PATH_WIDTH_PX,
  MAUSOLEUM_BUILDING_PX,
  MAUSOLEUM_LAWN_PX,
  MAUSOLEUM_PLAZA_PX,
  NICHE_DRIVE_EAST_WORLD,
  NICHE_DRIVE_WEST_WORLD,
  PARKING_PX,
  ROAD_LOOP_WORLD,
  ROAD_SPINE_WORLD,
  ROAD_WIDTH_PX,
  SITE_BOUNDARY_WORLD,
  WALK_DIAGONAL_WORLD,
  WALK_HORIZONTAL_WORLD,
  WALK_WIDTH_PX,
  pxLengthToMetres,
  rectToWorld,
} from "@/lib/park-3d/masterplan";
import { imageToWorld } from "@/lib/park-3d/coords";
import { plotBounds } from "@/lib/park-3d/plot-geometry";
import type { PlotArea } from "@/lib/park-maps";

type Vec2 = [number, number];

const TREE_COUNT = 260;
const SHRUB_COUNT = 220;
const SEED = 20260916;

function xzFlat(points: ReadonlyArray<{ x: number; z: number }>): Vec2[] {
  return points.map((p) => [p.x, p.z] as Vec2);
}

function inRect(x: number, z: number, rect: { centre: { x: number; z: number }; width: number; depth: number }, pad = 0): boolean {
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
    { line: xzFlat(ROAD_LOOP_WORLD), half: pxLengthToMetres(ROAD_WIDTH_PX) / 2 + 2 },
    { line: xzFlat(ROAD_SPINE_WORLD), half: pxLengthToMetres(ROAD_WIDTH_PX) / 2 + 2 },
    { line: xzFlat(ENTRANCE_DRIVE_WORLD), half: pxLengthToMetres(70) / 2 + 2 },
    { line: xzFlat(WALK_HORIZONTAL_WORLD), half: pxLengthToMetres(WALK_WIDTH_PX) / 2 + 2 },
    { line: xzFlat(WALK_DIAGONAL_WORLD), half: pxLengthToMetres(WALK_WIDTH_PX) / 2 + 2 },
    { line: xzFlat(NICHE_DRIVE_EAST_WORLD), half: pxLengthToMetres(40) / 2 + 2 },
    { line: xzFlat(NICHE_DRIVE_WEST_WORLD), half: pxLengthToMetres(40) / 2 + 2 },
    ...GARDEN_ARCS_WORLD.map((arc) => ({
      line: xzFlat(arc),
      half: pxLengthToMetres(GARDEN_PATH_WIDTH_PX) / 2 + 2,
    })),
  ];

  const rects = [
    { rect: rectToWorld(MAUSOLEUM_BUILDING_PX), pad: 3 },
    { rect: rectToWorld(MAUSOLEUM_PLAZA_PX), pad: 2 },
    { rect: rectToWorld(MAUSOLEUM_LAWN_PX), pad: 0 },
    { rect: rectToWorld(PARKING_PX), pad: 1 },
  ];

  const discs = GARDEN_DISCS_WORLD;

  return { plots, ribbons, rects, discs, clearance };
}

export function Vegetation({ areas }: { areas: PlotArea[] }) {
  const palette = useMemo(() => scenePalette(), []);
  const zones = useMemo(() => exclusionZones(areas), [areas]);

  const { trees, shrubs } = useMemo(() => {
    /** Everything planting must keep out of. */
    const blocked = (x: number, z: number): boolean => {
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
        // keep the walking rings clear as well
        if (distanceToRing(x, z, disc.x, disc.z, disc.r) < 2.4) return true;
      }
      return false;
    };

    const random = mulberry32(SEED);
    const xs = SITE_BOUNDARY_WORLD.map((p) => p[0]);
    const zs = SITE_BOUNDARY_WORLD.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const treeItems: InstanceSpec[] = [];
    const shrubItems: InstanceSpec[] = [];

    // 1. A planted boundary: even spacing along the boundary ring, jittered.
    const boundary = SITE_BOUNDARY_WORLD.map((p) => [p[0], p[1]] as Vec2);
    for (let i = 0; i < boundary.length; i++) {
      const [ax, az] = boundary[i];
      const [bx, bz] = boundary[(i + 1) % boundary.length];
      const length = Math.hypot(bx - ax, bz - az);
      const count = Math.max(1, Math.round(length / 9));
      for (let k = 0; k < count; k++) {
        const t = (k + 0.5) / count;
        const jitter = (random() - 0.5) * 2.4;
        const x = ax + (bx - ax) * t - (bz - az) / length * (2.6 + jitter);
        const z = az + (bz - az) * t + (bx - ax) / length * (2.6 + jitter);
        if (blocked(x, z)) continue;
        const h = 5.5 + random() * 3.5;
        treeItems.push({ x, y: 0, z, sx: 0.7 + random() * 0.2, sy: h, sz: 0.7 + random() * 0.2, ry: random() * Math.PI });
      }
    }

    // 2. Groves inside the park (spec: planted and controlled, not a jungle).
    let attempts = 0;
    while (treeItems.length < TREE_COUNT && attempts < TREE_COUNT * 60) {
      attempts++;
      const x = minX + random() * (maxX - minX);
      const z = minZ + random() * (maxZ - minZ);
      if (blocked(x, z)) continue;
      const h = 4.5 + random() * 4.5;
      treeItems.push({
        x,
        y: 0,
        z,
        sx: 0.65 + random() * 0.35,
        sy: h,
        sz: 0.65 + random() * 0.35,
        ry: random() * Math.PI,
      });
    }

    attempts = 0;
    while (shrubItems.length < SHRUB_COUNT && attempts < SHRUB_COUNT * 60) {
      attempts++;
      const x = minX + random() * (maxX - minX);
      const z = minZ + random() * (maxZ - minZ);
      if (blocked(x, z)) continue;
      const r = 0.5 + random() * 0.7;
      shrubItems.push({ x, y: r * 0.5, z, sx: r, sy: r * 0.8, sz: r, ry: random() * Math.PI });
    }

    return { trees: treeItems, shrubs: shrubItems };
  }, [zones]);

  const trunkGeometry = useMemo(() => new THREE.CylinderGeometry(0.16, 0.24, 1, 6), []);
  const canopyGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const shrubGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);

  const trunks: InstanceSpec[] = trees.map((t) => ({
    x: t.x,
    y: t.sy * 0.3,
    z: t.z,
    sx: 1,
    sy: t.sy * 0.6,
    sz: 1,
  }));
  const canopies: InstanceSpec[] = trees.map((t) => ({
    x: t.x,
    y: t.sy * 0.72,
    z: t.z,
    sx: t.sx * (t.sy * 0.34),
    sy: t.sy * 0.36,
    sz: t.sz * (t.sy * 0.34),
    ry: t.ry,
  }));

  return (
    <group>
      <InstancedGroup items={trunks} geometry={trunkGeometry} color={palette.trunk} name="tree-trunks" />
      <InstancedGroup
        items={canopies}
        geometry={canopyGeometry}
        color={palette.canopy}
        name="tree-canopies"
        flatShading
      />
      <InstancedGroup
        items={shrubs}
        geometry={shrubGeometry}
        color={palette.canopyLight}
        name="shrubs"
        castShadow={false}
        flatShading
      />
    </group>
  );
}
