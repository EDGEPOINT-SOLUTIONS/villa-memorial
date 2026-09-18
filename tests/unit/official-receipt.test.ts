import { describe, expect, it } from "vitest";
import {
  FAMILY_RECEIPT_COPY_NOTE,
  OFFICE_RECEIPT_COPY_NOTE,
  buildOfficialReceiptPaper,
  officialReceiptFileStem,
  receiptDateWords,
  receiptHasFigures,
  type OfficialReceiptFigures,
} from "@/lib/contracts/official-receipt";
import type { PaperBlock } from "@/lib/export/types";

/**
 * The ONE official-receipt sheet: the office's copy and the family's copy are the same
 * document, and the day a payment is recorded nothing about the family's view of it may
 * change. These tests pin the gate (no number + date + amount, no receipt), the cells, and
 * the fact that both copies carry the same recorded figures.
 */

function blockText(blocks: PaperBlock[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "line") return block.text;
      if (block.kind === "table") {
        return block.rows
          .flat()
          .map((cell) => [cell.label, cell.value].filter(Boolean).join(": "))
          .join(" | ");
      }
      return "";
    })
    .join("\n");
}

const figures: OfficialReceiptFigures = {
  number: "DOC-2026-00007",
  received_on: "2026-09-18",
  amount: "₱5,000.00",
  covers: "INV-2026-00003 · ORD-2026-00003",
  payer: "Liwayway Cruz",
  received_by: "Sam Staff",
  method: "Cash",
  reference: "CHK-004512",
};

describe("a receipt exists only when the record is whole", () => {
  it("needs the receipt's own number, the day received and the amount", () => {
    expect(receiptHasFigures(figures)).toBe(true);
    expect(receiptHasFigures({ ...figures, number: "" })).toBe(false);
    expect(receiptHasFigures({ ...figures, received_on: "" })).toBe(false);
    expect(receiptHasFigures({ ...figures, amount: "" })).toBe(false);
  });

  it("refuses to assemble a sheet from a half-record rather than inventing cells", () => {
    expect(() => buildOfficialReceiptPaper({ ...figures, number: "" }, "office")).toThrow();
    expect(() => buildOfficialReceiptPaper({ ...figures, amount: "" }, "family")).toThrow();
  });
});

describe("the day on the paper", () => {
  it("reads a recorded day in words, and keeps unknown text as the record's own", () => {
    expect(receiptDateWords("2026-09-18")).toBe("18 September 2026");
    expect(receiptDateWords("sometime in September")).toBe("sometime in September");
    expect(receiptDateWords("2026-02-30")).toBe("2026-02-30");
  });
});

describe("one sheet, two copies", () => {
  it("prints the same recorded figures on both copies", () => {
    const office = blockText(buildOfficialReceiptPaper(figures, "office").blocks);
    const family = blockText(buildOfficialReceiptPaper(figures, "family").blocks);
    for (const recorded of ["DOC-2026-00007", "18 September 2026", "₱5,000.00", "INV-2026-00003"]) {
      expect(office, recorded).toContain(recorded);
      expect(family, recorded).toContain(recorded);
    }
  });

  it("names which copy it is, and carries that copy's own note", () => {
    const office = blockText(buildOfficialReceiptPaper(figures, "office").blocks);
    const family = blockText(buildOfficialReceiptPaper(figures, "family").blocks);
    expect(office).toContain("Office copy");
    expect(office).toContain(OFFICE_RECEIPT_COPY_NOTE);
    expect(family).toContain("Your family's copy");
    expect(family).toContain(FAMILY_RECEIPT_COPY_NOTE);
  });

  it("prints the counter's detail on the office copy only", () => {
    const office = blockText(buildOfficialReceiptPaper(figures, "office").blocks);
    expect(office).toContain("Received from: Liwayway Cruz");
    expect(office).toContain("Received by: Sam Staff");
    expect(office).toContain("Payment method: Cash · CHK-004512");

    // The family's record carries none of it, so none of it prints.
    const lean: OfficialReceiptFigures = {
      number: figures.number,
      received_on: figures.received_on,
      amount: figures.amount,
      covers: figures.covers,
    };
    const family = blockText(buildOfficialReceiptPaper(lean, "family").blocks);
    expect(family).not.toContain("Received from");
    expect(family).not.toContain("Received by");
    expect(family).not.toContain("Payment method");
  });

  it("prints the honest em dash where the record has no coverage line", () => {
    const text = blockText(
      buildOfficialReceiptPaper({ ...figures, covers: null }, "office").blocks,
    );
    expect(text).toContain("For: —");
  });
});

describe("the export filename", () => {
  it("names the file after the receipt it is, on both copies", () => {
    expect(officialReceiptFileStem("DOC-2026-00007", "2026-09-18")).toBe(
      "Official-Receipt-DOC-2026-00007-2026-09-18",
    );
  });
});
