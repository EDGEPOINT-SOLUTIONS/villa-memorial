import { describe, expect, it } from "vitest";
import { formatMinorUnits, previewSubtotal } from "@/lib/money";

describe("formatMinorUnits", () => {
  it("renders integer centavos as PHP currency strings", () => {
    expect(formatMinorUnits(150000)).toMatch(/₱\u00A01,500\.00|₱1,500\.00/);
    expect(formatMinorUnits(18000)).toMatch(/₱\u00A0180\.00|₱180\.00/);
    expect(formatMinorUnits(5)).toMatch(/₱\u00A00\.05|₱0\.05/);
  });

  it("rejects non-integers and negatives — money discipline", () => {
    expect(() => formatMinorUnits(1500.5)).toThrow();
    expect(() => formatMinorUnits(-1)).toThrow();
  });
});

describe("previewSubtotal", () => {
  it("sums unit × qty for display only", () => {
    expect(
      previewSubtotal([
        { unitPriceCents: 150000, quantity: 1 },
        { unitPriceCents: 25000, quantity: 2 },
      ]),
    ).toBe(200000);
  });
});
