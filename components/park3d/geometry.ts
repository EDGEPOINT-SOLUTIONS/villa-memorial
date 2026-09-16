/**
 * park3d/geometry.ts — small, dependency-light mesh builders for the blockout:
 * ribbons (roads, paths), flat polygon fills (sections, boundary) and flat
 * rings/lines. Everything takes WORLD XZ points and returns three.js geometry,
 * oriented for a mesh rotated -90° about X (so shape-y maps to world -z).
 */
import * as THREE from "three";

export type XZ = { x: number; z: number } | readonly [number, number];

function xz(p: XZ): [number, number] {
  return Array.isArray(p) ? [p[0], p[1]] : [(p as { x: number }).x, (p as { z: number }).z];
}

/**
 * An extruded ribbon along a polyline centreline — used for roads, walking paths
 * and driveways. Corners are mitred by averaging the adjacent segment normals,
 * which is plenty for a park's gentle curves.
 */
export function ribbonGeometry(
  points: ReadonlyArray<XZ>,
  width: number,
  closed = false,
): THREE.BufferGeometry {
  const pts = points.map(xz);
  if (closed && pts.length > 1) pts.push(pts[0]);
  const half = width / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const normals: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next[0] - prev[0];
    let dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    normals.push([-dz, dx]);
  }

  for (let i = 0; i < pts.length; i++) {
    const [x, z] = pts[i];
    const [nx, nz] = normals[i];
    positions.push(x + nx * half, 0, z + nz * half);
    positions.push(x - nx * half, 0, z - nz * half);
    uvs.push(0, i * 0.25, 1, i * 0.25);
  }
  // Winding order is CCW seen from ABOVE so `computeVertexNormals` yields +Y:
  // a flat ground ribbon must render to a camera above the park, not only to one
  // underneath it (the default FrontSide material culls the other face).
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** A flat filled polygon in world XZ, ready for a mesh with rotation.x = -PI/2. */
export function polygonShape(points: ReadonlyArray<XZ>): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach((p, i) => {
    const [x, z] = xz(p);
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}

/** A flat rectangular fill from centre + size (world metres). */
export function rectShape(cx: number, cz: number, width: number, depth: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  shape.moveTo(cx - hw, -(cz - hd));
  shape.lineTo(cx + hw, -(cz - hd));
  shape.lineTo(cx + hw, -(cz + hd));
  shape.lineTo(cx - hw, -(cz + hd));
  shape.closePath();
  return shape;
}

/** A closed outline as a line-loop geometry (world XZ, y = 0). */
export function loopGeometry(
  points: ReadonlyArray<XZ>,
  y = 0,
  closed = true,
): THREE.BufferGeometry {
  const flat: number[] = [];
  for (const p of points) {
    const [x, z] = xz(p);
    flat.push(x, y, z);
  }
  if (closed && points.length > 0) {
    const [x, z] = xz(points[0]);
    flat.push(x, y, z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(flat, 3));
  return geo;
}

/** Closed outline as segment pairs — renders with `<lineSegments>` (no SVG tag clash). */
export function segmentsGeometry(
  points: ReadonlyArray<XZ>,
  y = 0,
  closed = true,
): THREE.BufferGeometry {
  const pts = points.map(xz);
  const flat: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    flat.push(pts[i][0], y, pts[i][1], pts[i + 1][0], y, pts[i + 1][1]);
  }
  if (closed && pts.length > 1) {
    const last = pts[pts.length - 1];
    flat.push(last[0], y, last[1], pts[0][0], y, pts[0][1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(flat, 3));
  return geo;
}

/** Axis-aligned quad (ground surface) from two opposite world corners. */
export function quadGeometry(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y = 0,
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  // Winding order is CCW seen from ABOVE so the plate's normal is +Y: the
  // surroundings must be visible to a camera over the park (FrontSide culls the
  // downward face), and `computeVertexNormals` must light it as ground, not as
  // an underside.
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0],
      3,
    ),
  );
  geo.computeVertexNormals();
  return geo;
}

/** A flat rectangular FRAME (outline) in world XZ, ready for rotation.x = -PI/2. */
export function frameShape(
  cx: number,
  cz: number,
  width: number,
  depth: number,
  thickness: number,
): THREE.Shape {
  const hw = width / 2;
  const hd = depth / 2;
  const shape = new THREE.Shape([
    new THREE.Vector2(cx - hw, -(cz - hd)),
    new THREE.Vector2(cx + hw, -(cz - hd)),
    new THREE.Vector2(cx + hw, -(cz + hd)),
    new THREE.Vector2(cx - hw, -(cz + hd)),
  ]);
  const ihw = Math.max(0.05, hw - thickness);
  const ihd = Math.max(0.05, hd - thickness);
  shape.holes.push(
    new THREE.Path([
      new THREE.Vector2(cx - ihw, -(cz - ihd)),
      new THREE.Vector2(cx + ihw, -(cz - ihd)),
      new THREE.Vector2(cx + ihw, -(cz + ihd)),
      new THREE.Vector2(cx - ihw, -(cz + ihd)),
    ]),
  );
  return shape;
}

/** Deterministic PRNG — vegetation and details must not shuffle between renders. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Point-in-polygon (ray casting) for world XZ — used for containment checks. */
export function pointInPolygon(x: number, z: number, poly: ReadonlyArray<XZ>): boolean {
  let inside = false;
  const pts = poly.map(xz);
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i];
    const [xj, zj] = pts[j];
    const intersects = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a polyline (world XZ). */
export function distanceToPolyline(
  x: number,
  z: number,
  line: ReadonlyArray<XZ>,
): number {
  const pts = line.map(xz);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return best;
}

/** Distance to a circle outline (a garden disc's ring path). */
export function distanceToRing(x: number, z: number, cx: number, cz: number, r: number): number {
  return Math.abs(Math.hypot(x - cx, z - cz) - r);
}
