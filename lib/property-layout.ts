/**
 * Deterministic park-map layout for property lots (Module D/F).
 *
 * The frozen Lot contract (KEB-D3-01) has NO geometry — property-gis carries section,
 * block and lot_number only (GIS coordinates are a deferred dev decision). So the map
 * renders lots from a STABLE derived layout: the same lot always lands on the same spot,
 * on every surface, for every viewer. That is what makes the client-facing map and the
 * staff map literally the same picture — one function, both surfaces.
 *
 * Positions are percentages (0–100) inside the map canvas. When a real GIS payload
 * lands (dev-authored), this module is replaced by geometry and nothing else changes.
 */
export type MapPosition = { x: number; y: number };

export type PositionableLot = {
  lot_number: string;
  section: string;
  block: string;
};

// Vertical "bands" for the park: one per section letter. Sections are A, B, C in the
// fixture/seed data; unknown sections fall back to a stable hash of the section name.

function sectionIndex(lot: PositionableLot): number {
  const first = lot.section.trim().charAt(0).toUpperCase();
  if (first >= "A" && first <= "Z") {
    return first.charCodeAt(0) - 65;
  }
  // Unusual section label → stable hash so it still lands somewhere sensible.
  let h = 0;
  for (const ch of lot.section) h = (h * 31 + ch.charCodeAt(0)) % 26;
  return h;
}

function lotSequence(lot: PositionableLot): { block: number; seq: number } {
  const blockNum = parseInt(lot.block, 10);
  const m = lot.lot_number.match(/(\d+)\s*$/);
  const seq = m ? parseInt(m[1], 10) : 1;
  return { block: Number.isFinite(blockNum) ? blockNum : 1, seq };
}

/**
 * Percent position for a lot. Pure and deterministic — no randomness, no order
 * dependence, clamped inside the canvas (4–96) so markers never fall off the edge.
 */
export function lotMapPosition(lot: PositionableLot): MapPosition {
  const idx = sectionIndex(lot);
  const { block, seq } = lotSequence(lot);

  // Sections spread across the width; blocks stack top→bottom; the lot sequence adds a
  // small deterministic offset so neighbours do not sit exactly on top of each other.
  const xBase = idx % 3 === 0 ? 18 : idx % 3 === 1 ? 50 : 82;
  const xJitter = ((seq * 7) % 10) - 5; // -5..4
  const yBase = 30 + ((block - 1) % 3) * 26; // block 1 → 30, 2 → 56, 3 → 82
  const yJitter = (Math.floor(seq / 3) % 2) * 8;

  return {
    x: clamp(xBase + xJitter, 4, 96),
    y: clamp(yBase + yJitter, 4, 96),
  };
}

/** Ordered list of distinct sections for map labels (by first appearance in data). */
export function mapSections(lots: PositionableLot[]): string[] {
  const seen: string[] = [];
  for (const lot of lots) {
    if (!seen.includes(lot.section)) seen.push(lot.section);
  }
  return seen;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
