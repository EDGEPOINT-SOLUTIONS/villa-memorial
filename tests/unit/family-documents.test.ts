import { describe, expect, it, vi } from "vitest";
import { toFamilyDocument, type FamilyDocument } from "@/lib/api-client/family";
import type { PaperBlock } from "@/lib/export/types";
import {
  FAMILY_RECEIPT_COPY_NOTE,
  OWNED_PAPER_WORDS,
  buildFamilyReceiptPaper,
  familyDate,
  familyPapers,
  familyReceiptFileStem,
  familyReceiptHasCopy,
  familyReceiptHref,
  isOwnedPaper,
  ownedPaperNote,
  receiptSummary,
} from "@/lib/family/family-documents";

/**
 * The family's own papers — the projection rule and the receipt-copy rule.
 *
 * The captain's rule (2026-09-17): the service contract and every official receipt
 * belong to the family. These tests pin:
 *  - which records count as owned (and that an unknown kind never silently gains the
 *    ownership treatment),
 *  - the family-safe projection that runs at the data seam (staff-only fields dropped),
 *  - a receipt copy existing ONLY when the record carries its own number, date and
 *    amount — never a half-receipt assembled from missing cells.
 */

const contract: FamilyDocument = {
  title: "Service contract",
  status: "Generated",
  kind: "service_contract",
};

const receipt: FamilyDocument = {
  title: "Official receipt",
  status: "Sent",
  kind: "official_receipt",
  reference: "OR-2026-00412",
  issued_on: "2026-09-12",
  amount: "₱12,000",
  covers: "Villa Memorial Plan",
};

const permit: FamilyDocument = {
  title: "Burial permit",
  status: "verified",
  kind: "other",
};

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

describe("which papers the family owns", () => {
  it("owns the service contract and official receipts, and nothing else", () => {
    expect(isOwnedPaper(contract)).toBe(true);
    expect(isOwnedPaper(receipt)).toBe(true);
    expect(isOwnedPaper(permit)).toBe(false);
  });

  it("sorts the record into the contract, the receipts and the requestable rest", () => {
    const split = familyPapers([contract, receipt, permit]);
    expect(split.contract?.title).toBe("Service contract");
    expect(split.receipts.map((r) => r.title)).toEqual(["Official receipt"]);
    expect(split.requestable.map((r) => r.title)).toEqual(["Burial permit"]);
  });

  it("treats a missing contract and no receipts as empty, never as an error", () => {
    const split = familyPapers([]);
    expect(split.contract).toBeNull();
    expect(split.receipts).toEqual([]);
    expect(split.requestable).toEqual([]);
  });
});

describe("the family-safe projection at the data seam", () => {
  it("keeps only the allowed fields of a raw document record", () => {
    const projected = toFamilyDocument({
      title: "Service contract",
      status: "Generated",
      kind: "service_contract",
      reference: "SC-2026-0001",
      issued_on: "2026-09-10",
      amount: "₱1,000",
      covers: "the funeral",
      // Everything below is staff-only and must never survive the seam:
      uploaded_by: "Elena Villanueva",
      file_size_bytes: 245000,
      internal_notes: "customer asked for a discount",
      related_case_number: "CASE-2026-0001",
    });
    expect(projected).toEqual({
      title: "Service contract",
      status: "Generated",
      kind: "service_contract",
      reference: "SC-2026-0001",
      issued_on: "2026-09-10",
      amount: "₱1,000",
      covers: "the funeral",
    });
    const serialized = JSON.stringify(projected);
    for (const staffField of ["Elena", "245000", "discount", "CASE-2026-0001"]) {
      expect(serialized).not.toContain(staffField);
    }
  });

  it("keeps an unknown kind requestable rather than granting it ownership", () => {
    const projected = toFamilyDocument({ title: "Death certificate", status: "verified" });
    expect(projected?.kind).toBe("other");
    expect(projected ? isOwnedPaper(projected) : true).toBe(false);
  });

  it("drops a record with no usable title instead of rendering a blank row", () => {
    expect(toFamilyDocument({ status: "approved" })).toBeNull();
    expect(toFamilyDocument(null)).toBeNull();
  });
});

describe("the receipt' words", () => {
  it("reads a recorded date in the family's words, and keeps unknown text as-is", () => {
    expect(familyDate("2026-09-12")).toBe("12 September 2026");
    expect(familyDate("sometime in September")).toBe("sometime in September");
  });

  it("summarises only what the record carries — no placeholder figure", () => {
    expect(receiptSummary(receipt)).toBe("₱12,000 · received 12 September 2026 · for Villa Memorial Plan");
    expect(receiptSummary({ amount: "₱500" })).toBe("₱500");
    expect(receiptSummary({})).toBe("");
  });

  it("owns the paper in plain words, with the getting-ready state when no copy exists", () => {
    expect(ownedPaperNote(contract)).toContain(OWNED_PAPER_WORDS);
    expect(ownedPaperNote(contract)).toContain("getting it ready for this page");
    expect(ownedPaperNote(receipt)).toContain("₱12,000");
    expect(ownedPaperNote(receipt)).toContain("always here");
  });
});

describe("a receipt copy exists only when the record is whole", () => {
  it("needs the receipt's own number, the date received and the amount", () => {
    expect(familyReceiptHasCopy(receipt)).toBe(true);
    expect(familyReceiptHasCopy({ ...receipt, reference: undefined })).toBe(false);
    expect(familyReceiptHasCopy({ ...receipt, issued_on: undefined })).toBe(false);
    expect(familyReceiptHasCopy({ ...receipt, amount: undefined })).toBe(false);
    expect(familyReceiptHasCopy({ ...permit })).toBe(false);
  });

  it("links to the family route only when there is a copy to open", () => {
    expect(familyReceiptHref(receipt)).toBe("/client/documents/receipts/OR-2026-00412");
    expect(familyReceiptHref({ ...receipt, amount: undefined })).toBeNull();
    expect(familyReceiptHref(permit)).toBeNull();
  });

  it("assembles the copy from the recorded cells only", () => {
    const text = blockText(buildFamilyReceiptPaper(receipt).blocks);
    expect(text).toContain("OR-2026-00412");
    expect(text).toContain("12 September 2026");
    expect(text).toContain("₱12,000");
    expect(text).toContain("Villa Memorial Plan");
    expect(text).toContain(FAMILY_RECEIPT_COPY_NOTE);
    expect(text).toContain("Your family's copy");
  });

  it("prints the honest em dash where the record has no coverage line", () => {
    const text = blockText(buildFamilyReceiptPaper({ ...receipt, covers: undefined }).blocks);
    expect(text).toContain("For: —");
  });

  it("refuses to assemble a receipt from a half-record", () => {
    expect(() => buildFamilyReceiptPaper({ ...receipt, reference: undefined })).toThrow();
    expect(() => buildFamilyReceiptPaper(permit)).toThrow();
  });

  it("names the export file after the receipt it is", () => {
    expect(familyReceiptFileStem(receipt)).toBe("Official-Receipt-OR-2026-00412-2026-09-12");
  });
});

/* ------------------------------------------------------------------ */
/* The projection as it actually runs on the snapshot fixture          */
/* ------------------------------------------------------------------ */

const rawSnapshot = vi.hoisted(() => ({
  _provenance: { status: "PROVISIONAL", note: "balance_cents" },
  tenant_id: "00000000-0000-4000-8000-000000000001",
  family: { display_name: "Cory Customer", email: "customer@vm.demo", primary_contact: "0917" },
  loved_ones: [
    {
      id: "ernesto-dela-cruz",
      name: "Ernesto Dela Cruz",
      life_dates: "1948 – 2026",
      plan_summary: { plan_name: "Premium Lawn", status: "Active", term: "5 years", next_due: "soon" },
      balance: { total: "₱42,000", paid: "₱20,000", remaining: "₱22,000" },
      balance_cents: { total: 4200000, paid: 2000000, remaining: 2200000 },
      recent_documents: [
        {
          title: "Service contract",
          status: "Generated",
          kind: "service_contract",
          uploaded_by: "Elena Villanueva",
          file_size_bytes: 245000,
          internal_notes: "staff eyes only",
        },
        {
          title: "Official receipt",
          status: "Sent",
          kind: "official_receipt",
          reference: "OR-2026-00412",
          issued_on: "2026-09-12",
          amount: "₱12,000",
          covers: "Villa Memorial Plan",
        },
      ],
    },
  ],
}));

vi.mock("@/lib/fixtures/family/snapshot.json", () => ({ default: rawSnapshot }));

describe("getFamilySnapshot projects documents at the seam", () => {
  it("drops every staff-only field before anything can render it", async () => {
    const { getFamilySnapshot } = await import("@/lib/api-client/family");
    const snapshot = await getFamilySnapshot();
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("Elena Villanueva");
    expect(serialized).not.toContain("245000");
    expect(serialized).not.toContain("staff eyes only");
    expect(snapshot!.recent_documents[0]).toEqual({
      title: "Service contract",
      status: "Generated",
      kind: "service_contract",
      reference: undefined,
      issued_on: undefined,
      amount: undefined,
      covers: undefined,
    });
  });

  it("keeps the family-safe receipt cells intact", async () => {
    const { getFamilySnapshot } = await import("@/lib/api-client/family");
    const snapshot = await getFamilySnapshot();
    expect(snapshot!.recent_documents[1]).toMatchObject({
      kind: "official_receipt",
      reference: "OR-2026-00412",
      issued_on: "2026-09-12",
      amount: "₱12,000",
      covers: "Villa Memorial Plan",
    });
    expect(familyReceiptHasCopy(snapshot!.recent_documents[1])).toBe(true);
  });
});

// The suite's own snapshot seed carries one loved one, so the household reader
// still needs that person's workspace record (the product workspace starts clean).
vi.mock("@/lib/fixtures/family/workspace.json", async () => ({
  default: (await import("../fixtures/family-workspace-demo.json")).default,
}));
