import { describe, expect, it } from "vitest";
import snapshot from "@/lib/fixtures/family/snapshot.json";
import {
  buildFamilyNeeds,
  FAMILY_JARGON,
  FAMILY_SOURCES_MISSING,
  familyDocumentView,
  paidPercent,
  pesoFromCents,
} from "@/lib/family/family-view";
import type { FamilySnapshot } from "@/lib/api-client/family";

const base = snapshot as unknown as FamilySnapshot;

describe("family money helpers", () => {
  it("formats minor units as pesos without parsing display strings", () => {
    expect(pesoFromCents(2200000)).toBe("₱22,000");
    expect(pesoFromCents(0)).toBe("₱0");
    expect(pesoFromCents(123456)).toBe("₱1,234");
  });

  it("refuses non-integer or negative amounts", () => {
    expect(() => pesoFromCents(-1)).toThrow();
    expect(() => pesoFromCents(12.5)).toThrow();
  });

  it("computes a plan's paid share from integer minor units", () => {
    expect(paidPercent(4200000, 2000000)).toBe(48);
    expect(paidPercent(4200000, 4200000)).toBe(100);
    expect(paidPercent(0, 0)).toBe(0);
  });
});

describe("family document wording", () => {
  it("turns every stored status into a family's words with a next step", () => {
    expect(familyDocumentView("Service contract", "Generated")).toMatchObject({
      status: "Ready",
      tone: "success",
    });
    expect(familyDocumentView("Official receipt", "Sent").status).toBe("Ready");
    expect(familyDocumentView("Death certificate", "pending_review")).toMatchObject({
      status: "Being checked",
      tone: "warning",
    });
    expect(familyDocumentView("Burial permit", "verified").status).toBe("Checked");
    expect(familyDocumentView("ID", "rejected").status).toBe("We need a clearer copy");
  });

  it("never leaks a raw code for an unknown status", () => {
    const view = familyDocumentView("Something", "");
    expect(view.status).toBe("On file");
    expect(view.note).toBeTruthy();
  });
});

describe("what needs me now", () => {
  it("orders by band: money that matters, then what is ready", () => {
    const needs = buildFamilyNeeds(base);
    expect(needs.map((n) => n.kind)).toEqual(["due", "ready"]);
    expect(needs[0].title).toContain("₱22,000");
    expect(needs[1].title).toContain("2 papers");
  });

  it("is calm and empty when nothing in the snapshot needs the family", () => {
    const settled: FamilySnapshot = {
      ...base,
      balance: { total: "₱42,000", paid: "₱42,000", remaining: "₱0" },
      balance_cents: { total: 4200000, paid: 4200000, remaining: 0 },
      recent_documents: [],
    };
    expect(buildFamilyNeeds(settled)).toEqual([]);
  });

  it("shows at most three cards (design rule)", () => {
    const noisy: FamilySnapshot = {
      ...base,
      recent_documents: Array.from({ length: 9 }, (_, i) => ({
        title: `Paper ${i}`,
        status: "Generated",
      })),
    };
    expect(buildFamilyNeeds(noisy).length).toBeLessThanOrEqual(3);
  });

  it("never renders an amount it was not given", () => {
    const withoutCents: FamilySnapshot = { ...base, balance_cents: undefined };
    const needs = buildFamilyNeeds(withoutCents);
    // Without integer amounts the money card is withheld rather than guessed
    // from the display string.
    expect(needs.some((n) => n.kind === "due")).toBe(false);
  });
});

describe("family-facing copy guard", () => {
  it("keeps the missing-source list explicit, so no page can quietly fake data", () => {
    expect(FAMILY_SOURCES_MISSING.length).toBeGreaterThan(0);
    for (const source of FAMILY_SOURCES_MISSING) {
      expect(source.trim().length).toBeGreaterThan(10);
    }
  });

  it("names the words a family never sees", () => {
    expect(FAMILY_JARGON).toContain("AR aging");
    expect(FAMILY_JARGON).toContain("forfeit");
    for (const word of FAMILY_JARGON) {
      expect(word.trim().length).toBeGreaterThan(2);
    }
  });
});
