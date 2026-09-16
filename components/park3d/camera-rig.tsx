"use client";

/**
 * park3d/camera-rig.tsx — the park's cameras.
 *
 *  · drone     — the primary mode (captain, 2026-09-16): FREE FLIGHT over and
 *                through the park. Drag to look, W A S D to fly, Space/E to
 *                rise, Shift/Q to descend, with smooth calm acceleration and an
 *                adjustable, gentle speed. No pedestrian model, no head-bob, no
 *                footsteps — see `lib/park-3d/flight.ts` for the envelope.
 *  · overhead  — the masterplan view: orbit/zoom around the site centre.
 *  · travel    — a smooth eased flight to a point of interest or a lot. Never a
 *                teleport (except when the visitor asks for reduced motion).
 *
 * Flight is bounded by the site boundary polygon (the masterplan's own outline)
 * and the altitude envelope. The mausoleum is the one solid volume: a low drone
 * cannot cut through it, but flying over it is the whole point of a drone.
 */
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { pointInPolygon } from "@/components/park3d/geometry";
import { FLIGHT, stepFlight, verticalSpeed } from "@/lib/park-3d/flight";
import { usePark3d } from "@/lib/park-3d/view-store";
import {
  MAUSOLEUM_BUILDING_HEIGHT_M,
  MAUSOLEUM_BUILDING_PX,
  POIS_WORLD,
  SITE_BOUNDARY_WORLD,
  SITE_CENTRE_WORLD,
  rectToWorld,
} from "@/lib/park-3d/masterplan";

const TRANSITION_SECONDS = 1.2;
const TRAVEL_SECONDS = 2.6;
/** Double-tap window for Minecraft-style Space (fly toggle) and W (sprint). */
const DOUBLE_TAP_MS = 300;
/** Sprint multiplier — a brisk walk over the park, never a snap. */
const SPRINT_FACTOR = 1.9;
/** Overhead camera offset from the site centre (metres). The whole plan fits in a 60° view. */
const OVERHEAD_OFFSET = { y: 152, z: 120 };

type Solid = { minX: number; maxX: number; minZ: number; maxZ: number; top: number };

/** Solid volumes a low-flying drone must not pass through (world metres). */
function solidVolumes(): Solid[] {
  const building = rectToWorld(MAUSOLEUM_BUILDING_PX);
  const pad = 1;
  return [
    {
      minX: building.centre.x - building.width / 2 - pad,
      maxX: building.centre.x + building.width / 2 + pad,
      minZ: building.centre.z - building.depth / 2 - pad,
      maxZ: building.centre.z + building.depth / 2 + pad,
      top: MAUSOLEUM_BUILDING_HEIGHT_M + 0.6, // fly over it, never through it
    },
  ];
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type Transition = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  lookFrom: THREE.Vector3;
  lookTo: THREE.Vector3;
  started: number;
  duration: number;
  toOverhead: boolean;
};

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const mode = usePark3d((s) => s.cameraMode);
  const speed = usePark3d((s) => s.flySpeed);
  const flying = usePark3d((s) => s.flying);
  const reducedMotion = usePark3d((s) => s.reducedMotion);
  const travel = usePark3d((s) => s.travel);
  const clearTravel = usePark3d((s) => s.clearTravel);

  const orbit = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
  const yaw = useRef(0);
  const pitch = useRef(-0.05);
  const velocity = useRef(new THREE.Vector3());
  const keys = useRef<Record<string, boolean>>({});
  const lastTravelSeq = useRef(0);
  const lastSpaceTap = useRef(0);
  const lastWTap = useRef(0);
  const sprintLatch = useRef(false);
  const solids = useMemo(() => solidVolumes(), []);
  const [transitioning, setTransitioning] = useState(false);
  const transition = useRef<Transition | null>(null);

  // Resting flight pose, restored when the visitor comes back down from overhead.
  const dronePose = useRef({
    position: new THREE.Vector3(),
    yaw: 0,
    pitch: -0.05,
  });

  /**
   * May the drone be at this spot? The site boundary is always a wall; a solid
   * volume is only a wall while the drone is below its top (fly over it freely).
   */
  const mayOccupy = useMemo(() => {
    return (x: number, z: number, y: number) => {
      if (!pointInPolygon(x, z, SITE_BOUNDARY_WORLD)) return false;
      return !solids.some(
        (s) => y < s.top && x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ,
      );
    };
  }, [solids]);

  /** Pointer delta → look direction, from one place so lock and drag agree. */
  const applyLook = useMemo(
    () =>
      (dx: number, dy: number, sensitivity: number) => {
        yaw.current -= dx * sensitivity;
        pitch.current -= dy * sensitivity;
        pitch.current = Math.max(-1.35, Math.min(1.35, pitch.current));
      },
    [],
  );

  const overheadPosition = useMemo(
    () =>
      new THREE.Vector3(
        SITE_CENTRE_WORLD.x,
        OVERHEAD_OFFSET.y,
        SITE_CENTRE_WORLD.z + OVERHEAD_OFFSET.z,
      ),
    [],
  );
  const overheadTarget = useMemo(
    () => new THREE.Vector3(SITE_CENTRE_WORLD.x, 0, SITE_CENTRE_WORLD.z),
    [],
  );

  /* --- start at the main entrance, facing the park (spec §3a.1) ---------- */
  useEffect(() => {
    const entrance = POIS_WORLD[0];
    camera.position.set(entrance.standWorld.x, FLIGHT.cruiseAltitudeM, entrance.standWorld.z);
    camera.rotation.order = "YXZ";
    const dir = new THREE.Vector3(
      entrance.lookWorld.x - entrance.standWorld.x,
      0,
      entrance.lookWorld.z - entrance.standWorld.z,
    );
    yaw.current = Math.atan2(-dir.x, -dir.z);
    pitch.current = -0.02;
    camera.rotation.set(pitch.current, yaw.current, 0);
    dronePose.current = {
      position: camera.position.clone(),
      yaw: yaw.current,
      pitch: pitch.current,
    };
    camera.near = 0.1;
    camera.far = 3000;
    camera.updateProjectionMatrix();
  }, [camera]);

  /* --- keyboard ----------------------------------------------------------
   * Minecraft's grammar (captain, 2026-09-16): W A S D moves relative to where
   * you look, Space ascends, Shift descends while held, double-tap Space toggles
   * free flight, Ctrl (or double-tap W) sprints. Everything feeds the same eased
   * velocity, so the result is calm drone motion, never a shooter snap. */
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      return (
        tag === "input" || tag === "select" || tag === "textarea" || el?.isContentEditable === true
      );
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const state = usePark3d.getState();
      const key = e.key.toLowerCase();
      // Space is a flight control here — it must not scroll the page behind.
      if (e.code === "Space" && state.cameraMode === "drone") {
        e.preventDefault();
        if (!e.repeat) {
          const now = performance.now();
          if (now - lastSpaceTap.current < DOUBLE_TAP_MS) {
            state.toggleFlying();
            lastSpaceTap.current = 0;
          } else {
            lastSpaceTap.current = now;
          }
        }
      }
      if (key === "w" && !e.repeat) {
        const now = performance.now();
        if (now - lastWTap.current < DOUBLE_TAP_MS) {
          sprintLatch.current = true;
          state.setSprinting(true);
        }
        lastWTap.current = now;
      }
      keys.current[key] = true;
    };
    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keys.current[key] = false;
      if (key === "w") {
        sprintLatch.current = false;
        if (!keys.current["control"]) usePark3d.getState().setSprinting(false);
      }
      if (key === "control") {
        sprintLatch.current = false;
        usePark3d.getState().setSprinting(false);
      }
    };
    const blur = () => {
      keys.current = {};
      sprintLatch.current = false;
      usePark3d.getState().setSprinting(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  /* --- pointer look ------------------------------------------------------
   * Pointer Lock (click the world to capture, Esc to release — the browser owns
   * Esc) for the standard first-person feel; a plain drag still looks around
   * when the pointer is free, so touch and lock-refusing browsers keep working. */
  useEffect(() => {
    const el = gl.domElement;
    const onLockChange = () => {
      usePark3d.getState().setPointerLocked(document.pointerLockElement === el);
    };
    const onLockError = () => {
      usePark3d.getState().setPointerLocked(false);
    };
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
    };
  }, [gl]);

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      const state = usePark3d.getState();
      if (state.cameraMode !== "drone" || state.tool !== "inspect") return;
      if (document.pointerLockElement === el) return;
      if (typeof el.requestPointerLock === "function") {
        // A refused lock is not an error: the drag below still looks around.
        const request = el.requestPointerLock() as unknown;
        if (request && typeof (request as Promise<void>).catch === "function") {
          (request as Promise<void>).catch(() => {});
        }
        return;
      }
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      const state = usePark3d.getState();
      if (document.pointerLockElement === el) {
        applyLook(e.movementX, e.movementY, state.lookSensitivity);
        return;
      }
      if (!dragging) return;
      applyLook(e.clientX - lastX, e.clientY - lastY, state.lookSensitivity);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const end = () => {
      dragging = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [gl, applyLook]);

  /* --- mode changes ------------------------------------------------------ */
  useEffect(() => {
    const now = performance.now() / 1000;
    const duration = reducedMotion ? 0 : TRANSITION_SECONDS;
    if (mode === "overhead") {
      dronePose.current = {
        position: camera.position.clone(),
        yaw: yaw.current,
        pitch: pitch.current,
      };
      transition.current = {
        from: camera.position.clone(),
        to: overheadPosition.clone(),
        lookFrom: camera.position.clone().add(new THREE.Vector3(0, 0, -1)),
        lookTo: overheadTarget.clone(),
        started: now,
        duration,
        toOverhead: true,
      };
      velocity.current.set(0, 0, 0);
    } else {
      const pose = dronePose.current;
      const cruise = new THREE.Vector3(
        pose.position.x,
        Math.max(pose.position.y, FLIGHT.cruiseAltitudeM),
        pose.position.z,
      );
      yaw.current = pose.yaw;
      pitch.current = pose.pitch;
      const look = new THREE.Vector3(
        cruise.x - Math.sin(pose.yaw) * 10,
        cruise.y + Math.sin(pose.pitch) * 10,
        cruise.z - Math.cos(pose.yaw) * 10,
      );
      transition.current = {
        from: camera.position.clone(),
        to: cruise,
        lookFrom: orbit.current ? orbit.current.target.clone() : camera.position.clone(),
        lookTo: look,
        started: now,
        duration,
        toOverhead: false,
      };
    }
    setTransitioning(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- camera/orbit are stable refs
  }, [mode, reducedMotion]);

  /* --- travel to a point of interest ------------------------------------- */
  useEffect(() => {
    if (!travel || travel.seq === lastTravelSeq.current) return;
    lastTravelSeq.current = travel.seq;
    const now = performance.now() / 1000;
    const to = new THREE.Vector3(travel.position.x, travel.position.y, travel.position.z);
    const lookTo = new THREE.Vector3(travel.lookAt.x, travel.lookAt.y, travel.lookAt.z);
    const duration = reducedMotion ? 0 : TRAVEL_SECONDS;
    const flying = usePark3d.getState().cameraMode === "drone";

    if (flying) {
      const dir = lookTo.clone().sub(to);
      yaw.current = Math.atan2(-dir.x, -dir.z);
      pitch.current = Math.max(-1.35, Math.min(1.35, Math.atan2(dir.y, Math.hypot(dir.x, dir.z))));
      dronePose.current = {
        position: new THREE.Vector3(to.x, to.y, to.z),
        yaw: yaw.current,
        pitch: pitch.current,
      };
    }
    transition.current = {
      from: camera.position.clone(),
      to,
      lookFrom: orbit.current ? orbit.current.target.clone() : camera.position.clone(),
      lookTo,
      started: now,
      duration,
      toOverhead: false,
    };
    setTransitioning(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- camera/orbit are stable refs
  }, [travel, reducedMotion]);

  /* --- per-frame --------------------------------------------------------- */
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const current = transition.current;
    if (current) {
      const elapsed = performance.now() / 1000 - current.started;
      const raw = current.duration <= 0 ? 1 : Math.min(1, elapsed / current.duration);
      const t = easeInOut(raw);
      camera.position.lerpVectors(current.from, current.to, t);
      const look = new THREE.Vector3().lerpVectors(current.lookFrom, current.lookTo, t);
      camera.lookAt(look);
      if (raw >= 1) {
        transition.current = null;
        if (current.toOverhead && orbit.current) {
          orbit.current.target.copy(overheadTarget);
          orbit.current.update();
        }
        velocity.current.set(0, 0, 0);
        setTransitioning(false);
        clearTravel();
      }
      return;
    }

    if (mode === "overhead") return;

    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch.current, yaw.current, 0);

    /* --- flight controls -------------------------------------------------
     * W/S fly along the view direction (pitch included — a drone looks down at
     * the park and still moves that way), A/D strafe, Space/E rise, Shift/Q
     * descend. Every axis feeds ONE velocity vector so acceleration stays smooth
     * and the movement reads as flight, never as a step. */
    const k = keys.current;
    const forwardInput = (k["w"] || k["arrowup"] ? 1 : 0) - (k["s"] || k["arrowdown"] ? 1 : 0);
    const strafeInput = (k["d"] || k["arrowright"] ? 1 : 0) - (k["a"] || k["arrowleft"] ? 1 : 0);
    // Vertical control belongs to free flight; cruising holds its height.
    const riseInput = flying ? (k[" "] || k["e"] ? 1 : 0) - (k["shift"] || k["q"] ? 1 : 0) : 0;
    const sprinting = k["control"] === true || sprintLatch.current;
    if (sprinting !== usePark3d.getState().sprinting) {
      usePark3d.getState().setSprinting(sprinting);
    }
    const pace = speed * (sprinting ? SPRINT_FACTOR : 1);
    const up = verticalSpeed(pace);

    const target = new THREE.Vector3();
    if (forwardInput !== 0 || strafeInput !== 0 || riseInput !== 0) {
      const cp = Math.cos(pitch.current);
      const fx = -Math.sin(yaw.current) * cp;
      const fy = Math.sin(pitch.current);
      const fz = -Math.cos(yaw.current) * cp;
      const rx = Math.cos(yaw.current);
      const rz = -Math.sin(yaw.current);
      target.set(
        fx * forwardInput * pace + rx * strafeInput * pace,
        // Looking down and flying forward descends: movement follows the look.
        fy * forwardInput * pace + riseInput * up,
        fz * forwardInput * pace + rz * strafeInput * pace,
      );
    }
    velocity.current.lerp(target, Math.min(1, FLIGHT.acceleration * dt));
    if (velocity.current.lengthSq() < 1e-6) {
      velocity.current.set(0, 0, 0);
      return;
    }

    const step = velocity.current.clone().multiplyScalar(dt);
    const previous = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const { position: next, blocked } = stepFlight(
      previous,
      { x: step.x, y: step.y, z: step.z },
      (x, z) => mayOccupy(x, z, previous.y + step.y),
    );
    camera.position.set(next.x, next.y, next.z);
    if (blocked) {
      // Slide along the wall instead of sticking to it: only the refused axis
      // gives up its momentum.
      if (next.x === previous.x) velocity.current.x = 0;
      if (next.z === previous.z) velocity.current.z = 0;
    }
    dronePose.current.position.copy(camera.position);
  });

  /* --- leave pointer lock when the overhead camera takes over ------------- */
  useEffect(() => {
    if (mode === "overhead" && document.pointerLockElement) {
      void document.exitPointerLock?.();
    }
  }, [mode]);

  return (
    <OrbitControls
      ref={orbit}
      enabled={mode === "overhead" && !transitioning}
      target={[overheadTarget.x, overheadTarget.y, overheadTarget.z]}
      screenSpacePanning={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      zoomSpeed={0.7}
      minDistance={25}
      maxDistance={420}
      maxPolarAngle={Math.PI / 2.15}
    />
  );
}
