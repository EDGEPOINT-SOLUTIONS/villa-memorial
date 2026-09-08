import { describe, expect, it } from "vitest";
import {
  resolveTerms,
  termsByVersion,
  TERMS_REVISIONS,
} from "@/lib/contracts/villa-terms";
import { addDays, buildServiceContract, PAYMENT_TERM_DAYS } from "@/lib/contracts/service-contract";
import type { Case } from "@/lib/api-client/operations";
import type { OrderResponse } from "@/lib/api-client/commerce";
import type { Lot } from "@/lib/api-client/property";
import {
  buildPurchaseAgreement,
  canGeneratePurchaseAgreement,
} from "@/lib/contracts/purchase-agreement";

/**
 * Villa's contract terms changed between 2025 and 2026 in ways that change money: the 2025
 * purchase agreement refunds a cancelling buyer less a 30% liquidated-damages deduction,
 * the 2026 one refunds nothing at all. These tests pin the consequences of that — which
 * revision governs which date, and that a signed agreement can always be re-rendered under
 * the terms it was signed under rather than today's.
 */

const CASE: Case = {
  id: "case-uuid-1",
  case_number: "CASE-2026-0001",
  deceased_name: "Pedro Santos",
  stage: "preparation",
  assigned_coordinator: "Sam Staff",
  linked_order_number: "ORD-2026-0001",
  services: ["Basic Package", "Interment Service", "Extra vigil night"],
  created_at: "2026-08-29T00:00:00Z",
  updated_at: "2026-08-29T00:00:00Z",
  tasks: [],
  intake: null,
};

const INTAKE: NonNullable<Case["intake"]> = {
  date_of_death: "2026-08-27",
  deceased_date_of_birth: "1948-03-11",
  deceased_gender: "male",
  deceased_civil_status: "married",
  senior_citizen: true,
  client_name: "Ana Santos",
  client_address: "Aguada, Isabela City",
  client_contact: "0917 000 1111",
  client_relationship: "Daughter",
  client_id_presented: "Driver's License",
  client_id_number: "N01-23-456789",
  co_maker_name: "Ramon Santos",
  contract_date: "2026-08-28",
  completed_at: "2026-08-29T01:00:00Z",
};

const ORDER: OrderResponse = {
  number: "ORD-2026-0001",
  status: "pending",
  customer_name: "Juan dela Cruz",
  total_cents: 270_000,
  currency: "PHP",
  items: [
    {
      catalog_item_id: 1,
      item_type: "package",
      sku: "PKG-BASIC",
      name: "Basic Package",
      quantity: 1,
      unit_price_cents: 150_000,
    },
    {
      catalog_item_id: 2,
      item_type: "service",
      sku: "SRV-INTERMENT",
      name: "Interment Service",
      quantity: 1,
      unit_price_cents: 120_000,
    },
  ],
};

function build(overrides: Partial<Parameters<typeof buildServiceContract>[0]> = {}) {
  return buildServiceContract({
    kase: CASE,
    order: ORDER,
    tenantName: "Villa Memoria",
    signedOn: "2026-08-29T04:00:00Z",
    ...overrides,
  });
}

describe("terms revisions", () => {
  it("picks the revision in force on the signing date, not the latest one", () => {
    expect(resolveTerms("lot_purchase", "2025-06-01").version).toBe("lot-purchase-2025");
    expect(resolveTerms("lot_purchase", "2026-08-29").version).toBe("lot-purchase-2026");
  });

  it("treats effectiveUntil as exclusive so the two revisions never both apply", () => {
    expect(resolveTerms("lot_purchase", "2025-12-31").version).toBe("lot-purchase-2025");
    expect(resolveTerms("lot_purchase", "2026-01-01").version).toBe("lot-purchase-2026");
  });

  it("refuses to guess when no revision covers the date", () => {
    expect(() => resolveTerms("lot_purchase", "2024-12-31")).toThrow(/no lot_purchase terms/);
  });

  it("re-renders a signed agreement under its own stored version", () => {
    const stored = termsByVersion("lot-purchase-2025");
    expect(stored?.clauses.join(" ")).toContain("thirty percent (30%)");
    expect(stored?.clauses.join(" ")).not.toContain("shall not refund");
  });

  it("carries the 2026 changes that cost a buyer money", () => {
    const y2026 = termsByVersion("lot-purchase-2026")!.clauses.join(" ");
    expect(y2026).toContain("shall not refund");
    expect(y2026).toContain("sixty (60) days to transfer or sell");
    expect(y2026).toContain("PHP 50,000.00");
    expect(y2026).not.toContain("PHP 20,000.00");
  });

  it("states the service contract's own deadlines verbatim", () => {
    const sc = termsByVersion("service-contract-2025")!.clauses.join(" ");
    expect(sc).toContain("nine (9) days");
    expect(sc).toContain("three (3) days");
    expect(sc).toContain("ten percent (10%) per month");
  });

  it("gives every revision a unique version string", () => {
    const versions = TERMS_REVISIONS.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
  });
});

describe("service contract payload", () => {
  it("dates the balance nine days out, per clause 1", () => {
    expect(addDays("2026-08-29", PAYMENT_TERM_DAYS)).toBe("2026-09-07");
    // Month and year rollover, because the counter signs contracts in December too.
    expect(addDays("2026-12-28", PAYMENT_TERM_DAYS)).toBe("2027-01-06");

    const balance = build().variables.totals as Array<{ label: string; note?: string }>;
    expect(balance.find((r) => r.label === "Balance and due date")?.note).toContain(
      "2026-09-07",
    );
  });

  it("prices the schedule from the order's lines, in minor units", () => {
    const schedule = build().variables.schedule as Array<{
      label: string;
      amount_minor_units?: number;
      note?: string;
    }>;
    expect(schedule[0]).toMatchObject({ label: "Basic Package", amount_minor_units: 150_000 });
    expect(schedule[1]).toMatchObject({
      label: "Interment Service",
      amount_minor_units: 120_000,
    });
  });

  it("lists a case service with no order line as unpriced, never as zero", () => {
    const schedule = build().variables.schedule as Array<{
      label: string;
      amount_minor_units?: number;
      note?: string;
    }>;
    const extra = schedule.find((r) => r.label === "Extra vigil night");
    expect(extra).toBeDefined();
    expect(extra?.amount_minor_units).toBeUndefined();
    expect(extra?.note).toContain("not priced");
  });

  it("leaves uncaptured intake fields blank rather than inventing them", () => {
    const particulars = build().variables.particulars as Array<{
      label: string;
      value: string;
    }>;
    expect(particulars.find((p) => p.label === "Name of deceased")?.value).toBe("Pedro Santos");
    expect(particulars.find((p) => p.label === "Date of death")?.value).toBe("");
    expect(particulars.find((p) => p.label === "ID presented")?.value).toBe("");
  });

  it("omits the deductions section while the guarantee sub-ledger does not exist", () => {
    expect(build().variables.adjustments).toEqual([]);
  });

  it("stamps the terms version onto the artifact and links it to both records", () => {
    const payload = build();
    expect(payload.variables.terms_version).toBe("service-contract-2025");
    expect(payload.related_case_number).toBe("CASE-2026-0001");
    expect(payload.related_order_number).toBe("ORD-2026-0001");
    expect(payload.template).toBe("agreement");
  });

  it("still prints for a case with no linked order", () => {
    const payload = build({ kase: { ...CASE, linked_order_number: null }, order: null });
    expect(payload.variables.totals).toEqual([]);
    expect(payload.related_order_number).toBeUndefined();
    // Every case service becomes an unpriced line — the contract is honest about it.
    expect((payload.variables.schedule as unknown[]).length).toBe(CASE.services.length);
  });

  it("shows a paid order's balance as zero, not as the full amount again", () => {
    const totals = build({ order: { ...ORDER, status: "paid" } }).variables.totals as Array<{
      label: string;
      amount_minor_units: number;
    }>;
    expect(totals.find((r) => r.label === "Balance and due date")?.amount_minor_units).toBe(0);
  });
});

describe("purchase agreement payload", () => {
  const RESERVED: Lot = {
    id: "lot-uuid-1",
    lot_number: "SEC-A-B2-014",
    section: "Section A",
    block: "B2",
    type: "family",
    status: "reserved",
    area_sqm: 6,
    price_cents: 32_000_000,
    currency: "PHP",
    owner_name: "Maria Santos",
    reserved_at: "2026-08-20T00:00:00Z",
    sold_at: null,
  };

  it("refuses to build an agreement for a lot with no named buyer", () => {
    const available: Lot = { ...RESERVED, status: "available", owner_name: null };
    expect(canGeneratePurchaseAgreement(available)).toBe(false);
    expect(() =>
      buildPurchaseAgreement({
        lot: available,
        tenantName: "Villa Memoria",
        signedOn: "2026-08-29",
      }),
    ).toThrow(/named buyer/);
  });

  it("names the reserving party as the buyer", () => {
    const payload = buildPurchaseAgreement({
      lot: RESERVED,
      tenantName: "Villa Memoria",
      signedOn: "2026-08-29",
    });
    expect(payload.variables.party_second).toBe("Maria Santos");
    expect(payload.variables.reference).toBe("SEC-A-B2-014");
  });

  it("applies the revision in force on the signing date", () => {
    expect(
      buildPurchaseAgreement({
        lot: RESERVED,
        tenantName: "Villa Memoria",
        signedOn: "2025-11-02",
      }).variables.terms_version,
    ).toBe("lot-purchase-2025");

    expect(
      buildPurchaseAgreement({
        lot: RESERVED,
        tenantName: "Villa Memoria",
        signedOn: "2026-08-29",
      }).variables.terms_version,
    ).toBe("lot-purchase-2026");
  });

  it("marks MCF and VAT as unrecorded rather than pricing them at zero", () => {
    const schedule = buildPurchaseAgreement({
      lot: RESERVED,
      tenantName: "Villa Memoria",
      signedOn: "2026-08-29",
    }).variables.schedule as Array<{
      label: string;
      amount_minor_units?: number;
      note?: string;
    }>;

    expect(schedule[0]).toMatchObject({ label: "Basic price", amount_minor_units: 32_000_000 });
    const mcf = schedule.find((r) => r.label.startsWith("Maintenance Care Fund"));
    expect(mcf?.amount_minor_units).toBeUndefined();
    expect(mcf?.note).toContain("not recorded");
  });

  it("speaks Villa's classification vocabulary, not the platform's lot type", () => {
    const particulars = buildPurchaseAgreement({
      lot: RESERVED,
      tenantName: "Villa Memoria",
      signedOn: "2026-08-29",
    }).variables.particulars as Array<{ label: string; value: string }>;
    expect(particulars.find((p) => p.label === "Classification")?.value).toBe(
      "Lawn Lot — Family Garden",
    );
  });
});

describe("service contract with intake captured", () => {
  const withIntake = () =>
    buildServiceContract({
      kase: { ...CASE, intake: INTAKE },
      order: ORDER,
      tenantName: "Villa Memoria",
      signedOn: "2026-08-29T04:00:00Z",
    });

  it("dates the contract from the counter's date, not the day it was keyed in", () => {
    const payload = withIntake();
    expect(payload.variables.effective_date).toBe("2026-08-28");
    const totals = payload.variables.totals as Array<{ label: string; note?: string }>;
    // 9 days from 2026-08-28, not from 2026-08-29.
    expect(totals.find((r) => r.label === "Balance and due date")?.note).toContain("2026-09-06");
  });

  it("names the client who signs, not the customer who paid", () => {
    expect(withIntake().variables.party_second).toBe("Ana Santos");
    expect(withIntake().variables.party_third).toBe("Ramon Santos");
  });

  it("prints the intake block Villa captures above the price list", () => {
    const particulars = withIntake().variables.particulars as Array<{
      label: string;
      value: string;
    }>;
    const byLabel = (l: string) => particulars.find((p) => p.label === l)?.value;
    expect(byLabel("Date of death")).toBe("2026-08-27");
    expect(byLabel("Civil status")).toBe("married");
    expect(byLabel("Relationship to deceased")).toBe("Daughter");
    expect(byLabel("ID presented")).toBe("Driver's License — N01-23-456789");
    expect(byLabel("Senior citizen")).toBe("Yes");
  });

  it("omits the senior-citizen line entirely when it is not claimed", () => {
    const particulars = buildServiceContract({
      kase: { ...CASE, intake: { ...INTAKE, senior_citizen: false } },
      order: ORDER,
      tenantName: "Villa Memoria",
      signedOn: "2026-08-29T04:00:00Z",
    }).variables.particulars as Array<{ label: string }>;
    expect(particulars.find((p) => p.label === "Senior citizen")).toBeUndefined();
  });

  it("still prints, with blanks, for a case that has no intake yet", () => {
    const particulars = build().variables.particulars as Array<{
      label: string;
      value: string;
    }>;
    expect(particulars.find((p) => p.label === "Date of death")?.value).toBe("");
    // Falls back to the purchaser when nobody has said who the client is.
    expect(build().variables.party_second).toBe("Juan dela Cruz");
    expect(build().variables.party_third).toBeUndefined();
  });
});
