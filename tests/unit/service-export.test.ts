import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { emptyDraftForCase } from "@/lib/contracts/service-contract-capture";
import { buildServicePaper } from "@/lib/contracts/service-paper";
import { termsByVersion } from "@/lib/contracts/villa-terms";
import { paperToDocxBuffer } from "@/lib/export/docx";
import { paperToPdfBuffer } from "@/lib/export/pdf";

/**
 * Funeral Service Contract export — consumer-level assertions on the real artifacts:
 * the .docx parses as an OOXML zip whose word/document.xml carries the captured fields
 * and the versioned clause wording; the .pdf is structurally valid. Same rules as the
 * purchase exports: no money invented (amount cells stay honest em dashes), wording
 * from villa-terms.ts only.
 */

const KASE = { case_number: "FSC-2026-0042", deceased_name: "Jose R. Ramirez" };
const INTAKE = {
  date_of_death: "2026-08-27",
  deceased_date_of_birth: "1943-03-11",
  deceased_gender: "male",
  deceased_civil_status: "married",
  senior_citizen: true,
  client_name: "Maria L. Ramirez",
  client_gender: "female",
  client_civil_status: "widowed",
  client_address: "Aguada, Isabela City, Basilan",
  client_contact: "0917 000 1111",
  client_facebook: "fb.com/maria.ramirez",
  client_email: "maria.ramirez@example.com",
  client_relationship: "Spouse",
  client_id_presented: "Driver's License",
  client_id_number: "D12-34-567890",
  co_maker_name: "Ramon D. Ramirez",
  contract_date: "2026-08-28",
  completed_at: null,
} as never;
const ORDER = {
  number: "ORD-2026-0111",
  currency: "PHP",
  total_cents: 1850000,
} as never;

describe("service paper model", () => {
  it("resolves the 2025 service terms and carries captured rows/deductions", () => {
    const draft = emptyDraftForCase({ services: ["ROD", "Embalming"] });
    draft.services.rod.applied = true;
    const others = draft.services.others as { applied: boolean; detail: string };
    others.applied = true;
    others.detail = "Marble Flower Cart";
    const embalming = draft.deals.embalming as { applied: boolean; days: string };
    embalming.applied = true;
    embalming.days = "3";
    draft.deals.interment.applied = true;
    draft.deductions.sss_id = "33-4455-6677";
    draft.deductions.dswd_senior = true;

    const terms = termsByVersion("service-contract-2025") ?? null;
    const { blocks, terms: resolved } = buildServicePaper({ kase: KASE, intake: INTAKE, order: ORDER, draft, terms, signedOn: "2026-08-28" });
    expect(resolved?.version).toBe("service-contract-2025");
    const text = blocks
      .filter((b) => b.kind === "table")
      .flatMap((b) => (b.kind === "table" ? b.rows.flat().map((c) => `${c.label ?? ""} ${c.value}`) : []))
      .join(" | ");
    expect(text).toContain("Jose R. Ramirez");
    expect(text).toContain("Marble Flower Cart");
    expect(text).toContain("GRAND TOTAL AFTER DEDUCTIONS:");
    expect(text).toContain("BALANCE & DUE DATE");
  });
});

describe("service contract docx export", () => {
  it("produces a valid OOXML zip carrying the filled fields and clause wording", async () => {
    const draft = emptyDraftForCase({ services: ["ROD", "Embalming"] });
    draft.services.rod.applied = true;
    const embalming = draft.deals.embalming as { applied: boolean; days: string };
    embalming.applied = true;
    embalming.days = "3";
    draft.deductions.sss_id = "33-4455-6677";

    const terms = termsByVersion("service-contract-2025") ?? null;
    const { blocks } = buildServicePaper({ kase: KASE, intake: INTAKE, order: ORDER, draft, terms, signedOn: "2026-08-28" });
    const buffer = await paperToDocxBuffer(blocks);

    const zip = await JSZip.loadAsync(buffer);
    const documentXml = zip.file("word/document.xml");
    expect(documentXml).toBeTruthy();
    const text = await documentXml!.async("string");
    expect(text).toContain("SERVICE CONTRACT");
    expect(text).toContain("Jose R. Ramirez");
    expect(text).toContain("Maria L. Ramirez");
    expect(text).toContain("SSS (ID# 33-4455-6677)");
    // Versioned clause wording flows through, not a template placeholder.
    expect(text).toContain("nine (9) days after the date of this contract");
    expect(text).toContain("Doc. No. ____");
  });
});

describe("service contract pdf export", () => {
  it("produces a structurally valid PDF", async () => {
    const draft = emptyDraftForCase({ services: [] });
    const terms = termsByVersion("service-contract-2025") ?? null;
    const { blocks } = buildServicePaper({ kase: KASE, intake: INTAKE, order: null, draft, terms, signedOn: "2026-08-28" });
    const buffer = await paperToPdfBuffer(blocks);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const text = buffer.toString("latin1");
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/Page");
  });
});
