"use client";

/**
 * park3d/plots-3d.tsx — the plots as REAL 3D objects.
 *
 *  · every plot in the shared store is an instanced slab at its true position
 *    (derived from the same image-space coordinates the 2D masterplan draws);
 *  · picking is real raycasting against those meshes (`instanceId` → plot) —
 *    never an HTML hotspot over a picture;
 *  · hover and selection are a soft frame + a quiet name tag;
 *  · PLACE and MOVE write image-space coordinates straight back into the shared
 *    store, so the 2D mode (and the staff editor) show the change immediately.
 *    They are ADMIN ONLY (spec §3): `canPlot` comes from the viewer's scopes, and
 *    a customer's 3D world cannot create, move or delete a plot at all.
 *
 *  · `visibleCodes` carries the in-experience explorer panel's search/filter
 *    result: only those plots render (and only they can be picked), while the
 *    WRITE path always works against the full inventory — hiding a plot must
 *    never delete it.
 */
import { Html } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { frameShape, pointInPolygon } from "@/components/park3d/geometry";
import { plotStatusColor, token } from "@/components/park3d/palette";
import { SITE_BOUNDARY_WORLD } from "@/lib/park-3d/masterplan";
import {
  plotCentre,
  plotWorldTransform,
  squareOutline,
  translatePlotTo,
  worldToImageCentre,
  type PlotWorldXform,
} from "@/lib/park-3d/plot-geometry";
import { usePark3d } from "@/lib/park-3d/view-store";
import { nextAreaCode, type LegendEntry, type PlotArea } from "@/lib/park-maps";

const PLOT_HEIGHT_M = 0.14;
/** New plots drawn in 3D use the same default size the map editor's slider starts at. */
const DEFAULT_PLOT_SIZE_UNITS = 2;

type Group = { key: string; color: string; items: PlotWorldXform[] };

/** Slabs grouped by their legend type (or status when untyped): one draw call per colour. */
function groupSlabs(areas: PlotArea[]): { rects: Group[]; circles: Group[] } {
  const rectGroups = new Map<string, Group>();
  const circleGroups = new Map<string, Group>();
  for (const area of areas) {
    const xform = plotWorldTransform(area, PLOT_HEIGHT_M);
    if (!xform) continue;
    const key = area.typeId ? `type:${area.typeId}` : `status:${area.status}`;
    const bucket = xform.radius === null ? rectGroups : circleGroups;
    const group = bucket.get(key) ?? { key, color: token("--scene-plot-available"), items: [] };
    group.items.push(xform);
    bucket.set(key, group);
  }
  return { rects: [...rectGroups.values()], circles: [...circleGroups.values()] };
}

/** One instanced mesh for a colour group. */
function PlotInstances({
  group,
  color,
  circular,
  name,
  onHover,
  onPick,
  onGrab,
}: {
  group: Group;
  color: string;
  circular: boolean;
  name: string;
  onHover?: (code: string | null) => void;
  onPick?: (code: string) => void;
  onGrab?: (code: string) => void;
}) {
  const mesh = useMemo(() => {
    const geometry = circular ? new THREE.CylinderGeometry(1, 1, 1, 20) : new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.92,
      metalness: 0.02,
    });
    const instanced = new THREE.InstancedMesh(geometry, material, Math.max(1, group.items.length));
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    instanced.name = name;
    return instanced;
  }, [group.items.length, color, circular, name]);

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    group.items.forEach((item, index) => {
      position.set(item.x, item.height / 2, item.z);
      if (circular) {
        const r = item.radius ?? 1;
        scale.set(r, item.height, r);
      } else {
        scale.set(item.width, item.height, item.depth);
      }
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.count = group.items.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [mesh, group.items, circular]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
    [mesh],
  );

  const indexOf = (event: ThreeEvent<PointerEvent | MouseEvent>) =>
    event.instanceId === undefined ? null : group.items[event.instanceId] ?? null;

  return (
    <primitive
      object={mesh}
      onPointerMove={(event: ThreeEvent<PointerEvent>) => {
        const item = indexOf(event);
        if (!item) return;
        event.stopPropagation();
        onHover?.(item.code);
      }}
      onPointerOut={() => onHover?.(null)}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        const item = indexOf(event);
        if (!item) return;
        event.stopPropagation();
        onPick?.(item.code);
      }}
      onPointerDown={(event: ThreeEvent<PointerEvent>) => {
        const item = indexOf(event);
        if (!item) return;
        onGrab?.(item.code);
      }}
    />
  );
}

/** The soft frame + name tag that marks the hovered, selected or dragged plot. */
function PlotMarker({ xform, selected }: { xform: PlotWorldXform; selected: boolean }) {
  const y = PLOT_HEIGHT_M + (selected ? 0.09 : 0.05);
  const thickness = selected ? 0.34 : 0.18;
  const frame = useMemo(
    () =>
      xform.radius === null
        ? frameShape(xform.x, xform.z, xform.width, xform.depth, thickness)
        : null,
    [xform, thickness],
  );

  return (
    <group>
      {xform.radius !== null ? (
        <mesh position={[xform.x, y, xform.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[Math.max(0.05, xform.radius - thickness), xform.radius + thickness * 0.4, 32]}
          />
          <meshBasicMaterial
            color={token("--scene-marker")}
            transparent
            opacity={selected ? 0.95 : 0.6}
          />
        </mesh>
      ) : frame ? (
        <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <shapeGeometry args={[frame]} />
          <meshBasicMaterial
            color={token("--scene-marker")}
            transparent
            opacity={selected ? 0.95 : 0.6}
          />
        </mesh>
      ) : null}
      {selected ? (
        <Html
          position={[xform.x, PLOT_HEIGHT_M + 2.4, xform.z]}
          center
          zIndexRange={[20, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="park3d-tag">{xform.code}</span>
        </Html>
      ) : null}
    </group>
  );
}

export function Plots3d({
  areas,
  visibleCodes,
  legendById,
  selectedCode,
  canPlot,
  onSelect,
  onChangeAreas,
}: {
  areas: PlotArea[];
  /** Codes the explorer panel leaves visible; `null` = no filter. */
  visibleCodes: ReadonlySet<string> | null;
  legendById: Record<string, LegendEntry>;
  selectedCode: string | null;
  canPlot: boolean;
  onSelect: (area: PlotArea) => void;
  onChangeAreas?: (areas: PlotArea[]) => void;
}) {
  const tool = usePark3d((s) => s.tool);
  const hoveredCode = usePark3d((s) => s.hoveredCode);
  const setHoveredCode = usePark3d((s) => s.setHoveredCode);
  const { camera, gl } = useThree();

  const [drag, setDrag] = useState<{ base: PlotArea; centre: { x: number; y: number } } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const areasRef = useRef(areas);
  areasRef.current = areas;

  const { rects, circles } = useMemo(() => {
    const shown = visibleCodes ? areas.filter((a) => visibleCodes.has(a.code)) : areas;
    return groupSlabs(shown);
  }, [areas, visibleCodes]);
  const colourOf = (key: string) =>
    key.startsWith("type:")
      ? legendById[key.slice(5)]?.color ?? token("--scene-plot-available")
      : plotStatusColor(key.slice(7) as PlotArea["status"]);

  const xforms = useMemo(() => {
    const map = new Map<string, PlotWorldXform>();
    for (const area of areas) {
      const xform = plotWorldTransform(area, PLOT_HEIGHT_M);
      if (xform) map.set(area.code, xform);
    }
    return map;
  }, [areas]);

  /** Client coordinates → world point on the ground plane (real raycast, not a guess). */
  const groundPoint = useMemo(() => {
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    return (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = new THREE.Vector3();
      return raycaster.ray.intersectPlane(plane, hit) ? hit : null;
    };
  }, [camera, gl]);

  /* --- PLACE: a ground click inside the park writes a new plot ------------ */
  useEffect(() => {
    if (!canPlot || !onChangeAreas || tool !== "place") return;
    const element = gl.domElement;
    const onClick = (event: MouseEvent) => {
      const point = groundPoint(event.clientX, event.clientY);
      if (!point) return;
      if (!pointInPolygon(point.x, point.z, SITE_BOUNDARY_WORLD)) return; // stay inside the property
      const centre = worldToImageCentre(point.x, point.z);
      const code = nextAreaCode(areasRef.current, "Villa Memorial");
      const candidate: PlotArea = {
        id: `villa-${code.toLowerCase()}`,
        code,
        lot_id: null,
        status: "available",
        outline: squareOutline(centre.x, centre.y, DEFAULT_PLOT_SIZE_UNITS),
      };
      onChangeAreas([...areasRef.current, candidate]);
      onSelect(candidate);
    };
    element.addEventListener("click", onClick);
    return () => element.removeEventListener("click", onClick);
  }, [canPlot, tool, gl, groundPoint, onChangeAreas, onSelect]);

  /* --- MOVE: drag a plot along the ground; commit on release -------------- */
  useEffect(() => {
    if (!canPlot || !onChangeAreas || !drag) return;
    const onMove = (event: PointerEvent) => {
      const point = groundPoint(event.clientX, event.clientY);
      if (!point) return;
      const centre = worldToImageCentre(point.x, point.z);
      setDrag((current) => (current ? { ...current, centre } : current));
    };
    const onUp = () => {
      const current = dragRef.current;
      if (current) {
        onChangeAreas(
          areasRef.current.map((a) =>
            a.id === current.base.id ? translatePlotTo(current.base, current.centre.x, current.centre.y) : a,
          ),
        );
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [canPlot, drag, groundPoint, onChangeAreas]);

  const selectByCode = (code: string) => {
    const area = areasRef.current.find((a) => a.code === code);
    if (area) onSelect(area);
  };

  const grabByCode = (code: string) => {
    if (!canPlot || tool !== "move") return;
    const area = areasRef.current.find((a) => a.code === code);
    const centre = area ? plotCentre(area) : null;
    if (area && centre) {
      setDrag({ base: area, centre });
      onSelect(area);
    }
  };

  const hovered = hoveredCode ? xforms.get(hoveredCode) : undefined;
  const selected = selectedCode ? xforms.get(selectedCode) : undefined;
  const dragXform = drag
    ? plotWorldTransform(translatePlotTo(drag.base, drag.centre.x, drag.centre.y), PLOT_HEIGHT_M)
    : null;
  const canPick = tool !== "place";

  return (
    <group>
      {/* Status studs: one small marker per plot, coloured by availability. */}
      {(["available", "reserved", "sold", "occupied", "maintenance"] as PlotArea["status"][]).map(
        (status) => {
          const items = areas
            .filter((a) => a.status === status)
            .map((a) => plotWorldTransform(a, 0.5))
            .filter((x): x is PlotWorldXform => x !== null)
            .map((x) => ({
              ...x,
              x: x.x,
              z: x.z,
              width: 0.3,
              depth: 0.3,
              radius: 0.15,
            }));
          if (items.length === 0) return null;
          return (
            <PlotInstances
              key={`stud-${status}`}
              group={{ key: `stud-${status}`, color: plotStatusColor(status), items }}
              color={plotStatusColor(status)}
              circular
              name={`plot-status-${status}`}
            />
          );
        },
      )}

      {rects.map((group) => (
        <PlotInstances
          key={group.key}
          group={group}
          color={colourOf(group.key)}
          circular={false}
          name={`plots-${group.key}`}
          onHover={canPick ? setHoveredCode : undefined}
          onPick={selectByCode}
          onGrab={grabByCode}
        />
      ))}
      {circles.map((group) => (
        <PlotInstances
          key={group.key}
          group={group}
          color={colourOf(group.key)}
          circular
          name={`plots-${group.key}`}
          onHover={canPick ? setHoveredCode : undefined}
          onPick={selectByCode}
          onGrab={grabByCode}
        />
      ))}

      {hovered && hovered.code !== selectedCode ? (
        <PlotMarker xform={hovered} selected={false} />
      ) : null}
      {selected ? <PlotMarker xform={selected} selected /> : null}
      {dragXform ? <PlotMarker xform={dragXform} selected /> : null}
    </group>
  );
}
