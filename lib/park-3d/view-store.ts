"use client";

/**
 * park-3d/view-store.ts — the 3D park's UI/state store (zustand).
 *
 * Scope: what the 3D VIEW needs and nothing else. The plots themselves live in
 * the shared store (`lib/park-maps.ts`) — that is the single source both modes
 * read and write, and it stays the only place plot data exists.
 *
 * The camera is the orbit camera (captain, 2026-09-17): the rig owns the gestures
 * and the animation clock, so this store only carries the requests it must obey —
 * "frame this" (a plot, a section, a point of interest) and "zoom by this much" —
 * plus the orbit settings the Settings panel edits. There is no flight state
 * (speed, flying, sprinting, pointer lock): the drone camera is gone.
 */
import { create } from "zustand";
import { ORBIT } from "@/lib/park-3d/orbit";

export type CameraMode = "orbit" | "overhead";
export type PlotTool = "inspect" | "place" | "move";

/**
 * Ask the camera to settle on something — a selected plot, a section, a point of
 * interest. `target`/`radius` describe WHAT is being framed (world metres); the
 * rig picks the distance that fits it and keeps the visitor's present viewing
 * direction, so the move reads as a calm dolly, never a teleport to a canned angle.
 */
export type FrameRequest = {
  /** Monotonic id so the rig re-runs a move even to the same place. */
  seq: number;
  target: { x: number; y: number; z: number };
  /** Radius of the framed content in metres (half its diagonal). */
  radius: number;
  label: string;
  /** Settle into the masterplan's top-down angle instead of the current one. */
  topDown: boolean;
};

/** Ask the camera to zoom by a factor (< 1 moves closer, > 1 moves further). */
export type ZoomRequest = { seq: number; factor: number };

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
  /** OrbitControls' rotate-speed multiplier (Settings panel). */
  orbitSpeed: number;
  /** OrbitControls' zoom-speed multiplier (Settings panel). */
  zoomSpeed: number;
  /** A slow, calm auto-orbit around the focus point — off by default. */
  autoOrbit: boolean;
  reducedMotion: boolean;
  /**
   * A plot is being dragged in the 3D world (admin "Move a plot"): the orbit
   * camera stands still for the duration, so a plot move never turns into a
   * camera move at the same time.
   */
  draggingPlot: boolean;
  debugOpen: boolean;
  debug: DebugFlags;
  hoveredCode: string | null;
  /** Live readout for the debug overlay. */
  fps: number;
  objectCount: number;
  frame: FrameRequest | null;
  zoom: ZoomRequest | null;

  setCameraMode: (mode: CameraMode) => void;
  setTool: (tool: PlotTool) => void;
  setOrbitSpeed: (speed: number) => void;
  setZoomSpeed: (speed: number) => void;
  setAutoOrbit: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  setDraggingPlot: (value: boolean) => void;
  toggleDebug: () => void;
  setDebugFlag: (flag: keyof DebugFlags, value: boolean) => void;
  setHoveredCode: (code: string | null) => void;
  setStats: (fps: number, objectCount: number) => void;
  /** Frame something: the panel's sections/points of interest and the selection. */
  frameTo: (
    target: { x: number; y: number; z: number },
    radius: number,
    label: string,
    options?: { topDown?: boolean },
  ) => void;
  clearFrame: () => void;
  zoomBy: (factor: number) => void;
  clearZoom: () => void;
  reset: () => void;
};

const INITIAL = {
  cameraMode: "orbit" as CameraMode,
  tool: "inspect" as PlotTool,
  orbitSpeed: ORBIT.rotateSpeed,
  zoomSpeed: ORBIT.zoomSpeed,
  autoOrbit: false,
  reducedMotion: false,
  draggingPlot: false,
  debugOpen: false,
  debug: { boundary: false, axes: false, plotIds: false, sections: false, masterplan: false },
  hoveredCode: null,
  fps: 0,
  objectCount: 0,
  frame: null,
  zoom: null,
};

let requestSeq = 0;

export const usePark3d = create<Park3dState>((set) => ({
  ...INITIAL,
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setTool: (tool) => set({ tool }),
  setOrbitSpeed: (orbitSpeed) => set({ orbitSpeed }),
  setZoomSpeed: (zoomSpeed) => set({ zoomSpeed }),
  setAutoOrbit: (autoOrbit) => set({ autoOrbit }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setDraggingPlot: (draggingPlot) => set({ draggingPlot }),
  toggleDebug: () => set((s) => ({ debugOpen: !s.debugOpen })),
  setDebugFlag: (flag, value) => set((s) => ({ debug: { ...s.debug, [flag]: value } })),
  setHoveredCode: (hoveredCode) => set({ hoveredCode }),
  setStats: (fps, objectCount) => set({ fps, objectCount }),
  frameTo: (target, radius, label, options) =>
    set({
      frame: { seq: ++requestSeq, target, radius, label, topDown: options?.topDown === true },
    }),
  clearFrame: () => set({ frame: null }),
  zoomBy: (factor) => set({ zoom: { seq: ++requestSeq, factor } }),
  clearZoom: () => set({ zoom: null }),
  // Leaving 3D must not leave the next visit mid-gesture or in another camera.
  reset: () => set({ ...INITIAL, debug: { ...INITIAL.debug } }),
}));
