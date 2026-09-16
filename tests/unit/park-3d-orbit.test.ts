import { describe, expect, it } from "vitest";
import { imageToWorld } from "@/lib/park-3d/coords";
import {
  SITE_BOUNDS_WORLD,
  SITE_CENTRE_WORLD,
  SITE_RADIUS_M,
} from "@/lib/park-3d/masterplan";
import {
  ORBIT,
  clampDistance,
  clampPolar,
  clampTargetToBounds,
  frameDistance,
  framePose,
  poseFromSpherical,
  poseStaysAboveGround,
  sphericalFromPose,
  worldBoundsOfAreas,
  zoomDistance,
  type Pose,
} from "@/lib/park-3d/orbit";
import { squareOutline } from "@/lib/park-3d/plot-geometry";
import type { PlotArea } from "@/lib/park-maps";

/**
 * The orbit camera's envelope (captain, 2026-09-17 — Blender-style navigation:
 * zoom in, zoom out, rotate, select a plot, frame it).
 *
 * These tests pin what a LEGAL camera pose is: the distance/angle envelope, the
 * "never underground" rule, and the framing math that selection and the section
 * navigation both go through. The gestures themselves live in the rig
 * (OrbitControls); the numbers they must respect live here.
 */

function plot(id: string, x: number, y: number, size = 2): PlotArea {
  return {
    id,
    code: id.toUpperCase(),
    lot_id: null,
    status: "available",
    outline: squareOutline(x, y, size),
  };
}

const VIEW = { fovDeg: 60, aspect: 16 / 9 };

describe("the zoom envelope", () => {
  it("keeps the camera between the near and far limits", () => {
    expect(clampDistance(0)).toBe(ORBIT.minDistanceM);
    expect(clampDistance(-40)).toBe(ORBIT.minDistanceM);
    expect(clampDistance(1e6)).toBe(ORBIT.maxDistanceM);
    expect(clampDistance(120)).toBe(120);
  });

  it("steps a zoom without ever leaving the envelope", () => {
    const closer = zoomDistance(ORBIT.minDistanceM, 1 - ORBIT.zoomStep);
    expect(closer).toBe(ORBIT.minDistanceM); // already closest — no overshoot
    const further = zoomDistance(ORBIT.maxDistanceM, 2);
    expect(further).toBe(ORBIT.maxDistanceM);
    expect(zoomDistance(100, 1 - ORBIT.zoomStep)).toBeLessThan(100);
  });

  it("keeps the polar angle inside the orbit envelope", () => {
    expect(clampPolar(-1)).toBe(ORBIT.minPolarAngle);
    expect(clampPolar(Math.PI)).toBe(ORBIT.maxPolarAngle);
    expect(clampPolar(0.6)).toBe(0.6);
  });
});

describe("the focus point stays near the park", () => {
  it("clamps a pan to the site frame plus its margin", () => {
    const far = clampTargetToBounds({ x: 1e5, y: 0, z: -1e5 }, SITE_BOUNDS_WORLD);
    expect(far.x).toBe(SITE_BOUNDS_WORLD.maxX + ORBIT.panMarginM);
    expect(far.z).toBe(SITE_BOUNDS_WORLD.minZ - ORBIT.panMarginM);
  });

  it("leaves a focus point inside the park untouched", () => {
    const inside = { x: SITE_CENTRE_WORLD.x, y: 1, z: SITE_CENTRE_WORLD.z };
    expect(clampTargetToBounds(inside, SITE_BOUNDS_WORLD)).toEqual({ x: inside.x, z: inside.z });
  });
});

describe("spherical poses round-trip", () => {
  it("recovers the angles a camera position implies", () => {
    const target = { x: 10, y: 1.1, z: -4 };
    const position = poseFromSpherical(target, 0.8, 0.7, 140);
    const angles = sphericalFromPose(position, target);
    expect(angles.azimuth).toBeCloseTo(0.8, 9);
    expect(angles.polar).toBeCloseTo(0.7, 9);
    expect(angles.distance).toBeCloseTo(140, 6);
  });

  it("falls back to the calm default view when the camera sits on its target", () => {
    const origin = { x: 0, y: 0, z: 0 };
    const angles = sphericalFromPose(origin, origin);
    expect(angles.polar).toBe(ORBIT.defaultPolar);
    expect(angles.azimuth).toBe(ORBIT.defaultAzimuth);
  });
});

describe("the camera never goes underground", () => {
  it("holds a positive height at every legal polar angle", () => {
    for (const polar of [ORBIT.minPolarAngle, 0.5, 1.2, ORBIT.maxPolarAngle]) {
      for (const distance of [ORBIT.minDistanceM, 40, ORBIT.maxDistanceM]) {
        const position = poseFromSpherical({ x: 0, y: 0, z: 0 }, 0.3, polar, distance);
        expect(position.y).toBeGreaterThan(0);
      }
    }
    expect(
      poseStaysAboveGround({
        position: { x: 1, y: ORBIT.minCameraHeightM, z: 1 },
        target: { x: 0, y: 0, z: 0 },
      }),
    ).toBe(true);
  });
});

describe("framing a plot or a section", () => {
  it("takes the world bounds of the plots it is given", () => {
    const bounds = worldBoundsOfAreas([plot("a-001", 50, 37.5, 2)])!;
    const centre = imageToWorld(50, 37.5);
    expect(bounds.centre.x).toBeCloseTo(centre.x, 6);
    expect(bounds.centre.z).toBeCloseTo(centre.z, 6);
    expect(bounds.radius).toBeGreaterThanOrEqual(ORBIT.minFrameRadiusM);
  });

  it("grows the radius across a spread of plots and returns null with nothing to frame", () => {
    const one = worldBoundsOfAreas([plot("a-001", 20, 20, 2)])!;
    const many = worldBoundsOfAreas([plot("a-001", 20, 20, 2), plot("a-002", 70, 55, 2)])!;
    expect(many.radius).toBeGreaterThan(one.radius);
    expect(worldBoundsOfAreas([])).toBeNull();
    expect(worldBoundsOfAreas([{ id: "x", code: "X", lot_id: null, status: "available" }])).toBeNull();
  });

  it("fits a radius into the smaller half-angle of the viewport", () => {
    const wide = frameDistance(90, 60, 16 / 9);
    const tall = frameDistance(90, 60, 0.6);
    expect(tall).toBeGreaterThan(wide); // a narrow window must stand further back
    expect(frameDistance(90, 60, 16 / 9)).toBeLessThan(frameDistance(180, 60, 16 / 9));
    expect(frameDistance(1, 60, 16 / 9)).toBeGreaterThanOrEqual(ORBIT.minDistanceM);
  });

  it("puts the focused thing in the middle and dollies along the current view", () => {
    const bounds = worldBoundsOfAreas([plot("a-001", 40, 30, 3)])!;
    const current: Pose = {
      position: { x: 220, y: 90, z: 40 },
      target: { x: 0, y: 1.1, z: 0 },
    };
    const before = sphericalFromPose(current.position, current.target);
    const pose = framePose(bounds, current, VIEW);
    expect(pose.target).toEqual({
      x: bounds.centre.x,
      y: ORBIT.frameTargetHeightM,
      z: bounds.centre.z,
    });
    const after = sphericalFromPose(pose.position, pose.target);
    // Same bearing, different distance: a dolly + slide, never a swing to a canned angle.
    expect(after.azimuth).toBeCloseTo(before.azimuth, 6);
    expect(after.polar).toBeCloseTo(before.polar, 6);
    expect(after.distance).toBeLessThan(before.distance);
    expect(poseStaysAboveGround(pose)).toBe(true);
  });

  it("frames everything above the ground, even from a degenerate current pose", () => {
    const bounds = worldBoundsOfAreas([plot("a-001", 50, 37.5, 2)])!;
    const pose = framePose(bounds, { position: bounds.centre, target: bounds.centre }, VIEW);
    expect(pose.position.y).toBeGreaterThanOrEqual(ORBIT.minCameraHeightM);
    expect(sphericalFromPose(pose.position, pose.target).distance).toBeGreaterThanOrEqual(
      ORBIT.minDistanceM,
    );
  });

  it("gives the masterplan view a top-down angle", () => {
    const pose = framePose(
      { centre: { x: SITE_CENTRE_WORLD.x, y: 0, z: SITE_CENTRE_WORLD.z }, radius: SITE_RADIUS_M },
      { position: { x: 200, y: 30, z: 200 }, target: { x: 0, y: 1, z: 0 } },
      VIEW,
      { topDown: true },
    );
    const angles = sphericalFromPose(pose.position, pose.target);
    expect(angles.polar).toBeCloseTo(ORBIT.minPolarAngle, 9);
    expect(poseStaysAboveGround(pose)).toBe(true);
  });

  it("frames the real park from a distance inside the envelope", () => {
    const pose = framePose(
      { centre: { x: SITE_CENTRE_WORLD.x, y: 0, z: SITE_CENTRE_WORLD.z }, radius: SITE_RADIUS_M },
      null,
      VIEW,
    );
    const angles = sphericalFromPose(pose.position, pose.target);
    expect(angles.distance).toBeGreaterThan(SITE_RADIUS_M);
    expect(angles.distance).toBeLessThanOrEqual(ORBIT.maxDistanceM);
    expect(poseStaysAboveGround(pose)).toBe(true);
  });
});
