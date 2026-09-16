"use client";

/**
 * park-3d/view-store.ts — the 3D park's UI/state store (zustand).
 *
 * Scope: what the 3D VIEW needs and nothing else. The plots themselves live in
 * the shared store (`lib/park-maps.ts`) — that is the single source both modes
 * read and write, and it stays the only place plot data exists.
 */
import { create } from "zustand";
import { FLIGHT } from "@/lib/park-3d/flight";

export type CameraMode = "drone" | "overhead";
export type PlotTool = "inspect" | "place" | "move";
export type TravelRequest = {
  /** Monotonic id so the camera rig re-runs a travel even to the same place. */
  seq: number;
  /** Where to stand (world metres). */
  position: { x: number; y: number; z: number };
  /** What to face (world metres). */
  lookAt: { x: number; y: number; z: number };
  label: string;
};

export type DebugFlags = {
  boundary: boolean;
  axes: boolean;
  plotIds: boolean;
  sections: boolean;
  masterplan: boolean;
};

export type Park3dState = {
  cameraMode: CameraMode;
  tool: PlotTool;
  /** Metres per second (the drone's flight speed — see `lib/park-3d/flight.ts`). */
  flySpeed: number;
  /** Radians of rotation per pixel of pointer drag. */
  lookSensitivity: number;
  reducedMotion: boolean;
  /**
   * Pointer-Lock mouse look (captain, 2026-09-16): click the world to capture
   * the mouse, Esc releases it. Mirrors the browser so the HUD can say which
   * state the visitor is in.
   */
  pointerLocked: boolean;
  /**
   * Free flight ON (Minecraft's creative-flying analogue): Space rises and Shift
   * descends. Double-tapping Space toggles it. With it OFF the drone cruises at
   * a level height — it is still a drone, never a pedestrian.
   */
  flying: boolean;
  sprinting: boolean;
  debugOpen: boolean;
  debug: DebugFlags;
  hoveredCode: string | null;
  /** Live readout for the debug overlay. */
  fps: number;
  objectCount: number;
  travel: TravelRequest | null;

  setCameraMode: (mode: CameraMode) => void;
  setTool: (tool: PlotTool) => void;
  setFlySpeed: (speed: number) => void;
  setLookSensitivity: (value: number) => void;
  setReducedMotion: (value: boolean) => void;
  setPointerLocked: (value: boolean) => void;
  setFlying: (value: boolean) => void;
  toggleFlying: () => void;
  setSprinting: (value: boolean) => void;
  toggleDebug: () => void;
  setDebugFlag: (flag: keyof DebugFlags, value: boolean) => void;
  setHoveredCode: (code: string | null) => void;
  setStats: (fps: number, objectCount: number) => void;
  travelTo: (
    position: { x: number; y: number; z: number },
    lookAt: { x: number; y: number; z: number },
    label: string,
  ) => void;
  clearTravel: () => void;
  reset: () => void;
};

const INITIAL = {
  cameraMode: "drone" as CameraMode,
  tool: "inspect" as PlotTool,
  flySpeed: FLIGHT.defaultSpeedMps,
  lookSensitivity: 0.0025,
  reducedMotion: false,
  pointerLocked: false,
  flying: true,
  sprinting: false,
  debugOpen: false,
  debug: { boundary: false, axes: false, plotIds: false, sections: false, masterplan: false },
  hoveredCode: null,
  fps: 0,
  objectCount: 0,
  travel: null,
};

let travelSeq = 0;

export const usePark3d = create<Park3dState>((set) => ({
  ...INITIAL,
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setTool: (tool) => set({ tool }),
  setFlySpeed: (flySpeed) => set({ flySpeed }),
  setLookSensitivity: (lookSensitivity) => set({ lookSensitivity }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setFlying: (flying) => set({ flying }),
  toggleFlying: () => set((s) => ({ flying: !s.flying })),
  setSprinting: (sprinting) => set({ sprinting }),
  toggleDebug: () => set((s) => ({ debugOpen: !s.debugOpen })),
  setDebugFlag: (flag, value) => set((s) => ({ debug: { ...s.debug, [flag]: value } })),
  setHoveredCode: (hoveredCode) => set({ hoveredCode }),
  setStats: (fps, objectCount) => set({ fps, objectCount }),
  travelTo: (position, lookAt, label) =>
    set({ travel: { seq: ++travelSeq, position, lookAt, label } }),
  clearTravel: () => set({ travel: null }),
  // Leaving 3D must not leave the next visit mid-gesture or in another camera.
  reset: () => set({ ...INITIAL, debug: { ...INITIAL.debug } }),
}));
