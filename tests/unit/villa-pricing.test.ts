/**
 * Villa Memorial Plan pricing invariants.
 *
 * Regression home for the ₱500 → ₱600 defect: the client's payment-mode sheets
 * (COMPLETE MEMORIAL PACKAGE.jpg standard, TYPES OF COFFIN.jpg senior) publish
 * one amount per tier per term, and the four term columns must stay in the
 * exact ratio of the schedule (annual × 1 = semi-annual × 2 = quarterly × 4 =
 * monthly × 12). A transcription slip such as the former Bronze-1 monthly of
 * ₱500 breaks that ratio while still rendering happily — which is why the
 * fixture-contract test (which reads the same module) could not catch it.
 */
import { describe, expect, it } from "vitest";
import {
  ALACARTE_SERVICE_FEES,
  ALACARTE_SERVICE_TOTAL,
  CASKET_COLLECTIONS,
  CASKET_INCLUSIONS,
  CASKET_MODELS,
  CHAPEL_NOTES,
  CHAPEL_RATES,
  COFFINS,
  EMBALMING_PER_DAY_BEYOND_9,
  EMBALMING_RATES,
  LOT_PRICE_CATEGORIES,
  PLAN_TERMS,
  PLAN_TIERS,
  SENIOR_PAYMENTS,
  VMP_INCLUSIONS,
  VMP_PACKAGE,
  VMP_PAYMENTS,
  php2,
  planRate,
  planTermOptions,
} from "@/lib/villa-pricing";

describe("Villa Memorial Plan payment-mode tables", () => {
  it("publishes the client's Bronze 1 monthly rate (₱600, not ₱500)", () => {
    expect(planRate("bronze1", "monthly")).toBe(600);
    expect(planRate("bronze1", "monthly", true)).toBe(550);
  });

  it("keeps every term column in the schedule's ratio", () => {
    for (const rows of [VMP_PAYMENTS, SENIOR_PAYMENTS]) {
      const annual = rows.find((r) => r.mode === "Annual");
      const semi = rows.find((r) => r.mode === "Semi-annual");
      const quarterly = rows.find((r) => r.mode === "Quarterly");
      const monthly = rows.find((r) => r.mode === "Monthly");
      expect(annual && semi && quarterly && monthly).toBeTruthy();
      for (const tier of PLAN_TIERS.map((t) => t.id)) {
        expect(annual![tier]).toBe(monthly![tier] * 12);
        expect(annual![tier]).toBe(semi![tier] * 2);
        expect(annual![tier]).toBe(quarterly![tier] * 4);
      }
    }
  });

  it("exposes one selector option per term, priced from the table", () => {
    const options = planTermOptions("silver1");
    expect(options.map((o) => o.term)).toEqual(PLAN_TERMS.map((t) => t.id));
    expect(options).toEqual([
      { term: "monthly", label: "Monthly", per: "/ month", amount: 1000 },
      { term: "quarterly", label: "Quarterly", per: "/ quarter", amount: 3000 },
      { term: "semi", label: "Semi-Annual", per: "/ semi-annual", amount: 6000 },
      { term: "annual", label: "Annual", per: "/ year", amount: 12000 },
    ]);
  });

  it("formats plan money with centavos (₱600.00)", () => {
    expect(php2(600)).toBe("₱600.00");
    expect(php2(18240)).toBe("₱18,240.00");
  });
});

describe("2026 price list structure", () => {
  it("carries the client's four product families with five products each (3 mausoleum variants)", () => {
    expect(LOT_PRICE_CATEGORIES.map((c) => c.title)).toEqual([
      "1. Lot Only",
      "2. Lot + Interment (1st Burial Only)",
      "3. Lot + Interment + VMP",
      "4. Mausoleum + Construction",
    ]);
    expect(LOT_PRICE_CATEGORIES.slice(0, 3).map((c) => c.rows.length)).toEqual([5, 5, 5]);
    expect(LOT_PRICE_CATEGORIES[3].rows.length).toBe(3);
  });

  it("keeps lot amortization at six years for every product (annual × 6 ≈ selling)", () => {
    for (const category of LOT_PRICE_CATEGORIES) {
      for (const row of category.rows) {
        // The sheet prints rounded schedules (e.g. ₱112,521 senior selling vs
        // ₱18,753 × 6 = ₱112,518), so allow the rounding drift the client printed.
        expect(Math.abs(row.regular.annual * 6 - row.regular.selling)).toBeLessThanOrEqual(3);
        expect(Math.abs(row.senior.annual * 6 - row.senior.selling)).toBeLessThanOrEqual(3);
      }
    }
  });

  it("shows five package inclusions (four service blocks + flowers/tarpaulin)", () => {
    expect(VMP_INCLUSIONS).toHaveLength(5);
    expect(VMP_INCLUSIONS.slice(0, 4)).toEqual(VMP_PACKAGE);
    expect(VMP_INCLUSIONS[4].service).toMatch(/flowers/i);
  });
});

describe("2026 casket catalogue (2026 price FV website A = PRICE LIST FOR 2026 II)", () => {
  it("carries every model the sheet prints, under the sheet's collection headers", () => {
    expect(CASKET_COLLECTIONS).toEqual([
      "Lumina",
      "The White Rose Collection",
      "The Crown Collection",
      "The Dynasty Collection",
    ]);
    expect(CASKET_MODELS.map((m) => m.model)).toEqual([
      "Lumina",
      "White Rose Half",
      "White Rose Full",
      "Angelica Half",
      "Angelica Full",
      "Magnolia Half",
      "Magnolia Full",
      "Noble Half",
      "Noble Full",
      "Noble Full Split",
      "Royal Half",
      "Royal Full",
      "Royal Full Split",
      "Monarch Half",
      "Monarch Full",
      "Majesty Full",
      "Majesty Full Split",
      "Majesty Flexi",
      "Emperor Full",
      "Emperor Full Split",
      "Emperor Flexi",
      "Imperial Full",
      "Imperial Full Split",
      "Imperial Flexi",
    ]);
    expect(CASKET_MODELS).toHaveLength(24);
  });

  it("pins every SRP, senior discount and discounted price printed on the sheet", () => {
    // Price rows exactly as the sheet prints them: model → [SRP, discount, discounted].
    const printed: Record<string, [number, number, number]> = {
      Lumina: [33000, 6600, 26400],
      "White Rose Half": [62000, 12400, 49600],
      "White Rose Full": [68000, 13600, 54400],
      "Angelica Half": [65000, 13000, 52000],
      "Angelica Full": [70000, 14000, 56000],
      "Magnolia Half": [70000, 14000, 56000],
      "Magnolia Full": [75000, 15000, 60000],
      "Noble Half": [80000, 16000, 64000],
      "Noble Full": [90000, 18000, 72000],
      "Noble Full Split": [95000, 19000, 76000],
      "Royal Half": [85000, 17000, 68000],
      "Royal Full": [95000, 19000, 76000],
      "Royal Full Split": [100000, 20000, 80000],
      "Monarch Half": [100000, 20000, 80000],
      "Monarch Full": [110000, 22000, 88000],
      "Majesty Full": [120000, 24000, 96000],
      "Majesty Full Split": [130000, 26000, 104000],
      "Majesty Flexi": [140000, 28000, 112000],
      "Emperor Full": [130000, 26000, 104000],
      "Emperor Full Split": [140000, 28000, 112000],
      "Emperor Flexi": [150000, 30000, 120000],
      "Imperial Full": [140000, 28000, 112000],
      "Imperial Full Split": [150000, 30000, 120000],
      "Imperial Flexi": [160000, 32000, 128000],
    };
    for (const [model, [srp, discount, discounted]] of Object.entries(printed)) {
      const row = CASKET_MODELS.find((m) => m.model === model);
      expect(row, `missing casket model: ${model}`).toBeTruthy();
      expect([row!.srp, row!.seniorDiscount, row!.seniorPrice]).toEqual([
        srp,
        discount,
        discounted,
      ]);
    }
    expect(Object.keys(printed)).toHaveLength(CASKET_MODELS.length);
  });

  it("keeps the sheet's arithmetic: discounted = SRP − discount, discount = 20% of SRP", () => {
    for (const m of CASKET_MODELS) {
      expect(m.seniorPrice).toBe(m.srp - m.seniorDiscount);
      expect(m.seniorDiscount).toBe(m.srp * 0.2);
    }
  });
});

describe("2026 casket inclusions (PRICE LIST FOR 2026 III)", () => {
  it("has one row per casket family, in the sheet's order", () => {
    expect(CASKET_INCLUSIONS.map((r) => r.family)).toEqual([
      "Lumina",
      "White Rose",
      "Angelica",
      "Magnolia",
      "Noble",
      "Royal",
      "Monarch",
      "Majesty",
      "Emperor",
      "Imperial",
    ]);
    // Every priced model has an inclusion row to read (the page pairs them).
    for (const m of CASKET_MODELS) {
      expect(CASKET_INCLUSIONS.some((r) => r.family === m.family)).toBe(true);
    }
  });

  it("pins the sheet's YES/NO row and the chapel day rates", () => {
    const yes = (row: (typeof CASKET_INCLUSIONS)[number]) =>
      [row.flowers, row.tarp, row.lapida, row.familyCar, row.dozenRoses, row.thankYouCard];
    const rows = Object.fromEntries(CASKET_INCLUSIONS.map((r) => [r.family, yes(r)]));
    expect(rows["Lumina"]).toEqual([false, false, false, false, false, false]);
    expect(rows["White Rose"]).toEqual([true, true, true, false, false, false]);
    expect(rows["Angelica"]).toEqual([true, true, true, false, false, false]);
    expect(rows["Magnolia"]).toEqual([true, true, true, false, false, false]);
    expect(rows["Noble"]).toEqual([true, true, true, false, true, true]);
    expect(rows["Royal"]).toEqual([true, true, true, false, true, true]);
    expect(rows["Monarch"]).toEqual([true, true, true, false, true, true]);
    for (const family of ["Majesty", "Emperor", "Imperial"]) {
      expect(rows[family]).toEqual([true, true, true, true, true, true]);
    }
    for (const row of CASKET_INCLUSIONS) {
      expect(row.commonChapelPerDay).toBe(1500);
      expect(row.privateChapelPerDay).toBe(3000);
    }
    // Sheet III marks only Lumina's private-chapel rate "*Discounted Price".
    expect(CASKET_INCLUSIONS.filter((r) => r.privateChapelDiscounted).map((r) => r.family)).toEqual([
      "Lumina",
    ]);
  });
});

describe("2026 a-la-carte service rates (2026 price FV website A, \"If they will not get the package\")", () => {
  it("pins the embalming table day by day plus the per-day rate beyond nine", () => {
    expect(EMBALMING_RATES).toEqual([
      { days: 3, amount: 6000 },
      { days: 4, amount: 7500 },
      { days: 5, amount: 9000 },
      { days: 6, amount: 10500 },
      { days: 7, amount: 12000 },
      { days: 8, amount: 13500 },
      { days: 9, amount: 15000 },
    ]);
    expect(EMBALMING_PER_DAY_BEYOND_9).toBe(1500);
  });

  it("pins the five a-la-carte fees and the sheet's bottom-line total", () => {
    expect(ALACARTE_SERVICE_FEES).toEqual([
      { service: "Retrieval", amount: 2500 },
      { service: "Delivery", amount: 2500 },
      { service: "Viewing equipment", amount: 4500 },
      { service: "ORD coffin", amount: 5000 },
      { service: "Interment", amount: 5000 },
    ]);
    expect(ALACARTE_SERVICE_TOTAL).toBe(19500);
    // The sheet prints ₱19,500 unlabelled; it must stay the exact sum of the five fees.
    expect(ALACARTE_SERVICE_TOTAL).toBe(
      ALACARTE_SERVICE_FEES.reduce((sum, f) => sum + f.amount, 0),
    );
  });
});

describe("2026 chapel rates (PRICE LIST FOR 2026 III)", () => {
  it("pins every per-day rate and 3–9 day total, regular and senior", () => {
    expect(CHAPEL_RATES.map((r) => r.days)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    const printed = [
      [3, 4500, 4320, 10500, 10080],
      [4, 6000, 5760, 14000, 13440],
      [5, 7500, 7200, 17500, 16800],
      [6, 9000, 8640, 21000, 20160],
      [7, 10500, 10080, 24500, 23520],
      [8, 12000, 11520, 28000, 26880],
      [9, 13500, 12960, 31500, 30240],
    ];
    for (const [days, common, commonSenior, priv, privSenior] of printed) {
      const row = CHAPEL_RATES.find((r) => r.days === days)!;
      expect([row.common.regular, row.common.senior, row.private.regular, row.private.senior]).toEqual(
        [common, commonSenior, priv, privSenior],
      );
      // Rates are per day: the printed total is rate × days, for both chapels.
      expect(row.common.ratePerDay).toBe(1500);
      expect(row.private.ratePerDay).toBe(3500);
      expect(row.common.regular).toBe(row.common.ratePerDay * days);
      expect(row.private.regular).toBe(row.private.ratePerDay * days);
      // The sheet computes the senior column as 96% of the regular total.
      expect(row.common.senior).toBe(row.common.regular * 0.96);
      expect(row.private.senior).toBe(row.private.regular * 0.96);
    }
  });

  it("carries the sheet's own footnotes verbatim (published beside the table)", () => {
    expect(CHAPEL_NOTES.scope).toContain("chapel use only");
    expect(CHAPEL_NOTES.miscFee).toContain("1,000");
    expect(CHAPEL_NOTES.seniorPerDay).toContain("1,800");
    expect(CHAPEL_NOTES.seniorPerDay).toContain("4,200");
    expect(CHAPEL_NOTES.privateChapelOnly).toContain("700");
  });
});

describe("coffin tier photography (TYPES OF COFFIN)", () => {
  it("publishes the sheet's lid for each tier (Bronze 2 and above are full-glass)", () => {
    expect(COFFINS.map((c) => [c.tier, c.lid])).toEqual([
      ["Bronze 1", "Half-glass lid"],
      ["Bronze 2", "Full glass lid"],
      ["Silver 1", "Half-glass lid"],
      ["Silver 2", "Full glass lid (cover convertible to full-glass or half-glass)"],
      ["Gold", "Full-glass lid (cover can be full-glass or half-glass)"],
    ]);
  });
});
