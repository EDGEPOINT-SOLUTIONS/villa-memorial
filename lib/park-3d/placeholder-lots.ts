/**
 * park-3d/placeholder-lots.ts — the PLACEHOLDER lot inventory for the Villa
 * masterplan, generated from configurable section grids.
 *
 * ⚠ THESE ARE NOT REAL LOTS. The client has not supplied a lot list, so every
 * plot this module produces is a placeholder: the IDs (`P-001`, `PR-001`,
 * `G-001`, `GN-001`) are clearly marked, no price is attached anywhere (the UI
 * shows "Contact for pricing"), and the shapes are a fitted grid inside the
 * section rectangles drawn on the masterplan — never a claim about real lot
 * boundaries, counts or dimensions. Change `PLACEHOLDER_SECTIONS` (or delete an
 * entry) and the whole inventory follows; nothing else in the codebase knows
 * these numbers.
 *
 * The plots are ordinary records in the shared store (`lib/park-maps.ts`), which
 * is what lets either mode — the plain masterplan image or the 3D park —
 * create, move, edit and delete them and see the other mode follow.
 *
 * Cell sizes approximate the lot rhythm the masterplan draws (~2–4.5 m in world
 * metres, see coords.ts METRES_PER_IMAGE_UNIT), so a placeholder reads as a lot
 * rather than as a field.
 */

import { imagePxToFrame } from "@/lib/park-3d/coords";
import type { PlotArea } from "@/lib/park-maps";

export type PlaceholderSection = {
  /** Plot-code prefix — the visible "this is a placeholder" marker. */
  prefix: string;
  /** Legend type id from `lib/park-types.ts` (the masterplan's own section names). */
  typeId: string;
  /** The label the masterplan prints for this section. */
  label: string;
  /** Section letter used in the section · block display text. */
  section: string;
  /** Fitted grid area in masterplan pixels. */
  regionPx: { x0: number; y0: number; x1: number; y1: number };
  cols: number;
  rows: number;
  gapX: number;
  gapY: number;
};

/**
 * One entry per section the masterplan labels. Regions are fitted boxes inside
 * the drawn lot grids and deliberately avoid the seeded (linked) demo plots that
 * live in the same sections.
 */
export const PLACEHOLDER_SECTIONS: readonly PlaceholderSection[] = [
  {
    prefix: "P",
    typeId: "lt-premium",
    label: "PREMIUM LOTS",
    section: "P",
    regionPx: { x0: 516, y0: 150, x1: 890, y1: 452 },
    cols: 8,
    rows: 5,
    gapX: 12,
    gapY: 14,
  },
  {
    prefix: "PR",
    typeId: "lt-primary",
    label: "PRIMARY LOTS",
    section: "PR",
    regionPx: { x0: 596, y0: 706, x1: 790, y1: 774 },
    cols: 4,
    rows: 2,
    gapX: 12,
    gapY: 12,
  },
  {
    prefix: "G",
    typeId: "lt-garden",
    label: "GARDEN LOTS",
    section: "G",
    regionPx: { x0: 596, y0: 900, x1: 790, y1: 1014 },
    cols: 4,
    rows: 3,
    gapX: 12,
    gapY: 12,
  },
  {
    prefix: "GN",
    typeId: "lt-niches",
    label: "GARDEN NICHES",
    section: "GN",
    regionPx: { x0: 336, y0: 1046, x1: 486, y1: 1148 },
    cols: 5,
    rows: 3,
    gapX: 10,
    gapY: 12,
  },
];

/** Section label for a placeholder code, or undefined for anything else. */
export function placeholderSectionLabel(code: string): string | undefined {
  const match = /^([A-Z]+)-\d+$/.exec(code.toUpperCase());
  if (!match) return undefined;
  return PLACEHOLDER_SECTIONS.find((s) => s.prefix === match[1])?.label;
}

type FrameRect = { minX: number; maxX: number; minY: number; maxY: number };

function boundsOf(area: PlotArea): FrameRect {
  if (area.circle) {
    return {
      minX: area.circle.x - area.circle.r,
      maxX: area.circle.x + area.circle.r,
      minY: area.circle.y - area.circle.r,
      maxY: area.circle.y + area.circle.r,
    };
  }
  const pts = area.outline ?? [];
  return {
    minX: Math.min(...pts.map((p) => p[0])),
    maxX: Math.max(...pts.map((p) => p[0])),
    minY: Math.min(...pts.map((p) => p[1])),
    maxY: Math.max(...pts.map((p) => p[1])),
  };
}

function rectsOverlap(a: FrameRect, b: FrameRect): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build the placeholder inventory.
 *
 * @param occupied plots already in the section (the seeded demo lots) — any grid
 *   cell that would sit on top of one is skipped, so placeholders never cover a
 *   linked lot.
 * @param parkId the park these plots belong to (ids are namespaced with it).
 */
export function placeholderPlots(occupied: readonly PlotArea[] = [], parkId = "villa"): PlotArea[] {
  const out: PlotArea[] = [];
  const taken = occupied.map(boundsOf);

  for (const section of PLACEHOLDER_SECTIONS) {
    const { x0, y0, x1, y1 } = section.regionPx;
    const cellW = (x1 - x0 - (section.cols - 1) * section.gapX) / section.cols;
    const cellH = (y1 - y0 - (section.rows - 1) * section.gapY) / section.rows;
    if (cellW <= 0 || cellH <= 0) continue; // misconfigured grid — skip, never throw

    let n = 0;
    for (let row = 0; row < section.rows; row++) {
      for (let col = 0; col < section.cols; col++) {
        const px0 = x0 + col * (cellW + section.gapX);
        const py0 = y0 + row * (cellH + section.gapY);
        const px1 = px0 + cellW;
        const py1 = py0 + cellH;

        // Corner order: NW, NE, SE, SW — same convention the map editor writes.
        const outlinePx: Array<[number, number]> = [
          [px0, py0],
          [px1, py0],
          [px1, py1],
          [px0, py1],
        ];
        const outline = outlinePx.map(([px, py]) => {
          const f = imagePxToFrame(px, py);
          return [round2(f.x), round2(f.y)] as [number, number];
        });

        const rect: FrameRect = {
          minX: Math.min(...outline.map((p) => p[0])),
          maxX: Math.max(...outline.map((p) => p[0])),
          minY: Math.min(...outline.map((p) => p[1])),
          maxY: Math.max(...outline.map((p) => p[1])),
        };
        if (taken.some((t) => rectsOverlap(t, rect))) continue;

        n++;
        const code = `${section.prefix}-${String(n).padStart(3, "0")}`;
        out.push({
          id: `${parkId}-${code.toLowerCase()}`,
          code,
          lot_id: null,
          status: "available",
          typeId: section.typeId,
          sectionBlock: `${section.section} · ${n}`,
          outline,
        });
      }
    }
  }

  return out;
}
