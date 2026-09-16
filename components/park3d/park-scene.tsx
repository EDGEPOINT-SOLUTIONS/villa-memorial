"use client";

/**
 * park3d/park-scene.tsx — the park's scene graph: calm late-morning daylight,
 * the blockout, the plots, the planting and (in development) the debug overlay.
 * Rendered inside <Canvas> by park-3d-view.tsx.
 *
 * The camera is the orbit rig (`park3d/camera-rig.tsx`): rotate, zoom, pan, frame —
 * there is no flying/walking camera in the park any more.
 */
import { Sky } from "@react-three/drei";
import { CameraRig } from "@/components/park3d/camera-rig";
import { DebugLayer } from "@/components/park3d/debug-layer";
import { Plots3d } from "@/components/park3d/plots-3d";
import { PointsOfInterest, Paths, Roads, SectionLabels, Sections, Structures, Terrain } from "@/components/park3d/scene";
import { Vegetation } from "@/components/park3d/vegetation";
import { SITE_CENTRE_WORLD } from "@/lib/park-3d/masterplan";
import { usePark3d } from "@/lib/park-3d/view-store";
import type { LegendEntry, PlotArea } from "@/lib/park-maps";

/** Late-morning sun position — bright and even, never theatrical. */
const SUN = { x: SITE_CENTRE_WORLD.x + 70, y: 110, z: SITE_CENTRE_WORLD.z + 60 };

export function ParkScene({
  areas,
  visibleCodes,
  legendById,
  selectedCode,
  canPlot,
  onSelect,
  onChangeAreas,
  onPoi,
}: {
  areas: PlotArea[];
  visibleCodes: ReadonlySet<string> | null;
  legendById: Record<string, LegendEntry>;
  selectedCode: string | null;
  canPlot: boolean;
  onSelect: (area: PlotArea) => void;
  onChangeAreas?: (areas: PlotArea[]) => void;
  /** A point-of-interest ring was activated — the view frames it. */
  onPoi: (id: string) => void;
}) {
  const cameraMode = usePark3d((s) => s.cameraMode);

  return (
    <>
      <color attach="background" args={["#cfe4f5"]} />
      <hemisphereLight args={["#cfe4f5", "#6b7a55", 0.85]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[SUN.x, SUN.y, SUN.z]}
        intensity={1.5}
        color="#fff6e6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-camera-near={1}
        shadow-camera-far={420}
        shadow-bias={-0.0006}
      />
      <Sky distance={1400} sunPosition={[SUN.x, SUN.y, SUN.z]} turbidity={5} rayleigh={1.1} mieCoefficient={0.004} mieDirectionalG={0.85} />

      <Terrain />
      <Sections />
      <Roads />
      <Paths />
      <Structures />
      <Vegetation areas={areas} />
      <Plots3d
        areas={areas}
        visibleCodes={visibleCodes}
        legendById={legendById}
        selectedCode={selectedCode}
        canPlot={canPlot}
        onSelect={onSelect}
        onChangeAreas={onChangeAreas}
      />
      <PointsOfInterest onPoi={onPoi} />
      <SectionLabels visible={cameraMode === "overhead"} />
      <DebugLayer areas={areas} selectedCode={selectedCode} />
      <CameraRig />
    </>
  );
}
