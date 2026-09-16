import { describe, expect, it } from "vitest";
import { FLIGHT, clampAltitude, clampSpeed, stepFlight, verticalSpeed } from "@/lib/park-3d/flight";

/**
 * The drone envelope (spec §3a.4, captain 2026-09-16).
 *
 * Movement is flight, not walking: these tests pin the altitude envelope, the
 * gentle vertical rate, and the soft site boundary (a step that would leave the
 * property slides along it instead of a shooter-style hard stop).
 */

/** A 100 × 100 m square park centred on the origin, for the boundary tests. */
const insideSquare = (x: number, z: number) => Math.abs(x) <= 50 && Math.abs(z) <= 50;

describe("the flight envelope", () => {
  it("keeps the drone between the floor and the ceiling", () => {
    expect(clampAltitude(0)).toBe(FLIGHT.minAltitudeM);
    expect(clampAltitude(-40)).toBe(FLIGHT.minAltitudeM);
    expect(clampAltitude(1e6)).toBe(FLIGHT.maxAltitudeM);
    expect(clampAltitude(12)).toBe(12);
  });

  it("keeps the speed slider inside the published range", () => {
    expect(clampSpeed(0)).toBe(FLIGHT.minSpeedMps);
    expect(clampSpeed(999)).toBe(FLIGHT.maxSpeedMps);
    expect(clampSpeed(FLIGHT.defaultSpeedMps)).toBe(FLIGHT.defaultSpeedMps);
  });

  it("rises and descends more gently than it flies forward", () => {
    expect(verticalSpeed(10)).toBeLessThan(10);
    expect(verticalSpeed(0)).toBeGreaterThan(0); // never a dead stick
  });
});

describe("flying inside the park", () => {
  it("takes a free step, including altitude changes", () => {
    const { position, blocked } = stepFlight({ x: 0, y: 10, z: 0 }, { x: 2, y: 1, z: -3 }, insideSquare);
    expect(position).toEqual({ x: 2, y: 11, z: -3 });
    expect(blocked).toBe(false);
  });

  it("clamps a step that would climb through the ceiling", () => {
    const { position } = stepFlight(
      { x: 0, y: FLIGHT.maxAltitudeM - 1, z: 0 },
      { x: 0, y: 50, z: 0 },
      insideSquare,
    );
    expect(position.y).toBe(FLIGHT.maxAltitudeM);
  });

  it("clamps a step that would sink through the floor", () => {
    const { position } = stepFlight(
      { x: 0, y: FLIGHT.minAltitudeM + 0.5, z: 0 },
      { x: 0, y: -20, z: 0 },
      insideSquare,
    );
    expect(position.y).toBe(FLIGHT.minAltitudeM);
  });

  it("slides along the boundary instead of leaving the property", () => {
    // Flying north-east at the north edge: the north axis is refused, the east
    // one still moves — the drone grazes the boundary rather than stopping dead.
    const { position, blocked } = stepFlight({ x: 40, y: 20, z: 49 }, { x: 4, y: 0, z: 4 }, insideSquare);
    expect(blocked).toBe(true);
    expect(position).toEqual({ x: 44, y: 20, z: 49 });
  });

  it("refuses a step that would leave on both axes, but still allows altitude", () => {
    const { position, blocked } = stepFlight({ x: 49, y: 20, z: 49 }, { x: 5, y: -2, z: 5 }, insideSquare);
    expect(blocked).toBe(true);
    expect(position).toEqual({ x: 49, y: 18, z: 49 });
  });

  it("treats the boundary as a wall for every altitude the drone may occupy", () => {
    for (const y of [FLIGHT.minAltitudeM, 30, FLIGHT.maxAltitudeM]) {
      const { position } = stepFlight({ x: 0, y, z: 49 }, { x: 0, y: 0, z: 10 }, insideSquare);
      expect(position.z).toBe(49);
    }
  });
});
