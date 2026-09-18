import { describe, expect, it } from "vitest";
import { WITHDRAWN_CATALOG_ITEMS } from "@/lib/catalog-sources";
import { formatMinorUnits } from "@/lib/money";
import { parseRequestPrefill, requestMessage } from "@/lib/public-forms/request-prefill";
import { builderCatalog } from "@/lib/service-builder-catalog";
import {
  EMBALMING_MAX_DAYS,
  INITIAL_SELECTION,
  builderEstimate,
  builderRequestHref,
  builderRequestNote,
  casketOptionOf,
  chapelStay,
  embalmingPriceCents,
  planRateCents,
  type BuilderSelection,
} from "@/lib/service-builder";
import { SEED_PRICING, SEED_PRICING as pricing } from "@/lib/villa-pricing";

/**
 * The Smart Service Builder's rules (F-05).
 *
 * These pin the two things the screen promises: every figure is a 2026 sheet
 * figure (transcribed once, in lib/villa-pricing.ts / the pricing store), and
 * the total is arithmetic over those figures — never a second price table. An
 * invented amount, a senior discount the sheet does not print, a plan folded
 * into the one-time total or a withdrawn item sneaking in as a priced line all
 * fail here.
 *
 * The rendered screen (its hero, disclaimer, request link and honest states) is
 * pinned separately by tests/unit/service-builder-page.test.tsx, and the reading
 * budget by tests/unit/reading-budget.test.tsx.
 */
const catalog = builderCatalog(SEED_PRICING);

/** A selection with the given answers, everything else at its starting value. */
const choose = (patch: Partial<BuilderSelection> = {}): BuilderSelection => ({
  ...INITIAL_SELECTION,
  ...patch,
});

describe("the builder's catalog is the client's 2026 sheets, joined", () => {
  it("offers exactly the sheet's casket catalogue, in the sheet's order", () => {
    expect(catalog.caskets).toHaveLength(24);
    expect(catalog.caskets[0].model).toBe("Lumina");
    expect(catalog.caskets[catalog.caskets.length - 1].model).toBe("Imperial Flexi");
    // The two columns the sheet prints per model, in centavos.
    const lumina = catalog.caskets[0];
    expect(lumina.priceCents).toBe(3_300_000);
    expect(lumina.seniorPriceCents).toBe(2_640_000);
    // Every model keeps the sheet's own 20% senior column and never exceeds it.
    for (const casket of catalog.caskets) {
      expect(casket.seniorPriceCents, casket.model).toBeLessThan(casket.priceCents);
    }
  });

  it("carries the a-la-carte fees with the sheet's own total, and the embalming ladder", () => {
    expect(catalog.services.map((s) => s.label)).toEqual([
      "Retrieval",
      "Delivery",
      "Viewing equipment",
      "ORD coffin",
      "Interment",
    ]);
    expect(catalog.servicesSheetTotalCents).toBe(1_950_000);
    expect(catalog.services.reduce((sum, s) => sum + s.priceCents, 0)).toBe(
      catalog.servicesSheetTotalCents,
    );
    expect(catalog.embalming.map((e) => e.days)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(catalog.embalming[0].priceCents).toBe(600_000);
    expect(catalog.embalmingExtraDayCents).toBe(150_000);
  });

  it("carries both chapel classes with the sheet's 3–9 day schedule and senior column", () => {
    expect(catalog.chapels.map((c) => c.id)).toEqual(["common", "private"]);
    const common = catalog.chapels[0];
    expect(common.perDayCents).toBe(150_000);
    expect(common.stays).toHaveLength(7);
    expect(common.stays[0]).toMatchObject({
      days: 3,
      regularCents: 450_000,
      seniorCents: 432_000,
    });
    expect(catalog.chapels[1].stays[0]).toMatchObject({
      days: 3,
      regularCents: 1_050_000,
      seniorCents: 1_008_000,
    });
  });

  it("carries every plan tier × term cell from the pricing store, senior below regular", () => {
    expect(catalog.planTiers).toHaveLength(5);
    expect(catalog.planTerms.map((t) => t.id)).toEqual(["monthly", "quarterly", "semi", "annual"]);
    expect(catalog.planRates).toHaveLength(20);
    expect(planRateCents(catalog, "bronze1", "monthly", false)).toBe(60_000);
    expect(planRateCents(catalog, "bronze1", "monthly", true)).toBe(55_000);
    for (const rate of catalog.planRates) {
      expect(rate.seniorCents, `${rate.tier}/${rate.term}`).toBeLessThanOrEqual(rate.regularCents);
    }
  });

  it("keeps the four withdrawn items as office labels, never as priced lines", () => {
    expect(catalog.arrangedByOffice).toHaveLength(WITHDRAWN_CATALOG_ITEMS.length);
    const priced = [
      ...catalog.caskets.map((c) => c.model),
      ...catalog.services.map((s) => s.label),
    ].join(" ");
    for (const item of WITHDRAWN_CATALOG_ITEMS) {
      expect(catalog.arrangedByOffice).toContain(item.name);
      expect(priced).not.toContain(item.sku);
      // The withdrawn names are not sellable rows either (Lizo is not a 2026 model).
      if (item.sku === "ADD-COFFIN-LIZO-SR") expect(priced).not.toContain("Lizo");
      if (item.sku === "ADD-URN") expect(priced).not.toContain("Urn");
    }
  });

  it("keeps the plan rates read from the STORE, not a copy (an office edit is what a visitor sees)", () => {
    const edited = {
      ...pricing,
      plans: {
        regular: pricing.plans.regular.map((row) =>
          row.mode === "Monthly" ? { ...row, bronze1: 777 } : row,
        ),
        senior: pricing.plans.senior,
      },
    };
    const editedCatalog = builderCatalog(edited);
    expect(planRateCents(editedCatalog, "bronze1", "monthly", false)).toBe(77_700);
    // ...and the untouched document still answers with the sheet's own figure.
    expect(planRateCents(catalog, "bronze1", "monthly", false)).toBe(60_000);
  });
});

describe("preparation is priceable only where the sheet prices it", () => {
  it("follows the 3–9 day ladder and its +1,500/day line beyond it", () => {
    expect(embalmingPriceCents(catalog, 3)).toBe(600_000);
    expect(embalmingPriceCents(catalog, 5)).toBe(900_000);
    expect(embalmingPriceCents(catalog, 9)).toBe(1_500_000);
    expect(embalmingPriceCents(catalog, 10)).toBe(1_650_000);
    expect(embalmingPriceCents(catalog, 12)).toBe(1_950_000);
  });

  it("returns null — never a figure — below the sheet's shortest stay", () => {
    expect(embalmingPriceCents(catalog, 1)).toBeNull();
    expect(embalmingPriceCents(catalog, 2)).toBeNull();
  });

  it("clamps a chapel stay to the schedule the sheet prints", () => {
    const common = catalog.chapels[0];
    expect(chapelStay(common, 1)?.days).toBe(3);
    expect(chapelStay(common, 5)?.days).toBe(5);
    expect(chapelStay(common, 40)?.days).toBe(9);
  });
});

describe("the estimate is a running total over the sheet's figures", () => {
  it("prices a chosen casket and preparation, and leaves the senior column alone", () => {
    const standard = builderEstimate(
      catalog,
      choose({ casketModel: "White Rose Half", embalmingDays: 5 }),
    );
    // White Rose Half is ₱62,000 and five days' preparation ₱9,000.
    expect(standard.totalCents).toBe(6_200_000 + 900_000);
    expect(standard.lines.map((l) => l.label)).toEqual([
      "White Rose Half casket",
      "Preparation & casketing",
    ]);
  });

  it("uses the sheet's senior column for the casket and the chapel, and nothing else", () => {
    const seniors = builderEstimate(
      catalog,
      choose({
        senior: true,
        casketModel: "White Rose Half",
        embalmingDays: 5,
        services: ["Retrieval"],
      }),
    );
    const casket = seniors.lines.find((l) => l.group === "casket");
    const preparation = seniors.lines.find((l) => l.group === "preparation");
    const retrieval = seniors.lines.find((l) => l.label === "Retrieval");
    expect(casket?.amountCents).toBe(4_960_000); // the sheet's senior price
    expect(casket?.seniorRate).toBe(true);
    // The a-la-carte rows have no senior column: they keep their printed figure.
    expect(preparation?.amountCents).toBe(900_000);
    expect(retrieval?.amountCents).toBe(250_000);
    expect(retrieval?.seniorRate).toBeUndefined();
    expect(seniors.totalCents).toBe(4_960_000 + 900_000 + 250_000);
  });

  it("charges the chapel from the printed stay, regular or senior", () => {
    const regular = builderEstimate(
      catalog,
      choose({ chapelId: "common", chapelDays: 5 }),
    );
    expect(regular.totalCents).toBe(750_000);
    const senior = builderEstimate(
      catalog,
      choose({ senior: true, chapelId: "private", chapelDays: 5 }),
    );
    expect(senior.totalCents).toBe(1_680_000);
  });

  it("lists the steps still to answer and the item the office quotes — with no figure", () => {
    const empty = builderEstimate(catalog, choose());
    expect(empty.totalCents).toBe(0);
    expect(empty.lines).toEqual([]);
    expect(empty.pending).toEqual(["Casket", "Preparation days", "Chapel"]);
    expect(empty.officeQuotes).toEqual(["Burial lot — the office quotes it per plot"]);
    expect(empty.owned).toEqual([]);
  });

  it("reduces the total for what the family already has, without pricing it again", () => {
    const held = builderEstimate(
      catalog,
      choose({
        hasPlan: true,
        hasCasket: true,
        hasLot: true,
        casketModel: "Lumina",
        embalmingDays: 4,
        services: ["Retrieval", "Interment"],
      }),
    );
    // A held plan covers the package lines: they are reported, never counted
    // (the casket is the family's own, so it is not "covered" — it is theirs).
    expect(held.totalCents).toBe(0);
    expect(held.covered.map((l) => l.label)).toEqual([
      "Preparation & casketing",
      "Retrieval",
      "Interment",
    ]);
    expect(held.covered.every((l) => l.amountCents === null)).toBe(true);
    expect(held.owned).toEqual(["Your plan", "Your casket", "Your burial lot"]);
    expect(held.officeQuotes).toEqual([]);
    expect(held.planApplies).toBe(true);
  });

  it("keeps an owned casket out of the plan's covered list too", () => {
    const held = builderEstimate(catalog, choose({ hasPlan: true, hasCasket: true }));
    expect(held.covered.map((l) => l.label)).not.toContain("Casket");
    expect(held.covered.map((l) => l.label)).not.toContain("Lumina casket");
    // Only the chapel is left unaccounted for: the plan covers preparation.
    expect(held.pending).toEqual(["Chapel"]);
  });

  it("never adds the plan's instalment to the one-time total", () => {
    const planned = builderEstimate(
      catalog,
      choose({ planTier: "bronze1", planTerm: "monthly", chapelId: "common", chapelDays: 3 }),
    );
    expect(planned.monthly).toMatchObject({
      label: "Bronze 1 plan · Monthly",
      amountCents: 60_000,
      per: "/ month",
    });
    // Only the chapel is a one-time line: the plan covers the package lines.
    expect(planned.totalCents).toBe(450_000);
    expect(planned.covered.length).toBeGreaterThan(0);
    // The senior table is the sheet's own column.
    const seniorPlan = builderEstimate(
      catalog,
      choose({ senior: true, planTier: "bronze1", planTerm: "monthly" }),
    );
    expect(seniorPlan.monthly?.amountCents).toBe(55_000);
    expect(seniorPlan.monthly?.seniorRate).toBe(true);
  });

  it("prices the beyond-nine days ladder from the sheet's own extra-day line", () => {
    const long = builderEstimate(catalog, choose({ embalmingDays: EMBALMING_MAX_DAYS }));
    expect(long.totalCents).toBe(1_500_000 + 21 * 150_000);
  });
});

describe("the hand-over is the existing request seam", () => {
  it("writes the arrangement and the figure the visitor saw into /contact", () => {
    const selection = choose({
      senior: true,
      casketModel: "Lumina",
      embalmingDays: 3,
      services: ["Retrieval", "Interment"],
      chapelId: "private",
      chapelDays: 4,
    });
    const estimate = builderEstimate(catalog, selection);
    const href = builderRequestHref(catalog, selection);
    expect(href.startsWith("/contact?")).toBe(true);

    const parsed = parseRequestPrefill(new URL(href, "https://villa.test").searchParams);
    expect(parsed?.item).toBe("Smart Service Builder estimate");
    expect(parsed?.price).toBe(formatMinorUnits(estimate.totalCents));
    expect(parsed?.note).toContain("Lumina casket");
    expect(parsed?.note).toContain("senior-citizen rates");
    expect(parsed?.note).toContain("Private chapel 4 days");
    // The contact form's own message keeps saying this is an enquiry.
    expect(requestMessage(parsed!)).toContain("does not reserve the item");
  });

  it("keeps the note inside the seam's 200-character field for a full arrangement", () => {
    const note = builderRequestNote(
      catalog,
      choose({
        senior: true,
        casketModel: "Imperial Flexi",
        embalmingDays: 12,
        services: ["Retrieval", "Delivery", "Viewing equipment", "ORD coffin", "Interment"],
        chapelId: "private",
        chapelDays: 9,
        planTier: "gold",
        planTerm: "monthly",
      }),
    );
    expect(note.length).toBeLessThanOrEqual(200);
    // A long arrangement trims the list, never the honesty line.
    expect(note).toContain("An estimate, not a quote.");
  });

  it("omits the figure entirely when nothing is chosen yet", () => {
    const href = builderRequestHref(catalog, choose());
    const parsed = parseRequestPrefill(new URL(href, "https://villa.test").searchParams);
    expect(parsed?.price).toBeUndefined();
    expect(parsed?.note).toContain("no choices made yet");
  });

  it("has no casket option whose name the sheet does not carry", () => {
    expect(casketOptionOf(catalog, "Lumina")?.family).toBe("Lumina");
    expect(casketOptionOf(catalog, "Not A Model")).toBeNull();
    expect(casketOptionOf(catalog, null)).toBeNull();
  });
});
