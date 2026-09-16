"use client";

/**
 * park3d/scene.tsx — the park itself: ground, boundary, road loop, walking
 * paths, the labelled sections, the mausoleum, the entrance gate, the landscaped
 * garden and the points of interest.
 *
 * Every position comes from `lib/park-3d/masterplan.ts` (masterplan pixels), so
 * what stands here is what the client's drawing shows. Forms that the drawing
 * cannot answer (roof shape, gate columns, cars) are simple bodies of the drawn
 * footprint at a believable scale — see the ASSUMPTIONS list in that module.
 */
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  polygonShape,
  quadGeometry,
  rectShape,
  ribbonGeometry,
  segmentsGeometry,
} from "@/components/park3d/geometry";
import { InstancedGroup, type InstanceSpec } from "@/components/park3d/instanced";
import { scenePalette } from "@/components/park3d/palette";
import { imageToWorld, pxPathToWorld, pxToWorld } from "@/lib/park-3d/coords";
import {
  ENTRANCE_DRIVE_WORLD,
  ENTRANCE_GATE_HEIGHT_M,
  ENTRANCE_GATE_PX,
  ENTRANCE_GATE_WIDTH_PX,
  FUTURE_DEVELOPMENT_PX,
  GARDEN_ARCS_WORLD,
  GARDEN_DISCS_WORLD,
  GARDEN_PATH_WIDTH_PX,
  GARDEN_LOTS_PX,
  GARDEN_NICHES_PX,
  LANDSCAPED_GARDEN_PX,
  MAUSOLEUM_BUILDING_HEIGHT_M,
  MAUSOLEUM_BUILDING_PX,
  MAUSOLEUM_FORECOURT_PX,
  MAUSOLEUM_PLAZA_HEIGHT_M,
  MAUSOLEUM_PLAZA_PX,
  MAUSOLEUM_STEPS_PX,
  NICHE_DRIVE_EAST_WORLD,
  NICHE_DRIVE_WEST_WORLD,
  NICHE_DRIVE_WIDTH_PX,
  PARKING_BAYS,
  PARKING_PX,
  POIS_WORLD,
  PREMIUM_LOTS_PX,
  PRIMARY_LOTS_PX,
  ROAD_LOOP_WORLD,
  ROAD_SPINE_WORLD,
  ROAD_WIDTH_PX,
  SITE_BOUNDARY_WORLD,
  WALK_BULB_WORLD,
  WALK_DIAGONAL_WORLD,
  WALK_HORIZONTAL_WORLD,
  WALK_WIDTH_PX,
  WEST_STRIPS_PX,
  WEST_STRIP_BANDS_PX,
  pxLengthToMetres,
  rectToWorld,
} from "@/lib/park-3d/masterplan";
import { usePark3d } from "@/lib/park-3d/view-store";

/** Ground-surface heights: distinct layers keep coplanar meshes out of z-fighting. */
const Y = {
  terrain: 0,
  site: 0.02,
  section: 0.03,
  paths: 0.06,
  roads: 0.05,
  structures: 0.04,
} as const;

function FlatShape({
  shape,
  color,
  y,
  opacity = 1,
  name,
}: {
  shape: THREE.Shape;
  color: string;
  y: number;
  opacity?: number;
  name?: string;
}) {
  const geometry = useMemo(() => new THREE.ShapeGeometry(shape), [shape]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} name={name} receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.95}
        metalness={0}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

function Ribbon({
  line,
  width,
  color,
  y,
  closed = false,
  name,
}: {
  line: ReadonlyArray<{ x: number; z: number }>;
  width: number;
  color: string;
  y: number;
  closed?: boolean;
  name?: string;
}) {
  const geometry = useMemo(() => ribbonGeometry(line, width, closed), [line, width, closed]);
  return (
    <mesh geometry={geometry} position={[0, y, 0]} name={name} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.98} metalness={0} />
    </mesh>
  );
}

/** Ground: a broad, calm site plate with the property picked out. */
export function Terrain() {
  const palette = useMemo(() => scenePalette(), []);
  const xs = SITE_BOUNDARY_WORLD.map((p) => p[0]);
  const zs = SITE_BOUNDARY_WORLD.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const pad = 90;

  const siteShape = useMemo(() => polygonShape(SITE_BOUNDARY_WORLD), []);
  const boundaryLine = useMemo(() => segmentsGeometry(SITE_BOUNDARY_WORLD, Y.site + 0.12), []);
  const boundaryHedge = useMemo(() => ribbonGeometry(SITE_BOUNDARY_WORLD, 2.4, true), []);
  const groundGeometry = useMemo(
    () => quadGeometry(minX - pad, minZ - pad, maxX + pad, maxZ + pad, Y.terrain),
    [minX, minZ, maxX, maxZ],
  );

  return (
    <group>
      <mesh geometry={groundGeometry} receiveShadow name="surroundings">
        <meshStandardMaterial color={palette.grassDark} roughness={1} />
      </mesh>
      <FlatShape shape={siteShape} color={palette.grass} y={Y.site} name="site-ground" />
      <mesh geometry={boundaryHedge} position={[0, Y.site + 0.02, 0]} name="boundary-hedge">
        <meshStandardMaterial color={palette.hedge} roughness={1} />
      </mesh>
      <lineSegments geometry={boundaryLine} name="boundary-outline">
        <lineBasicMaterial color={palette.plotLine} transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

/** The main road: the premium-lots loop, the spine and the entrance drive. */
export function Roads() {
  const palette = useMemo(() => scenePalette(), []);
  const width = pxLengthToMetres(ROAD_WIDTH_PX);
  return (
    <group name="roads">
      <Ribbon line={ROAD_LOOP_WORLD} width={width + 1.2} color={palette.asphaltEdge} y={Y.roads - 0.01} closed name="road-loop-edge" />
      <Ribbon line={ROAD_SPINE_WORLD} width={width + 1.2} color={palette.asphaltEdge} y={Y.roads - 0.01} name="road-spine-edge" />
      <Ribbon line={ROAD_LOOP_WORLD} width={width} color={palette.asphalt} y={Y.roads} closed name="road-loop" />
      <Ribbon line={ROAD_SPINE_WORLD} width={width} color={palette.asphalt} y={Y.roads} name="road-spine" />
      <Ribbon
        line={ENTRANCE_DRIVE_WORLD}
        width={pxLengthToMetres(70)}
        color={palette.asphalt}
        y={Y.roads}
        name="entrance-drive"
      />
    </group>
  );
}

/** Walking paths and the garden-niche driveways (warm paving, per the plan). */
export function Paths() {
  const palette = useMemo(() => scenePalette(), []);
  const walk = pxLengthToMetres(WALK_WIDTH_PX);
  const drive = pxLengthToMetres(NICHE_DRIVE_WIDTH_PX);
  const bulbCentre = WALK_BULB_WORLD;
  const bulbGeometry = useMemo(() => {
    const geo = new THREE.CircleGeometry(bulbCentre.r, 28);
    return geo;
  }, [bulbCentre.r]);

  return (
    <group name="paths">
      <Ribbon line={WALK_HORIZONTAL_WORLD} width={walk} color={palette.paving} y={Y.paths} name="walk-horizontal" />
      <Ribbon line={WALK_DIAGONAL_WORLD} width={walk} color={palette.paving} y={Y.paths} name="walk-diagonal" />
      <mesh
        geometry={bulbGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[bulbCentre.x, Y.paths, bulbCentre.z]}
        name="walk-turnaround"
        receiveShadow
      >
        <meshStandardMaterial color={palette.paving} roughness={0.98} />
      </mesh>
      <Ribbon line={NICHE_DRIVE_EAST_WORLD} width={drive} color={palette.concrete} y={Y.paths} name="niche-drive-east" />
      <Ribbon line={NICHE_DRIVE_WEST_WORLD} width={drive} color={palette.concrete} y={Y.paths} name="niche-drive-west" />
      <Ribbon
        line={pxPathToWorld(MAUSOLEUM_FORECOURT_PX)}
        width={pxLengthToMetres(30)}
        color={palette.concrete}
        y={Y.paths}
        name="mausoleum-forecourt"
      />
      <Ribbon
        line={ENTRANCE_DRIVE_WORLD}
        width={pxLengthToMetres(70) + 1.4}
        color={palette.concrete}
        y={Y.paths - 0.01}
        name="entrance-drive-kerb"
      />
      {GARDEN_ARCS_WORLD.map((arc, index) => (
        <Ribbon
          key={`garden-arc-${index}`}
          line={arc}
          width={pxLengthToMetres(GARDEN_PATH_WIDTH_PX)}
          color={palette.paving}
          y={Y.paths}
          name={`garden-arc-${index}`}
        />
      ))}
      {GARDEN_DISCS_WORLD.map((disc, index) => (
        <mesh
          key={`garden-disc-${index}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[disc.x, Y.paths, disc.z]}
          receiveShadow
          name={`garden-plaza-${index}`}
        >
          <circleGeometry args={[disc.r, 28]} />
          <meshStandardMaterial color={palette.concrete} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** The labelled sections: the lot grids, parking, future development, garden. */
export function Sections() {
  const palette = useMemo(() => scenePalette(), []);

  const premium = rectToWorld(PREMIUM_LOTS_PX);
  const primary = rectToWorld(PRIMARY_LOTS_PX);
  const garden = rectToWorld(GARDEN_LOTS_PX);
  const niches = rectToWorld(GARDEN_NICHES_PX);
  const parking = rectToWorld(PARKING_PX);
  const future = rectToWorld(FUTURE_DEVELOPMENT_PX);
  const strips = rectToWorld(WEST_STRIPS_PX);

  const futureShape = useMemo(() => rectShape(future.centre.x, future.centre.z, future.width, future.depth), [future]);
  const gardenShape = useMemo(() => polygonShape(pxPathToWorld(LANDSCAPED_GARDEN_PX)), []);

  // Parking: bay lines + a few calm static cars.
  const bayGeometry = useMemo(() => {
    const widthM = parking.width;
    const depthM = parking.depth;
    const bays = PARKING_BAYS.count;
    const items: InstanceSpec[] = [];
    for (let row = 0; row < 2; row++) {
      const rowZ = parking.centre.z + (row === 0 ? -depthM / 4 : depthM / 4);
      for (let i = 0; i <= bays; i++) {
        const x = parking.centre.x - widthM / 2 + (widthM / bays) * i;
        items.push({ x, y: 0, z: rowZ, sx: 0.12, sy: 0.02, sz: depthM / 2 - 0.4 });
      }
    }
    return items;
  }, [parking]);

  const cars: InstanceSpec[] = useMemo(() => {
    const random = (i: number) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const out: InstanceSpec[] = [];
    for (let i = 0; i < 6; i++) {
      const row = i % 2;
      const slot = Math.floor(i / 2);
      const x = parking.centre.x - parking.width / 2 + (parking.width / PARKING_BAYS.count) * (slot * 2 + 1);
      const z = parking.centre.z + (row === 0 ? -parking.depth / 4 : parking.depth / 4);
      out.push({ x, y: 0.75, z, sx: 1.9, sy: 1.5, sz: 4.4, ry: random(i) * 0.05 });
    }
    return out;
  }, [parking]);

  const bayLines = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const carGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  return (
    <group name="sections">
      {/* Lot sections — a slightly different green each, as the legend draws them */}
      <FlatShape shape={rectShape(premium.centre.x, premium.centre.z, premium.width, premium.depth)} color={palette.grassLight} y={Y.section} name="premium-lots-area" />
      <FlatShape shape={rectShape(primary.centre.x, primary.centre.z, primary.width, primary.depth)} color={palette.grassLight} y={Y.section} name="primary-lots-area" />
      <FlatShape shape={rectShape(garden.centre.x, garden.centre.z, garden.width, garden.depth)} color={palette.grassLight} y={Y.section} name="garden-lots-area" />
      <FlatShape shape={rectShape(niches.centre.x, niches.centre.z, niches.width, niches.depth)} color={palette.grassLight} y={Y.section} name="garden-niches-area" />
      <FlatShape shape={gardenShape} color={palette.grassLight} y={Y.section} name="landscaped-garden" />
      <FlatShape shape={futureShape} color={palette.future} y={Y.section} name="future-development" />

      {/* The west strips (the plan labels them nothing — see ASSUMPTIONS #4) */}
      <FlatShape shape={rectShape(strips.centre.x, strips.centre.z, strips.width, strips.depth)} color={palette.grassDark} y={Y.section} name="west-strips" />
      {WEST_STRIP_BANDS_PX.map((band, index) => {
        const a = pxToWorld(WEST_STRIPS_PX.x0, band.y);
        const b = pxToWorld(WEST_STRIPS_PX.x1, band.y + band.height);
        const shape = rectShape((a.x + b.x) / 2, (a.z + b.z) / 2, Math.abs(b.x - a.x), Math.abs(b.z - a.z));
        return (
          <FlatShape
            key={`west-band-${index}`}
            shape={shape}
            color={palette.concrete}
            y={Y.section + 0.005}
            name={`west-band-${index}`}
          />
        );
      })}

      {/* Parking surface, bay markings and a few static cars */}
      <FlatShape shape={rectShape(parking.centre.x, parking.centre.z, parking.width, parking.depth)} color={palette.concrete} y={Y.section} name="parking" />
      <InstancedGroup items={bayGeometry} geometry={bayLines} color={palette.plotLine} name="parking-bays" castShadow={false} />
      <InstancedGroup items={cars} geometry={carGeometry} color={palette.stone} name="parking-cars" />
    </group>
  );
}

/** The mausoleum (plaza, steps, building) and the main entrance gate. */
export function Structures() {
  const palette = useMemo(() => scenePalette(), []);
  const building = rectToWorld(MAUSOLEUM_BUILDING_PX);
  const plaza = rectToWorld(MAUSOLEUM_PLAZA_PX);
  const steps = rectToWorld(MAUSOLEUM_STEPS_PX);
  const gate = useMemo(
    () => ({
      world: imageToWorld(ENTRANCE_GATE_PX.x, ENTRANCE_GATE_PX.y),
      width: pxLengthToMetres(ENTRANCE_GATE_WIDTH_PX),
    }),
    [],
  );

  return (
    <group name="structures">
      <mesh
        position={[plaza.centre.x, Y.structures + MAUSOLEUM_PLAZA_HEIGHT_M / 2, plaza.centre.z]}
        castShadow
        receiveShadow
        name="mausoleum-plaza"
      >
        <boxGeometry args={[plaza.width, MAUSOLEUM_PLAZA_HEIGHT_M, plaza.depth]} />
        <meshStandardMaterial color={palette.stone} roughness={0.85} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={`step-${i}`}
          position={[
            steps.centre.x,
            Y.structures + 0.09 + i * 0.06,
            steps.centre.z + i * (steps.depth / 5),
          ]}
          receiveShadow
          name={`mausoleum-step-${i}`}
        >
          <boxGeometry args={[steps.width, 0.18, steps.depth / 3.4]} />
          <meshStandardMaterial color={palette.stone} roughness={0.9} />
        </mesh>
      ))}
      <mesh
        position={[building.centre.x, Y.structures + MAUSOLEUM_PLAZA_HEIGHT_M + MAUSOLEUM_BUILDING_HEIGHT_M / 2, building.centre.z]}
        castShadow
        receiveShadow
        name="mausoleum-building"
      >
        <boxGeometry args={[building.width, MAUSOLEUM_BUILDING_HEIGHT_M, building.depth]} />
        <meshStandardMaterial color={palette.stone} roughness={0.8} />
      </mesh>
      <mesh
        position={[building.centre.x, Y.structures + MAUSOLEUM_PLAZA_HEIGHT_M + MAUSOLEUM_BUILDING_HEIGHT_M + 0.5, building.centre.z]}
        castShadow
        name="mausoleum-roof"
      >
        <boxGeometry args={[building.width + 1.4, 1, building.depth + 1.4]} />
        <meshStandardMaterial color={palette.concrete} roughness={0.85} />
      </mesh>

      {/* Main entrance: two columns and a beam — a body of the drawn gate */}
      {[-1, 1].map((side) => (
        <mesh
          key={`gate-${side}`}
          position={[
            gate.world.x + (side * gate.width) / 2,
            ENTRANCE_GATE_HEIGHT_M / 2,
            gate.world.z,
          ]}
          castShadow
          name={`entrance-column-${side === -1 ? "west" : "east"}`}
        >
          <boxGeometry args={[1.4, ENTRANCE_GATE_HEIGHT_M, 1.4]} />
          <meshStandardMaterial color={palette.stone} roughness={0.8} />
        </mesh>
      ))}
      <mesh
        position={[gate.world.x, ENTRANCE_GATE_HEIGHT_M + 0.45, gate.world.z]}
        castShadow
        name="entrance-beam"
      >
        <boxGeometry args={[gate.width + 1.4, 0.9, 1.2]} />
        <meshStandardMaterial color={palette.stone} roughness={0.8} />
      </mesh>
    </group>
  );
}

/**
 * Points of interest: a quiet brass ring on the ground at each named place, plus
 * a proximity prompt that appears only when the visitor is close (spec §3a.14).
 */
export function PointsOfInterest({ onTravel }: { onTravel: (id: string) => void }) {
  const palette = useMemo(() => scenePalette(), []);
  const [nearId, setNearId] = useState<string | null>(null);
  const player = usePark3d((s) => s.cameraMode);
  const tick = useRef(0);

  useFrame((state) => {
    tick.current++;
    if (tick.current % 12 !== 0) return;
    if (player !== "drone") {
      if (nearId !== null) setNearId(null);
      return;
    }
    let best: { id: string; distance: number } | null = null;
    for (const poi of POIS_WORLD) {
      const distance = Math.hypot(state.camera.position.x - poi.world.x, state.camera.position.z - poi.world.z);
      if (distance < 26 && (!best || distance < best.distance)) best = { id: poi.id, distance };
    }
    const next = best?.id ?? null;
    if (next !== nearId) setNearId(next);
  });

  const near = nearId ? POIS_WORLD.find((p) => p.id === nearId) : undefined;

  return (
    <group name="points-of-interest">
      {POIS_WORLD.map((poi) => (
        <mesh
          key={poi.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[poi.world.x, Y.paths + 0.01, poi.world.z]}
          name={`poi-ring-${poi.id}`}
        >
          <ringGeometry args={[2.1, 2.5, 32]} />
          <meshBasicMaterial color={palette.marker} transparent opacity={0.55} />
        </mesh>
      ))}
      {near ? (
        <Html
          position={[near.world.x, 3.4, near.world.z]}
          center
          distanceFactor={22}
          zIndexRange={[15, 0]}
        >
          <button type="button" className="park3d-prompt" onClick={() => onTravel(near.id)}>
            {near.label} — tap to explore
          </button>
        </Html>
      ) : null}
    </group>
  );
}

/** Section name plates — the masterplan's own labels, shown in the overhead
 * masterplan view (while flying, the proximity prompts carry the naming instead,
 * so the world is never labelled all at once). */
export function SectionLabels({ visible }: { visible: boolean }) {
  const places: Array<{ id: string; label: string; x: number; z: number }> = useMemo(() => {
    const entries: Array<[string, string, [number, number]]> = [
      ["premium-lots", "PREMIUM LOTS", [700, 300]],
      ["primary-lots", "PRIMARY LOTS", [692, 756]],
      ["garden-lots", "GARDEN LOTS", [692, 952]],
      ["garden-niches", "GARDEN NICHES", [410, 1070]],
      ["future-development", "FUTURE DEVELOPMENT", [983, 1040]],
      ["mausoleum", "MAUSOLEUM", [650, 660]],
    ];
    return entries.map(([id, label, [px, py]]) => {
      const w = pxToWorld(px, py);
      return { id, label, x: w.x, z: w.z };
    });
  }, []);

  if (!visible) return null;

  return (
    <group name="section-labels">
      {places.map((place) => (
        <Html
          key={place.id}
          position={[place.x, 0.5, place.z]}
          center
          zIndexRange={[5, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="park3d-plate">{place.label}</span>
        </Html>
      ))}
    </group>
  );
}
