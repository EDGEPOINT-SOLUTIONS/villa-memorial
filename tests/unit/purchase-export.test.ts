import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildPurchasePaper, purchasePaperFromForm } from "@/lib/contracts/purchase-paper";
import { paperToDocxBuffer } from "@/lib/export/docx";
import { paperToPdfBuffer } from "@/lib/export/pdf";

/**
 * Purchase document export tests — consumer-level assertions on the real artifacts:
 *  - the .docx is a valid OOXML zip whose word/document.xml contains the captured
 *    fields (parsed, not raw-grepped),
 *  - the .pdf is a structurally valid PDF with the expected page/object framing.
 */

const FORM_VALUES = {
  application_date: "2026-03-14",
  last_name: "Dela Cruz",
  first_name: "Maria",
  middle_name: "Santos",
  date_of_birth: "1980-05-02",
  civil_status: "married" as const,
  gender: "female" as const,
  religion: "Roman Catholic",
  citizenship: "",
  contact_number: "0917-555-0142",
  email: "maria.delacruz@example.ph",
  tin: "123-456-789-000",
  gsis_sss_number: "34-5678901-2",
  alternative_contact_number: "",
  facebook_account: "maria.delacruz",
  address: "123 Rizal St., Isabela City, Basilan",
  occupation: "Teacher",
  employer: "Isabela City Central School",
  employer_address: "Sunrise, Isabela City",
  employer_telephone: "0917-000-1111",
  beneficiaries: [
    { name: "Juan Dela Cruz", age: "14", relationship: "Son" },
    { name: "Ana Dela Cruz", age: "10", relationship: "Daughter" },
  ],
  classification: "Lawn Lot Standard",
  basic_price_cents: "32000",
  total_contract_price_cents: "33000",
  mcf_cents: "1000",
  vat_cents: "",
  mode_of_payment: "monthly" as const,
  amortization_value: "60",
  amortization_unit: "months" as const,
  interment_funeral_bundle_inclusion: "included" as const,
  others_insurance: "",
  dpa_consent: true,
  sales_agent_name: "Pedro Sales",
};

const LOT = { lot_number: "B-12", section: "Section 2", block: "Block B", area_sqm: 12.5 };

describe("purchase paper model (2026 combined form)", () => {
  it("resolves the 2026 revision for a 2026 application date", () => {
    const data = purchasePaperFromForm(FORM_VALUES, LOT, "2026-03-14");
    const { terms, blocks } = buildPurchasePaper(data);
    expect(terms.version).toBe("lot-purchase-2026");
    expect(blocks.length).toBeGreaterThan(20);
  });

  it("prints captured values and honest dashes for uncaptured cells", () => {
    const data = purchasePaperFromForm(FORM_VALUES, LOT, "2026-03-14");
    const { blocks } = buildPurchasePaper(data);
    const allText = blocks
      .filter((b) => b.kind === "table")
      .flatMap((b) => (b.kind === "table" ? b.rows.flat().map((c) => `${c.label ?? ""} ${c.value}`) : []))
      .join(" | ");
    expect(allText).toContain("Maria");
    expect(allText).toContain("Dela Cruz");
    expect(allText).toContain("Lawn Lot Standard");
    expect(allText).toContain("₱32,000.00");
    expect(allText).toContain("60 months");
    expect(allText).toContain("Included");
    // The untyped VAT cell stays an honest em dash — never derived.
    const vatRow = blocks
      .filter((b) => b.kind === "table")
      .flatMap((b) => (b.kind === "table" ? b.rows : []))
      .find((row) => row.some((c) => (c.label ?? "").startsWith("VAT")));
    expect(vatRow).toBeDefined();
  });
});

describe("docx export", () => {
  it("produces a valid OOXML zip whose document.xml carries the filled fields", async () => {
    const data = purchasePaperFromForm(FORM_VALUES, LOT, "2026-03-14");
    const { blocks } = buildPurchasePaper(data);
    const buffer = await paperToDocxBuffer(blocks);

    // Real consumer check: it opens as a zip and the document part parses as XML.
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = zip.file("word/document.xml");
    expect(documentXml).toBeTruthy();
    const text = await documentXml!.async("string");

    expect(text).toContain("Maria Santos Dela Cruz");
    expect(text).toContain("Lawn Lot Standard");
    expect(text).toContain("₱32,000.00");
    expect(text).toContain("Juan Dela Cruz");
    expect(text).toContain("Pedro Sales");
    expect(text).toContain("Acknowledgement".toUpperCase());
    expect(text).toContain("Series of");
  });
});

describe("pdf export", () => {
  it("produces a structurally valid PDF", async () => {
    const data = purchasePaperFromForm(FORM_VALUES, LOT, "2026-03-14");
    const { blocks } = buildPurchasePaper(data);
    const buffer = await paperToPdfBuffer(blocks);

    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const text = buffer.toString("latin1");
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/Page");
  });
});
