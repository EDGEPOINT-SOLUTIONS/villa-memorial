/**
 * park-3d/flight.ts — the drone-flight envelope (spec §3a.4, captain 2026-09-16).
 *
 * Movement in the 3D park is DRONE FLIGHT, not walking: free flight over and
 * through the park with smooth, calm acceleration, rise/descend and gentle speed
 * control. There is no pedestrian model, no head-bob and no footsteps anywhere in
 * the codebase — this module is the movement math that replaces them.
 *
 * Everything here is pure so the envelope can be unit-tested without WebGL: the
 * camera rig supplies the site-boundary predicate (the masterplan's traced
 * outline, plus the one solid volume the drone must not fly *through*), and this
 * module says where the drone may actually go.
 *
 * The envelope is deliberately simple — a calm architectural flyover, never a
 * shooter-style freecam: a floor and a ceiling, a speed range, and one soft
 * constraint (stay inside the property).
 */

/** Flight envelope. Every number is a chosen parameter, configurable here only. */
export const FLIGHT = {
  /** Floor: low enough to read a lot's marker, never through the ground. */
  minAltitudeM: 1.2,
  /** Ceiling: well above the tallest structure, below the sky dome. */
  maxAltitudeM: 140,
  minSpeedMps: 1.5,
  maxSpeedMps: 14,
  /** The speed the settings slider starts at: a calm survey pace. */
  defaultSpeedMps: 4.2,
  /** Where a flight starts and where POI travel settles (metres above ground). */
  cruiseAltitudeM: 2.4,
  /** Vertical speed as a fraction of forward speed — gentle, never a lift-off. */
  verticalFactor: 0.6,
  /** Velocity easing rate (1/s): higher reaches the target speed sooner. */
  acceleration: 5.5,
} as const;

export type Vec3 = { x: number; y: number; z: number };

/** Keep an altitude inside the flight envelope. */
export function clampAltitude(y: number): number {
  return Math.min(FLIGHT.maxAltitudeM, Math.max(FLIGHT.minAltitudeM, y));
}

/** Keep a speed inside the flight envelope (used by the settings slider). */
export function clampSpeed(speed: number): number {
  return Math.min(FLIGHT.maxSpeedMps, Math.max(FLIGHT.minSpeedMps, speed));
}

/**
 * Vertical speed for a forward speed: gentler than the horizontal rate, so
 * rising and descending feel deliberate rather than elevator-like.
 */
export function verticalSpeed(speed: number): number {
  return Math.max(0.8, speed * FLIGHT.verticalFactor);
}

export type FlightStep = {
  /** Where the drone ends up. */
  position: Vec3;
  /** True when the site boundary refused the full step (the drone slid instead). */
  blocked: boolean;
};

/**
 * Move a drone by `step` from `from`, with the site boundary as a soft wall:
 * a full step that would leave the property is reduced to the axis components
 * that stay inside (sliding along the boundary), and only a step that would leave
 * on both axes is refused.
 *
 * `inside` is the caller's predicate for "this XZ point is over the park" — the
 * traced site outline, minus any volume the drone must not fly through at its
 * current altitude. Keeping it a callback means this module stays pure and the
 * geometry stays in masterplan.ts.
 */
export function stepFlight(
  from: Vec3,
  step: Vec3,
  inside: (x: number, z: number) => boolean,
): FlightStep {
  const wanted: Vec3 = {
    x: from.x + step.x,
    y: clampAltitude(from.y + step.y),
    z: from.z + step.z,
  };
  if (inside(wanted.x, wanted.z)) return { position: wanted, blocked: false };

  const alongX: Vec3 = { x: from.x + step.x, y: wanted.y, z: from.z };
  if (inside(alongX.x, alongX.z)) return { position: alongX, blocked: true };

  const alongZ: Vec3 = { x: from.x, y: wanted.y, z: from.z + step.z };
  if (inside(alongZ.x, alongZ.z)) return { position: alongZ, blocked: true };

  return { position: { x: from.x, y: wanted.y, z: from.z }, blocked: true };
}
