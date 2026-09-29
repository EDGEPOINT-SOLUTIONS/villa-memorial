"use client";

/**
 * park3d/vegetation.tsx — the procedural planting, rendered.
 *
 * WHERE a tree stands is `components/park3d/planting.ts` (pure, tested): the
 * rows and groves the masterplan drawing shows. This module only turns the
 * placed trees and shrubs into three primitives — trunks, canopies and shrubs.
 *
 * No purchased assets: trunks, canopies and shrubs are primitives.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { InstancedGroup, type InstanceSpec } from "@/components/park3d/instanced";
import { scenePalette } from "@/components/park3d/palette";
import { computePlanting } from "@/components/park3d/planting";
import type { PlotArea } from "@/lib/park-maps";

export function Vegetation({ areas }: { areas: PlotArea[] }) {
  const palette = useMemo(() => scenePalette(), []);
  const { trees, shrubs } = useMemo(() => computePlanting(areas), [areas]);

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
