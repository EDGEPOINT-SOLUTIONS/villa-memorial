import { describe, expect, it } from "vitest";
import {
  countWord,
  FAMILY_JARGON,
  familyDocumentView,
  familyHousehold,
  paidPercent,
  percentWords,
} from "@/lib/family/family-view";

describe("family money helpers", () => {
  it("computes a plan's paid share from integer minor units", () => {
    expect(paidPercent(4200000, 2000000)).toBe(48);
    expect(paidPercent(4200000, 4200000)).toBe(100);
    expect(paidPercent(0, 0)).toBe(0);
  });

  it("says the share in words a family would say, never a percentage alone", () => {
    expect(percentWords(0)).toBe("nothing yet");
    expect(percentWords(4)).toBe("just started");
    expect(percentWords(48)).toBe("almost half");
    expect(percentWords(50)).toBe("half");
    expect(percentWords(76)).toBe("more than half");
    expect(percentWords(97)).toBe("almost finished");
    expect(percentWords(100)).toBe("paid in full");
  });

  it("counts small things in words — “Two papers”, never “2 papers”", () => {
    expect(countWord(1)).toBe("One");
    expect(countWord(2)).toBe("Two");
    expect(countWord(10)).toBe("Ten");
    expect(countWord(11)).toBe("11");
  });
});

describe("the household name under the brand", () => {
  it("derives a family name from the loved one, keeping Filipino two-word surnames", () => {
    expect(familyHousehold("Ernesto Dela Cruz")).toBe("Dela Cruz family");
    expect(familyHousehold("Rosa Villa")).toBe("Villa family");
    expect(familyHousehold("Bong")).toBe("Bong family");
  });

  it("falls back to the account holder, then to a plain phrase — never a blank", () => {
    expect(familyHousehold(null, "Cory Customer")).toBe("Cory family");
    expect(familyHousehold("", "")).toBe("your family");
    expect(familyHousehold(undefined)).toBe("your family");
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

describe("family-facing copy guard", () => {
  it("names the words a family never sees", () => {
    expect(FAMILY_JARGON).toContain("AR aging");
    expect(FAMILY_JARGON).toContain("forfeit");
    for (const word of FAMILY_JARGON) {
      expect(word.trim().length).toBeGreaterThan(2);
    }
  });
});
