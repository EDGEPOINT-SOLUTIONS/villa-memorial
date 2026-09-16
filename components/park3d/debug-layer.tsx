"use client";

/**
 * park3d/debug-layer.tsx — the development-only overlay required by the spec
 * (§3a.17): site boundary, world axes, plot IDs, section boundaries, the
 * masterplan overlay toggle, FPS and object count.
 *
 * Development builds only — the whole layer is behind `DEVELOPMENT_OVERLAY_ENABLED`
 * so a production build cannot show it, and even in development nothing renders
 * until the visitor opens the overlay and switches a layer on.
 */
import { Html, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { segmentsGeometry } from "@/components/park3d/geometry";
import { token } from "@/components/park3d/palette";
import { MASTERPLAN_PX, PLAN_RECT } from "@/lib/park-3d/coords";
import {
  GARDEN_LOTS_PX,
  GARDEN_NICHES_PX,
  PREMIUM_LOTS_PX,
  PRIMARY_LOTS_PX,
  SITE_BOUNDARY_WORLD,
  rectToWorld,
} from "@/lib/park-3d/masterplan";
import { plotWorldTransform } from "@/lib/park-3d/plot-geometry";
import { usePark3d } from "@/lib/park-3d/view-store";
import type { PlotArea } from "@/lib/park-maps";

export const DEVELOPMENT_OVERLAY_ENABLED = process.env.NODE_ENV !== "production";

/** The masterplan as a development reference plane, aligned with the 2D frame. */
function MasterplanOverlay() {
  const texture = useTexture("/media/Park%20map.png");
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }, [texture]);

  // The store frame is 100 × 75 units; the square masterplan is contain-fitted
  // by height, centred — the same fit components/parks-canvas.tsx performs.
  const width = PLAN_RECT.width * 2.4;
  const depth = PLAN_RECT.height * 2.4;
  const centre = useMemo(() => {
    const x = (PLAN_RECT.x + PLAN_RECT.width / 2 - 50) * 2.4;
    const z = (PLAN_RECT.y + PLAN_RECT.height / 2 - 37.5) * 2.4;
    return { x, z };
  }, []);

  return (
    <mesh position={[centre.x, 0.09, centre.z]} rotation={[-Math.PI / 2, 0, 0]} name="debug-masterplan-overlay">
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial map={texture} transparent opacity={0.92} depthWrite={false} />
    </mesh>
  );
}

/** FPS + object count readout (development diagnostic only). */
function Stats() {
  const setStats = usePark3d((s) => s.setStats);
  const scene = useThree((s) => s.scene);
  const frames = useRef(0);
  const since = useRef(performance.now());

  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - since.current < 1000) return;
    const fps = Math.round((frames.current * 1000) / (now - since.current));
    frames.current = 0;
    since.current = now;
    let objects = 0;
    scene.traverse(() => {
      objects++;
    });
    setStats(fps, objects);
  });
  return null;
}

export function DebugLayer({ areas, selectedCode }: { areas: PlotArea[]; selectedCode: string | null }) {
  const debug = usePark3d((s) => s.debug);
  const debugOpen = usePark3d((s) => s.debugOpen);

  const boundary = useMemo(() => segmentsGeometry(SITE_BOUNDARY_WORLD, 0.3), []);
  const sections = useMemo(() => {
    const rects = [PREMIUM_LOTS_PX, PRIMARY_LOTS_PX, GARDEN_LOTS_PX, GARDEN_NICHES_PX].map((rect) => {
      const world = rectToWorld(rect);
      const hw = world.width / 2;
      const hd = world.depth / 2;
      return segmentsGeometry(
        [
          [world.centre.x - hw, world.centre.z - hd],
          [world.centre.x + hw, world.centre.z - hd],
          [world.centre.x + hw, world.centre.z + hd],
          [world.centre.x - hw, world.centre.z + hd],
        ] as Array<[number, number]>,
        0.22,
        true,
      );
    });
    return rects;
  }, []);

  const labels = useMemo(() => {
    if (!debug.plotIds) return [];
    return areas
      .map((area) => plotWorldTransform(area, 0.2))
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .slice(0, 140);
  }, [areas, debug.plotIds]);

  if (!DEVELOPMENT_OVERLAY_ENABLED) return null;

  const visible = debugOpen;

  return (
    <group name="debug-layer">
      {visible ? <Stats /> : null}
      {visible && debug.masterplan ? <MasterplanOverlay /> : null}
      {visible && debug.boundary ? (
        <lineSegments geometry={boundary} name="debug-boundary">
          <lineBasicMaterial color={token("--scene-marker")} />
        </lineSegments>
      ) : null}
      {visible && debug.axes ? <axesHelper args={[30]} position={[0, 0.3, 0]} name="debug-axes" /> : null}
      {visible && debug.sections
        ? sections.map((geometry, index) => (
            <lineSegments key={`debug-section-${index}`} geometry={geometry}>
              <lineBasicMaterial color={token("--sky-700")} />
            </lineSegments>
          ))
        : null}
      {visible
        ? labels.map((label) => (
            <Html
              key={`debug-label-${label.id}`}
              position={[label.x, 1.4, label.z]}
              center
              zIndexRange={[8, 0]}
              style={{ pointerEvents: "none" }}
            >
              <span className={`park3d-debug-label${label.code === selectedCode ? " park3d-debug-label--on" : ""}`}>
                {label.code}
              </span>
            </Html>
          ))
        : null}
    </group>
  );
}

export { MASTERPLAN_PX };
