import { describe, expect, it } from "vitest";
import {
  countWord,
  FAMILY_JARGON,
  familyAppointmentState,
  familyDayLabel,
  familyDocumentView,
  familyHousehold,
  familyInstantDateLabel,
  familyInstantTimeLabel,
  familyInstantWeekday,
  familyRequestState,
  monogram,
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

describe("the days a family screen prints", () => {
  it("prints a recorded calendar date in UTC, so no reader's timezone shifts it", () => {
    expect(familyDayLabel("2026-09-12")).toBe("12 September");
    expect(familyDayLabel("2026-01-01")).toBe("1 January");
  });

  it("prints an instant in the park's own time, day and clock separately", () => {
    // 2026-09-22T02:00:00Z is 10:00 AM on Tuesday in Asia/Manila (UTC+8) — the
    // boundary that would break a naive formatter is 16:00Z → the next day.
    expect(familyInstantWeekday("2026-09-22T02:00:00Z")).toBe("Tuesday");
    expect(familyInstantDateLabel("2026-09-22T02:00:00Z")).toBe("22 September");
    expect(familyInstantTimeLabel("2026-09-22T02:00:00Z")).toBe("10:00 AM");
    expect(familyInstantDateLabel("2026-09-22T16:30:00Z")).toBe("23 September");
  });

  it("renders a dash for an unusable value — never a broken or invented day", () => {
    expect(familyDayLabel("not-a-date")).toBe("—");
    expect(familyInstantWeekday("")).toBe("—");
    expect(familyInstantDateLabel("nope")).toBe("—");
    expect(familyInstantTimeLabel("nope")).toBe("—");
  });
});

describe("the requests and appointments wording", () => {
  it("says where a request stands in a family's words, and which wait is on them", () => {
    expect(familyRequestState("with_office")).toEqual({ label: "With the office", wait: false });
    expect(familyRequestState("waiting_on_you")).toEqual({ label: "Waiting on you", wait: true });
    expect(familyRequestState("done")).toEqual({ label: "Done", wait: false });
    // An unknown state never reaches the screen as a service-desk code.
    expect(familyRequestState("SLA_BREACH").label).toBe("With the office");
  });

  it("never presents an unconfirmed time as agreed", () => {
    expect(familyAppointmentState("confirmed")).toBe("Confirmed by the office");
    expect(familyAppointmentState("waiting")).toBe("Waiting for the office");
    expect(familyAppointmentState("past")).toBe("Happened");
    expect(familyAppointmentState("done")).toBe("Happened");
  });
});

describe("the memorial initials", () => {
  it("takes the first and last initial, never more than two letters", () => {
    expect(monogram("Ernesto Dela Cruz")).toBe("ED");
    expect(monogram("Rosa Villa")).toBe("RV");
    expect(monogram("Bong")).toBe("B");
    expect(monogram("  ")).toBe("");
    expect(monogram(undefined)).toBe("");
  });
});
