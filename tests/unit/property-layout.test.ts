import { describe, expect, it } from "vitest";
import { lotMapPosition, mapSections } from "@/lib/property-layout";

/**
 * The map layout is derived, not stored: same lot → same spot on every surface
 * (public map and staff map must show the same picture). These tests pin that.
 */
const A1 = { lot_number: "A-001", section: "A", block: "1" };
const A2 = { lot_number: "A-002", section: "A", block: "1" };
const B1 = { lot_number: "B-001", section: "B", block: "1" };

describe("lotMapPosition", () => {
  it("is deterministic — same lot always lands on the same spot", () => {
    expect(lotMapPosition(A1)).toEqual(lotMapPosition(A1));
    expect(lotMapPosition(A1)).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  });

  it("does not depend on call order or list order", () => {
    expect(lotMapPosition(A1)).toEqual(lotMapPosition({ ...A1 }));
    // Two different lots that share a section/block still differ by sequence.
    expect(lotMapPosition(A1)).not.toEqual(lotMapPosition(A2));
  });

  it("keeps markers inside the canvas (4–96%)", () => {
    const lots = [A1, A2, B1, { lot_number: "C-099", section: "C", block: "9" }];
    for (const lot of lots) {
      const { x, y } = lotMapPosition(lot);
      expect(x).toBeGreaterThanOrEqual(4);
      expect(x).toBeLessThanOrEqual(96);
      expect(y).toBeGreaterThanOrEqual(4);
      expect(y).toBeLessThanOrEqual(96);
    }
  });

  it("spreads sections across the canvas", () => {
    const a = lotMapPosition(A1);
    const b = lotMapPosition(B1);
    const c = lotMapPosition({ lot_number: "C-001", section: "C", block: "1" });
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
  });

  it("tolerates odd section labels without crashing", () => {
    const pos = lotMapPosition({ lot_number: "X-1", section: "Garden of Roses", block: "2" });
    expect(pos.x).toBeGreaterThanOrEqual(4);
    expect(pos.x).toBeLessThanOrEqual(96);
  });
});

describe("mapSections", () => {
  it("returns distinct sections in first-seen order", () => {
    expect(mapSections([B1, A1, A2, B1])).toEqual(["B", "A"]);
  });
});
