import { describe, expect, it } from "vitest";
import { quadGeometry, ribbonGeometry } from "@/components/park3d/geometry";

/**
 * Flat ground geometry must face UP.
 *
 * Every flat ribbon (roads, walking paths, drives) and the surroundings plate is
 * rendered with the default `FrontSide` material from a camera above the
 * park, so a clockwise-from-above winding makes the surface invisible (and lights
 * it as an underside) — the "white void around the park" defect. These tests pin
 * the +Y normal on straight, diagonal and curved centrelines, plus the quad.
 */

function assertUpFacing(normals: Float32Array | number[], label: string) {
  expect(normals.length).toBeGreaterThan(0);
  for (let i = 0; i < normals.length; i += 3) {
    expect(normals[i], `${label} x[${i}]`).toBeCloseTo(0, 6);
    expect(normals[i + 1], `${label} y[${i}]`).toBeGreaterThan(0.99);
    expect(normals[i + 2], `${label} z[${i}]`).toBeCloseTo(0, 6);
  }
}

describe("park 3D ground geometry faces up", () => {
  const centrelines: Array<[string, Array<[number, number]>]> = [
    ["straight", [[0, 0], [30, 0]]],
    ["diagonal", [[0, 0], [20, 20]]],
    ["reverse diagonal", [[0, 30], [30, 0]]],
    ["curve", [[0, 0], [10, 6], [24, 2], [30, -8]]],
  ];

  it.each(centrelines)("ribbon along a %s centreline", (label, line) => {
    const geometry = ribbonGeometry(line, 4);
    assertUpFacing(geometry.getAttribute("normal").array as Float32Array, label);
  });

  it("ribbon closes into a loop without flipping", () => {
    const ring: Array<[number, number]> = [
      [0, 0],
      [20, 0],
      [20, 20],
      [0, 20],
    ];
    const geometry = ribbonGeometry(ring, 3, true);
    assertUpFacing(geometry.getAttribute("normal").array as Float32Array, "closed ring");
  });

  it("the surroundings quad faces up", () => {
    const geometry = quadGeometry(-90, -84, 90, 89, 0);
    assertUpFacing(geometry.getAttribute("normal").array as Float32Array, "quad");
  });
});
