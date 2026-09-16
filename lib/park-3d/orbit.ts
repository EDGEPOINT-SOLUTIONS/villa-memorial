/**
 * park-3d/orbit.ts — the park's navigation envelope and framing math.
 *
 * The 3D park is navigated the way a 3D authoring tool is (captain, 2026-09-17:
 * "just make the movement just like in blender — zoom-in, zoom-out, rotate, select
 * plot, reserve plot"): the camera ORBITS a focus point, zooms toward it and pans
 * it across the ground. There is no free-flying walk and no pointer lock anywhere
 * in this module or the rig that uses it.
 *
 * Everything here is pure — no three.js, no DOM — so the envelope can be
 * unit-tested without WebGL: the rig owns the gestures (OrbitControls) and the
 * animation clock, this module says what a legal pose is and where the camera
 * should sit to frame something.
 *
 * Two rules the geometry must never break:
 *  · the camera stays ABOVE the ground (a positive height at every legal polar
 *    angle — the park is a burial ground, not a clipping plane);
 *  · the focus point stays NEAR the park, so panning cannot strand the visitor in
 *    an empty world with no landmark in sight.
 *
 * Framing is deliberately expressed as "what is being framed" (a world centre and
 * a radius) rather than a fixed camera pose: the rig dollies in along the CURRENT
 * viewing direction, which is what makes selection framing read as a calm move
 * instead of a teleport to a canned angle.
 */
import { plotWorldTransform } from "@/lib/park-3d/plot-geometry";
import type { PlotArea } from "@/lib/park-maps";

export type Vec3 = { x: number; y: number; z: number };
export type Bounds2 = { minX: number; maxX: number; minZ: number; maxZ: number };

/** The navigation envelope. Every value is a chosen parameter, configurable here only. */
export const ORBIT = {
  /** Closest the camera may come to the focus point (metres). */
  minDistanceM: 5,
  /** Furthest: enough to see the whole property and its setting, never the horizon. */
  maxDistanceM: 620,
  /**
   * Polar limits (radians from +Y). The lower bound keeps the view from flipping
   * over the top; the upper bound keeps the camera above the focus plane.
   */
  minPolarAngle: 0.09,
  maxPolarAngle: Math.PI / 2 - 0.05,
  /** Never let the camera (or its near plane) dip below this height above ground. */
  minCameraHeightM: 1.5,
  /** Inertia: higher settles sooner. Matches the rig's `dampingFactor`. */
  dampingFactor: 0.075,
  /** Default pointer feel; the Settings panel scales these. */
  rotateSpeed: 0.55,
  zoomSpeed: 0.8,
  panSpeed: 0.6,
  /** One press of the ± controls changes this fraction of the current distance. */
  zoomStep: 0.18,
  /** Seconds for the two kinds of camera move (never a teleport). */
  frameSeconds: 1.1,
  zoomSeconds: 0.22,
  /** The focus point may pan this far (metres) beyond the site frame. */
  panMarginM: 80,
  /** Auto-orbit: a slow, calm drift (OrbitControls' own unit — 2 ≈ 30 s per turn). */
  autoOrbitSpeed: 0.5,
  /** How much of the viewport framed bounds should fill. */
  frameFill: 0.78,
  /** Even a single plot is framed from at least this radius, so it has context. */
  minFrameRadiusM: 6,
  /** Points of interest with no plot cluster of their own are framed at this radius. */
  poiFrameRadiusM: 26,
  /** Where the framed focus point sits above the ground. */
  frameTargetHeightM: 1.1,
  /** The opening view: a calm three-quarter look from the entrance side. */
  defaultPolar: 0.72,
  defaultAzimuth: 0,
} as const;

/** A camera pose: where it is and what it orbits. */
export type Pose = { position: Vec3; target: Vec3 };

/** Keep a distance inside the zoom envelope. */
export function clampDistance(distance: number): number {
  if (!Number.isFinite(distance)) return ORBIT.minDistanceM;
  return Math.min(ORBIT.maxDistanceM, Math.max(ORBIT.minDistanceM, distance));
}

/** Keep a polar angle inside the orbit envelope (never over the top, never underground). */
export function clampPolar(polar: number): number {
  return Math.min(ORBIT.maxPolarAngle, Math.max(ORBIT.minPolarAngle, polar));
}

/** One zoom step: a distance multiplied by `factor`, clamped to the envelope. */
export function zoomDistance(distance: number, factor: number): number {
  return clampDistance(distance * factor);
}

/**
 * Keep the focus point near the park. `margin` widens the allowed frame so the
 * visitor can look at the park's edge from outside, not pan into the void.
 */
export function clampTargetToBounds(
  target: Vec3,
  bounds: Bounds2,
  margin = ORBIT.panMarginM,
): { x: number; z: number } {
  return {
    x: Math.min(bounds.maxX + margin, Math.max(bounds.minX - margin, target.x)),
    z: Math.min(bounds.maxZ + margin, Math.max(bounds.minZ - margin, target.z)),
  };
}

/** Camera position for a focus point + spherical angles (three.js' own formula). */
export function poseFromSpherical(
  target: Vec3,
  azimuth: number,
  polar: number,
  distance: number,
): Vec3 {
  const radius = clampDistance(distance);
  const phi = clampPolar(polar);
  return {
    x: target.x + radius * Math.sin(phi) * Math.sin(azimuth),
    y: target.y + radius * Math.cos(phi),
    z: target.z + radius * Math.sin(phi) * Math.cos(azimuth),
  };
}

/** The spherical angles a camera position implies around a focus point. */
export function sphericalFromPose(
  position: Vec3,
  target: Vec3,
): { azimuth: number; polar: number; distance: number } {
  const dx = position.x - target.x;
  const dy = position.y - target.y;
  const dz = position.z - target.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance < 1e-6) {
    return { azimuth: ORBIT.defaultAzimuth, polar: ORBIT.defaultPolar, distance: clampDistance(0) };
  }
  return {
    azimuth: Math.atan2(dx, dz),
    polar: clampPolar(Math.acos(Math.min(1, Math.max(-1, dy / distance)))),
    distance: clampDistance(distance),
  };
}

/**
 * Distance at which a sphere of `radius` metres fits the smaller half-angle of the
 * viewport (so a wide or a tall window both fit the thing being framed).
 */
export function frameDistance(radius: number, fovDeg: number, aspect: number): number {
  const safeRadius = Math.max(ORBIT.minFrameRadiusM, radius);
  const verticalHalf = (Math.max(10, Math.min(120, fovDeg)) * Math.PI) / 360;
  const horizontalHalf = Math.atan(Math.tan(verticalHalf) * Math.max(0.2, aspect));
  const half = Math.min(verticalHalf, horizontalHalf);
  return clampDistance(safeRadius / (Math.sin(half) * ORBIT.frameFill));
}

/** What is being framed: a world centre and the radius that must fit in view. */
export type FrameBounds = {
  centre: Vec3;
  radius: number;
};

/** A framed world region around one or more plots (radius = half the diagonal). */
export function worldBoundsOfAreas(areas: readonly PlotArea[]): FrameBounds | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const area of areas) {
    const xform = plotWorldTransform(area, 0);
    if (!xform) continue;
    const halfWidth = xform.radius ?? xform.width / 2;
    const halfDepth = xform.radius ?? xform.depth / 2;
    minX = Math.min(minX, xform.x - halfWidth);
    maxX = Math.max(maxX, xform.x + halfWidth);
    minZ = Math.min(minZ, xform.z - halfDepth);
    maxZ = Math.max(maxZ, xform.z + halfDepth);
  }
  if (!Number.isFinite(minX)) return null;
  const radius = Math.hypot(maxX - minX, maxZ - minZ) / 2;
  return {
    centre: { x: (minX + maxX) / 2, y: 0, z: (minZ + maxZ) / 2 },
    radius: Math.max(ORBIT.minFrameRadiusM, radius),
  };
}

/**
 * Where the camera should sit to frame `bounds`.
 *
 * The azimuth/polar of the CURRENT view are kept (a dolly + slide, not a swing to
 * a canned angle) unless `topDown` asks for the masterplan's plan view or there is
 * no current view at all — then the calm default three-quarter view is used. The
 * returned position is always inside the distance envelope and above the ground.
 */
export function framePose(
  bounds: FrameBounds,
  current: Pose | null,
  view: { fovDeg: number; aspect: number },
  options: { topDown?: boolean } = {},
): Pose {
  const target: Vec3 = {
    x: bounds.centre.x,
    y: ORBIT.frameTargetHeightM,
    z: bounds.centre.z,
  };
  const distance = frameDistance(bounds.radius, view.fovDeg, view.aspect);

  let azimuth: number = ORBIT.defaultAzimuth;
  let polar: number = ORBIT.defaultPolar;
  if (options.topDown) {
    azimuth = ORBIT.defaultAzimuth;
    polar = ORBIT.minPolarAngle;
  } else if (current) {
    const angles = sphericalFromPose(current.position, current.target);
    azimuth = angles.azimuth;
    polar = angles.polar;
  }

  const position = poseFromSpherical(target, azimuth, polar, distance);
  return {
    position: { x: position.x, y: Math.max(ORBIT.minCameraHeightM, position.y), z: position.z },
    target,
  };
}

/** True when a pose keeps the camera above the ground plane. */
export function poseStaysAboveGround(pose: Pose): boolean {
  return pose.position.y >= ORBIT.minCameraHeightM;
}
