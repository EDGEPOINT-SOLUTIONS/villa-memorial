"use client";

/**
 * park3d/camera-rig.tsx — the park's navigation camera: a Blender-style orbit rig.
 *
 * Captain's direction (2026-09-17): the 3D map is navigated the way a 3D authoring
 * tool is, not the way a game is — the drone/free-flight camera this file used to
 * carry is gone.
 *
 *  · Orbit  — drag (one finger on touch) rotates around the focus point.
 *  · Zoom   — wheel, pinch, the ± controls, or the +/− keys; clamped to the
 *             envelope in `lib/park-3d/orbit.ts`.
 *  · Pan    — middle-drag, right-drag, Shift+drag, or two fingers on touch; moves
 *             the focus point across the ground.
 *  · Frame  — selecting a plot, choosing a section or a point of interest glides
 *             the camera onto it (dolly + slide along the CURRENT view direction),
 *             and "Frame the park" returns to the whole property. Never a teleport
 *             (except when the visitor asks for reduced motion, per spec §7).
 *
 * The envelope (distance, polar angle, ground clearance, where the focus point may
 * be) lives in `lib/park-3d/orbit.ts` as pure math with its own tests. This file is
 * the gesture wiring: OrbitControls does the gestures, and one frame callback
 * applies the envelope after the controls have run (r3f runs priority -1 first),
 * so the camera cannot be pushed under the ground or wound up on inertia it
 * cannot shed.
 *
 * The mode switch is the masterplan's starting angle, not a second camera: the
 * "overhead" mode settles the same orbit camera into a top-down view, and every
 * gesture keeps working there.
 */
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  ORBIT,
  clampDistance,
  clampTargetToBounds,
  framePose,
  poseFromSpherical,
  sphericalFromPose,
  type Pose,
} from "@/lib/park-3d/orbit";
import { SITE_BOUNDS_WORLD, SITE_CENTRE_WORLD, SITE_RADIUS_M } from "@/lib/park-3d/masterplan";
import { usePark3d, type CameraMode } from "@/lib/park-3d/view-store";

/** Seconds a move takes — never a teleport. */
const TRANSITION_SECONDS = ORBIT.frameSeconds;
const ZOOM_SECONDS = ORBIT.zoomSeconds;
/** Fallback fov if the canvas camera is not a perspective camera. */
const DEFAULT_FOV = 60;

type Pose3 = { position: THREE.Vector3; target: THREE.Vector3 };

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** The pose that frames the whole property — the opening view and the reset control. */
function parkFramePose(
  current: Pose | null,
  view: { fovDeg: number; aspect: number },
  topDown = false,
): Pose {
  return framePose(
    { centre: { x: SITE_CENTRE_WORLD.x, y: 0, z: SITE_CENTRE_WORLD.z }, radius: SITE_RADIUS_M },
    current,
    view,
    { topDown },
  );
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const mode = usePark3d((s) => s.cameraMode);
  const reducedMotion = usePark3d((s) => s.reducedMotion);
  const autoOrbit = usePark3d((s) => s.autoOrbit);
  const draggingPlot = usePark3d((s) => s.draggingPlot);
  const orbitSpeed = usePark3d((s) => s.orbitSpeed);
  const zoomSpeed = usePark3d((s) => s.zoomSpeed);
  const frame = usePark3d((s) => s.frame);
  const clearFrame = usePark3d((s) => s.clearFrame);
  const zoom = usePark3d((s) => s.zoom);
  const clearZoom = usePark3d((s) => s.clearZoom);

  const controls = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
  const transition = useRef<{ from: Pose3; to: Pose3; started: number; duration: number } | null>(
    null,
  );
  const zoomAnimation = useRef<{ from: number; to: number; started: number } | null>(null);
  const lastFrameSeq = useRef(0);
  const lastZoomSeq = useRef(0);
  const lastMode = useRef<CameraMode | null>(null);
  const orbitPose = useRef<Pose3 | null>(null);
  const seeded = useRef(false);
  const [transitioning, setTransitioning] = useState(false);

  const viewSpec = useCallback(
    () => ({
      fovDeg: camera.isPerspectiveCamera ? camera.fov : DEFAULT_FOV,
      aspect: camera.aspect || gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight) || 1.6,
    }),
    [camera, gl],
  );

  const currentPose = useCallback(
    (): Pose => ({
      position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target: {
        x: controls.current?.target.x ?? 0,
        y: controls.current?.target.y ?? 0,
        z: controls.current?.target.z ?? 0,
      },
    }),
    [camera],
  );

  const applyPose = useCallback(
    (pose: Pose) => {
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      const c = controls.current;
      if (c) {
        c.target.set(pose.target.x, pose.target.y, pose.target.z);
        c.update();
      }
      camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
    },
    [camera],
  );

  /** Glide to a pose. With reduced motion the move is immediate (spec §7). */
  const animateTo = useCallback(
    (to: Pose, seconds = TRANSITION_SECONDS) => {
      const duration = reducedMotion ? 0 : seconds;
      transition.current = {
        from: {
          position: camera.position.clone(),
          target: (controls.current?.target ?? new THREE.Vector3()).clone(),
        },
        to: {
          position: new THREE.Vector3(to.position.x, to.position.y, to.position.z),
          target: new THREE.Vector3(to.target.x, to.target.y, to.target.z),
        },
        started: performance.now() / 1000,
        duration,
      };
      zoomAnimation.current = null;
      setTransitioning(true);
    },
    [camera, reducedMotion],
  );

  /* --- one-time configuration + opening view -----------------------------
   * Mouse/touch mappings and the focus point are set imperatively: React props
   * are re-applied on re-render, and the visitor's own navigation must never be
   * reset by an unrelated state change (a hover event would otherwise snap the
   * focus point back to the park centre). */
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    c.mouseButtons.LEFT = THREE.MOUSE.ROTATE; // drag = orbit
    c.mouseButtons.MIDDLE = THREE.MOUSE.PAN; // middle-drag = pan
    c.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    c.touches.ONE = THREE.TOUCH.ROTATE; // one finger = orbit
    c.touches.TWO = THREE.TOUCH.DOLLY_PAN; // two fingers = pan + pinch
  }, []);

  useEffect(() => {
    if (seeded.current) return;
    const c = controls.current;
    if (!c) return;
    seeded.current = true;
    camera.near = 0.1;
    camera.far = 3000;
    camera.updateProjectionMatrix();
    const pose = parkFramePose(null, viewSpec());
    applyPose(pose);
    orbitPose.current = {
      position: camera.position.clone(),
      target: c.target.clone(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, after OrbitControls mounts
  }, []);

  /* --- the mode switch: the masterplan's angle, not a second camera ------- */
  useEffect(() => {
    if (!seeded.current) return;
    if (lastMode.current === null) {
      lastMode.current = mode;
      return;
    }
    if (lastMode.current === mode) return;
    lastMode.current = mode;
    if (mode === "overhead") {
      orbitPose.current = {
        position: camera.position.clone(),
        target: (controls.current?.target ?? new THREE.Vector3()).clone(),
      };
      animateTo(parkFramePose(null, viewSpec(), true));
      return;
    }
    const remembered = orbitPose.current;
    if (remembered) {
      animateTo({
        position: { x: remembered.position.x, y: remembered.position.y, z: remembered.position.z },
        target: { x: remembered.target.x, y: remembered.target.y, z: remembered.target.z },
      });
      return;
    }
    animateTo(parkFramePose(currentPose(), viewSpec()));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- camera refs are stable
  }, [mode, animateTo]);

  /* --- frame requests: a plot, a section, a point of interest, the park --- */
  useEffect(() => {
    if (!frame || frame.seq === lastFrameSeq.current) return;
    lastFrameSeq.current = frame.seq;
    const pose = framePose(
      { centre: frame.target, radius: frame.radius },
      currentPose(),
      viewSpec(),
      { topDown: frame.topDown || mode === "overhead" },
    );
    animateTo(pose);
    clearFrame();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- camera refs are stable
  }, [frame, mode, animateTo, clearFrame]);

  /* --- the ± controls (and the +/− keys) -------------------------------- */
  useEffect(() => {
    if (!zoom || zoom.seq === lastZoomSeq.current) return;
    lastZoomSeq.current = zoom.seq;
    const c = controls.current;
    if (!c) return;
    const from = c.getDistance();
    const to = clampDistance(from * zoom.factor);
    if (reducedMotion) {
      applyPose({
        position: poseAtDistance(camera, c.target, to),
        target: { x: c.target.x, y: c.target.y, z: c.target.z },
      });
    } else {
      zoomAnimation.current = { from, to, started: performance.now() / 1000 };
    }
    clearZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- camera refs are stable
  }, [zoom, reducedMotion, applyPose, clearZoom]);

  /* --- keyboard: +/− zoom, 0 frames the park ----------------------------- */
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      return (
        tag === "input" || tag === "select" || tag === "textarea" || el?.isContentEditable === true
      );
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const state = usePark3d.getState();
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        state.zoomBy(1 - ORBIT.zoomStep);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        state.zoomBy(1 / (1 - ORBIT.zoomStep));
      } else if (event.key === "0") {
        event.preventDefault();
        state.frameTo(
          { x: SITE_CENTRE_WORLD.x, y: 0, z: SITE_CENTRE_WORLD.z },
          SITE_RADIUS_M,
          "The park",
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* --- Shift+drag pans (as does the middle button); release restores orbit */
  useEffect(() => {
    const setLeftButton = (pan: boolean) => {
      const c = controls.current;
      if (!c) return;
      c.mouseButtons.LEFT = pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") setLeftButton(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") setLeftButton(false);
    };
    const onBlur = () => setLeftButton(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  /* --- a visitor gesture cancels a programmatic zoom (it is their camera) - */
  useEffect(() => {
    const element = gl.domElement;
    const cancel = () => {
      zoomAnimation.current = null;
    };
    element.addEventListener("wheel", cancel);
    element.addEventListener("pointerdown", cancel);
    return () => {
      element.removeEventListener("wheel", cancel);
      element.removeEventListener("pointerdown", cancel);
    };
  }, [gl]);

  /* --- per-frame: run the animations, then apply the envelope ------------ */
  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const now = performance.now() / 1000;

    const moving = transition.current;
    if (moving) {
      const raw = moving.duration <= 0 ? 1 : Math.min(1, (now - moving.started) / moving.duration);
      const t = easeInOut(raw);
      const place = () => {
        camera.position.lerpVectors(moving.from.position, moving.to.position, t);
        c.target.lerpVectors(moving.from.target, moving.to.target, t);
      };
      place();
      // `update()` here is not navigation: it lets any residual gesture inertia
      // (damping still gliding when the move started) bleed away, so the camera
      // does not resume that glide when the move ends. The lerp is re-asserted
      // afterwards, so the move itself stays exact.
      c.update();
      place();
      camera.lookAt(c.target);
      if (raw >= 1) {
        transition.current = null;
        camera.position.copy(moving.to.position);
        c.target.copy(moving.to.target);
        c.update();
        setTransitioning(false);
      }
      return;
    }

    const zooming = zoomAnimation.current;
    if (zooming) {
      const raw = Math.min(1, (now - zooming.started) / ZOOM_SECONDS);
      const distance = zooming.from + (zooming.to - zooming.from) * easeInOut(raw);
      const offset = camera.position.clone().sub(c.target);
      const length = offset.length();
      if (length > 1e-6) {
        offset.multiplyScalar(clampDistance(distance) / length);
        camera.position.copy(c.target).add(offset);
        camera.lookAt(c.target);
      }
      if (raw >= 1) zoomAnimation.current = null;
    }

    /* The envelope, applied after OrbitControls has run (priority -1). */
    const clamped = clampTargetToBounds(c.target, SITE_BOUNDS_WORLD);
    if (clamped.x !== c.target.x || clamped.z !== c.target.z) {
      camera.position.x += clamped.x - c.target.x;
      camera.position.z += clamped.z - c.target.z;
      c.target.set(clamped.x, c.target.y, clamped.z);
      camera.lookAt(c.target);
    }
    if (camera.position.y < ORBIT.minCameraHeightM) {
      camera.position.y = ORBIT.minCameraHeightM;
      camera.lookAt(c.target);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enabled={!transitioning && !draggingPlot}
      enableDamping
      dampingFactor={ORBIT.dampingFactor}
      screenSpacePanning={false}
      enablePan
      minDistance={ORBIT.minDistanceM}
      maxDistance={ORBIT.maxDistanceM}
      minPolarAngle={ORBIT.minPolarAngle}
      maxPolarAngle={ORBIT.maxPolarAngle}
      rotateSpeed={orbitSpeed}
      zoomSpeed={zoomSpeed}
      panSpeed={ORBIT.panSpeed}
      autoRotate={autoOrbit && !transitioning}
      autoRotateSpeed={ORBIT.autoOrbitSpeed}
    />
  );
}

/** The camera position at a new distance, keeping the current direction. */
function poseAtDistance(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  distance: number,
): Pose["position"] {
  const offset = camera.position.clone().sub(target);
  if (offset.lengthSq() < 1e-9) {
    const angles = sphericalFromPose(
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      { x: target.x, y: target.y, z: target.z },
    );
    return poseFromSpherical(target, angles.azimuth, angles.polar, distance);
  }
  offset.setLength(clampDistance(distance));
  return { x: target.x + offset.x, y: Math.max(ORBIT.minCameraHeightM, target.y + offset.y), z: target.z + offset.z };
}
