/**
 * park3d/palette.ts — the 3D scene's colours, read from the design tokens
 * (`styles/tokens.css`, `--scene-*`). Nothing in components/park3d/* names a raw
 * colour: change the token and every 3D surface follows.
 *
 * Status colours reuse the SEMANTIC plot tones so a plot's 3D colour and its 2D
 * map colour always agree.
 */
import type { PlotArea } from "@/lib/park-maps";

const FALLBACK: Record<string, string> = {
  "--scene-grass": "#7d9a55",
  "--scene-grass-dark": "#5d7a41",
  "--scene-grass-light": "#92ab67",
  "--scene-future": "#4f9463",
  "--scene-asphalt": "#93999b",
  "--scene-asphalt-edge": "#b6bbbc",
  "--scene-paving": "#cbb68a",
  "--scene-concrete": "#d5d3cb",
  "--scene-stone": "#eeeade",
  "--scene-hedge": "#3f5c33",
  "--scene-canopy": "#4f7340",
  "--scene-canopy-light": "#6f914d",
  "--scene-trunk": "#6b5340",
  "--scene-water": "#9dc0cc",
  "--scene-sky": "#cfe4f5",
  "--scene-plot-available": "#a8bf85",
  "--scene-plot-reserved": "#d8c496",
  "--scene-plot-sold": "#a9b8c6",
  "--scene-plot-occupied": "#b9bdbf",
  "--scene-plot-maintenance": "#cfa79f",
  "--scene-plot-line": "#ece7d8",
  "--scene-marker": "#c79b1e",
};

/** Token lookup with an SSR-safe fallback (the canvas is client-only, but tests import this). */
export function token(name: string): string {
  if (typeof window === "undefined") return FALLBACK[name] ?? "#808080";
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || FALLBACK[name] || "#808080";
}

/** The whole scene palette, resolved once per render. */
export function scenePalette() {
  return {
    grass: token("--scene-grass"),
    grassDark: token("--scene-grass-dark"),
    grassLight: token("--scene-grass-light"),
    future: token("--scene-future"),
    asphalt: token("--scene-asphalt"),
    asphaltEdge: token("--scene-asphalt-edge"),
    paving: token("--scene-paving"),
    concrete: token("--scene-concrete"),
    stone: token("--scene-stone"),
    hedge: token("--scene-hedge"),
    canopy: token("--scene-canopy"),
    canopyLight: token("--scene-canopy-light"),
    trunk: token("--scene-trunk"),
    water: token("--scene-water"),
    sky: token("--scene-sky"),
    plotLine: token("--scene-plot-line"),
    marker: token("--scene-marker"),
  };
}

/** Plot status → 3D surface colour (same meaning as the 2D map's status palette). */
export function plotStatusColor(status: PlotArea["status"]): string {
  switch (status) {
    case "available":
      return token("--scene-plot-available");
    case "reserved":
      return token("--scene-plot-reserved");
    case "sold":
      return token("--scene-plot-sold");
    case "occupied":
      return token("--scene-plot-occupied");
    default:
      return token("--scene-plot-maintenance");
  }
}
