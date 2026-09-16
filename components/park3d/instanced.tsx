"use client";

/**
 * park3d/instanced.tsx — a tiny instanced-mesh helper. Every repeated 3D element
 * (plots, trees, shrubs, parking bays) renders as ONE mesh with N instances, not
 * N meshes: the object count stays flat as the blockout grows.
 */
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

export type InstanceSpec = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  /** Rotation about Y, radians. */
  ry?: number;
};

export function InstancedGroup({
  items,
  geometry,
  color,
  name,
  castShadow = true,
  receiveShadow = true,
  roughness = 0.9,
  flatShading = false,
}: {
  items: readonly InstanceSpec[];
  geometry: THREE.BufferGeometry;
  color: string;
  name: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
  roughness?: number;
  flatShading?: boolean;
}) {
  const mesh = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness: 0,
      flatShading,
    });
    const instanced = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
    instanced.castShadow = castShadow;
    instanced.receiveShadow = receiveShadow;
    instanced.name = name;
    return instanced;
  }, [geometry, color, items.length, name, castShadow, receiveShadow, roughness, flatShading]);

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const axis = new THREE.Vector3(0, 1, 0);
    items.forEach((item, index) => {
      position.set(item.x, item.y, item.z);
      scale.set(item.sx, item.sy, item.sz);
      quaternion.setFromAxisAngle(axis, item.ry ?? 0);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [mesh, items]);

  useEffect(
    () => () => {
      (mesh.material as THREE.Material).dispose();
    },
    [mesh],
  );

  return <primitive object={mesh} />;
}
