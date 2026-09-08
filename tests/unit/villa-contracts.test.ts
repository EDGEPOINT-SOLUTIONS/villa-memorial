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
import type { PurchaseApplication } from "@/lib/contracts/purchase-application";
import {
  ageOn,
  buyerFullName,
  emptyPurchaseApplicationInput,
  pesosInputToCents,
  purchaseApplicationFromForm,
  validatePurchaseApplication,
} from "@/lib/contracts/purchase-application";

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
  client_gender: "female",
  client_civil_status: "married",
  client_address: "Aguada, Isabela City",
  client_contact: "0917 000 1111",
  client_facebook: "fb.com/ana.santos",
  client_email: "ana.santos@example.com",
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

  it("only prints a Villa classification the governing revision actually lists", () => {
    const particularsOf = (signedOn: string) =>
      (buildPurchaseAgreement({
        lot: RESERVED,
        tenantName: "Villa Memoria",
        signedOn,
      }).variables.particulars as Array<{ label: string; value: string }>).find(
        (p) => p.label === "Classification",
      );

    // 2025 revision: the platform's `family` type maps onto the 2025 paper's list.
    expect(particularsOf("2025-11-02")?.value).toBe("Lawn Lot — Family Garden");
    // 2026 revision: that word is NOT on the 2026 paper — a legal artifact must not print
    // a classification from the other revision, so it stays blank until the purchase
    // application names one (the platform lot type cannot express Villa's 2026 list).
    expect(particularsOf("2026-08-29")?.value).toBe("");
  });

  it("prints the estate (mausoleum) guess only where the revision lists Mausoleum", () => {
    const estate: Lot = { ...RESERVED, type: "estate" };
    const particularsOf = (signedOn: string) =>
      (buildPurchaseAgreement({
        lot: estate,
        tenantName: "Villa Memoria",
        signedOn,
      }).variables.particulars as Array<{ label: string; value: string }>).find(
        (p) => p.label === "Classification",
      );
    expect(particularsOf("2025-11-02")?.value).toBe("Mausoleum");
    expect(particularsOf("2026-08-29")?.value).toBe("Mausoleum");
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
    // The client block's channel fields print from the additive intake fields.
    expect(byLabel("Client gender / civil status")).toBe("female · married");
    expect(byLabel("Telephone")).toBe("0917 000 1111");
    expect(byLabel("Facebook")).toBe("fb.com/ana.santos");
    expect(byLabel("Email")).toBe("ana.santos@example.com");
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

describe("purchase agreement payload with a captured application", () => {
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
    owner_name: null,
    reserved_at: "2026-08-20T00:00:00Z",
    sold_at: null,
  };

  /** A 2026-combined-form application as a counter would have captured it. */
  const APPLICATION: PurchaseApplication = {
    ...emptyPurchaseApplicationInput(RESERVED),
    lot_id: RESERVED.id,
    lot_number: RESERVED.lot_number,
    created_at: "2026-08-20T00:00:00Z",
    updated_at: "2026-08-20T00:00:00Z",
    application_date: "2026-08-20",
    last_name: "Santos",
    first_name: "Maria",
    middle_name: "D.",
    date_of_birth: "1975-06-14",
    civil_status: "married",
    gender: "female",
    religion: "Roman Catholic",
    contact_number: "0917 555 0000",
    email: "maria.santos@example.com",
    tin: "123-456-789-000",
    gsis_sss_number: "11-2233445-6",
    address: "Aguada, Isabela City",
    occupation: "Teacher",
    employer: "DepEd Isabela",
    classification: "Lawn Lot Standard",
    basic_price_cents: 30_000_000,
    total_contract_price_cents: 33_600_000,
    mcf_cents: 3_600_000,
    vat_cents: 3_590_000,
    mode_of_payment: "monthly",
    amortization_value: 24,
    amortization_unit: "months",
    dpa_consent: true,
    sales_agent_name: "Elena Villanueva",
    beneficiaries: [
      { name: "Alyanna Santos", age: 17, relationship: "Daughter" },
      { name: "Miguel Santos", age: 14, relationship: "Son" },
    ],
  };

  function build(overrides: Partial<Parameters<typeof buildPurchaseAgreement>[0]> = {}) {
    return buildPurchaseAgreement({
      lot: RESERVED,
      application: APPLICATION,
      tenantName: "Villa Memoria",
      signedOn: "2026-08-29",
      ...overrides,
    });
  }

  const byLabel = (rows: Array<{ label: string; value: string }>, label: string) =>
    rows.find((r) => r.label === label)?.value ?? "";

  it("names the buyer in full from the application's name parts", () => {
    expect(build().variables.party_second).toBe("Maria D. Santos");
    expect(buyerFullName(APPLICATION)).toBe("Maria D. Santos");
  });

  it("prints the 2026 merged form's buyer block as particulars", () => {
    const particulars = build().variables.particulars as Array<{
      label: string;
      value: string;
    }>;
    expect(byLabel(particulars, "Last name")).toBe("Santos");
    expect(byLabel(particulars, "First name")).toBe("Maria");
    expect(byLabel(particulars, "Date of birth")).toBe("1975-06-14");
    // Age is a calendar computation next to Date of Birth on the paper — not money math.
    expect(byLabel(particulars, "Age")).toBe("51");
    expect(byLabel(particulars, "Civil status")).toBe("Married");
    expect(byLabel(particulars, "GSIS/SSS No.")).toBe("11-2233445-6");
    expect(byLabel(particulars, "Employer")).toBe("DepEd Isabela");
    expect(byLabel(particulars, "Classification")).toBe("Lawn Lot Standard");
  });

  it("flattens beneficiaries with age and relationship onto the form", () => {
    const particulars = build().variables.particulars as Array<{
      label: string;
      value: string;
    }>;
    expect(byLabel(particulars, "Beneficiary 1 — name")).toBe("Alyanna Santos");
    expect(byLabel(particulars, "Beneficiary 1 — age")).toBe("17");
    expect(byLabel(particulars, "Beneficiary 1 — relationship")).toBe("Daughter");
    expect(byLabel(particulars, "Beneficiary 2 — name")).toBe("Miguel Santos");
  });

  it("prints the mode of payment and the amortisation term it was captured with", () => {
    const particulars = build().variables.particulars as Array<{
      label: string;
      value: string;
    }>;
    expect(byLabel(particulars, "Mode of payment")).toBe("Monthly");
    expect(byLabel(particulars, "Amortisation")).toBe("24 months");
  });

  it("carries the written MCF, VAT and total contract price instead of notes", () => {
    const schedule = build().variables.schedule as Array<{
      label: string;
      amount_minor_units?: number;
      note?: string;
    }>;
    const totals = build().variables.totals as Array<{
      label: string;
      amount_minor_units?: number;
      note?: string;
    }>;
    expect(schedule.find((r) => r.label.startsWith("Maintenance Care Fund"))).toMatchObject({
      amount_minor_units: 3_600_000,
    });
    expect(schedule.find((r) => r.label === "VAT")?.amount_minor_units).toBe(3_590_000);
    expect(totals.find((r) => r.label === "Total contract price")?.amount_minor_units).toBe(
      33_600_000,
    );
    expect(totals.find((r) => r.label === "Total contract price")?.note).toBeUndefined();
  });

  it("adds the sales agent as a co-signatory where the 2026 paper has one", () => {
    const signatories = build().variables.signatories as Array<{ name: string; role: string }>;
    expect(signatories.map((s) => s.name)).toEqual([
      "Armando A. Villa",
      "Maria D. Santos",
      "Elena Villanueva",
    ]);
  });

  it("resolves classifications and term text by signing date, application or not", () => {
    expect(build({ signedOn: "2025-11-02" }).variables.terms_version).toBe(
      "lot-purchase-2025",
    );
    expect(build().variables.terms_version).toBe("lot-purchase-2026");
  });

  it("prints the 2025 buyer table and Others/Insurance row on a 2025-governed artifact", () => {
    const y2025 = build({
      signedOn: "2025-11-02",
      application: {
        ...APPLICATION,
        citizenship: "Filipino",
        others_insurance: "Villa Memorial Plan",
        interment_funeral_bundle_inclusion: null,
      },
    });
    const particulars = y2025.variables.particulars as Array<{ label: string; value: string }>;
    expect(byLabel(particulars, "Name")).toBe("Maria D. Santos");
    expect(byLabel(particulars, "Citizenship")).toBe("Filipino");
    expect(byLabel(particulars, "E-mail address")).toBe("maria.santos@example.com");
    expect(byLabel(particulars, "Others / Insurance")).toBe("Villa Memorial Plan");
    // The 2026-only interment row must not appear on the 2025 paper's artifact.
    expect(particulars.find((p) => p.label.includes("Funeral Bundle"))).toBeUndefined();
  });

  it("can generate from an application even when the lot record carries no owner yet", () => {
    expect(canGeneratePurchaseAgreement(RESERVED, APPLICATION)).toBe(true);
    // Without an application a nameless lot is still a blank form.
    expect(canGeneratePurchaseAgreement(RESERVED, null)).toBe(false);
  });
});

describe("purchase application capture helpers", () => {
  it("computes the paper's Age cell as calendar years, never negative", () => {
    expect(ageOn("1975-06-14", "2026-08-29")).toBe(51);
    expect(ageOn("1975-12-01", "2026-08-29")).toBe(50); // birthday not yet reached
    expect(ageOn("2005-02-28", "2005-03-01")).toBe(0);
    expect(ageOn(null, "2026-08-29")).toBeNull();
    expect(ageOn("not-a-date", "2026-08-29")).toBeNull();
  });

  it("reads pesos as a counter types them into integer minor units", () => {
    expect(pesosInputToCents("32000")).toBe(3_200_000);
    expect(pesosInputToCents("1,500.50")).toBe(150_050);
    expect(pesosInputToCents("")).toBeNull();
    expect(pesosInputToCents("   ")).toBeNull();
    expect(() => pesosInputToCents("abc")).toThrow();
    expect(() => pesosInputToCents("-1")).toThrow();
    expect(() => pesosInputToCents("1.234")).toThrow();
  });

  it("normalises a form body the same way in the BFF and on the screen", () => {
    const input = purchaseApplicationFromForm({
      application_date: "2026-08-20",
      first_name: "Maria",
      middle_name: "D.",
      last_name: "Santos",
      date_of_birth: "1975-06-14",
      gender: "female",
      civil_status: "married",
      basic_price_cents: "30000",
      mcf_cents: "3600",
      mode_of_payment: "monthly",
      amortization_value: 24,
      amortization_unit: "months",
      dpa_consent: true,
      beneficiaries: [
        { name: "Alyanna Santos", age: "17", relationship: "Daughter" },
        { name: "", age: "", relationship: "" },
      ],
      untouched_field: "ignored",
    });
    expect(input.last_name).toBe("Santos");
    expect(input.basic_price_cents).toBe(3_000_000);
    expect(input.mcf_cents).toBe(360_000);
    expect(input.amortization_value).toBe(24);
    expect(input.dpa_consent).toBe(true);
    expect(input.beneficiaries).toEqual([
      { name: "Alyanna Santos", age: 17, relationship: "Daughter" },
    ]);
    expect(input.classification).toBeUndefined();
    expect(input.religion).toBeUndefined();
  });

  it("rejects malformed money when normalising — a legal artifact never carries junk", () => {
    expect(() =>
      purchaseApplicationFromForm({ vat_cents: "eleventy" }),
    ).toThrow(/not a valid peso amount/);
  });

  it("validates the minimum a legal capture needs: a name and the DPA consent", () => {
    const base = purchaseApplicationFromForm({ application_date: "2026-08-20", dpa_consent: true });
    expect(buyerFullName(base)).toBe("");
    const terms2026 = termsByVersion("lot-purchase-2026")!;
    expect(Object.keys(validatePurchaseApplication(base, terms2026))).toContain("name");

    const named = purchaseApplicationFromForm({
      application_date: "2026-08-20",
      first_name: "Maria",
      last_name: "Santos",
      dpa_consent: false,
    });
    expect(Object.keys(validatePurchaseApplication(named, terms2026))).toContain("dpa_consent");

    const ok = purchaseApplicationFromForm({
      application_date: "2026-08-20",
      first_name: "Maria",
      last_name: "Santos",
      dpa_consent: true,
    });
    expect(validatePurchaseApplication(ok, terms2026)).toEqual({});
  });

  it("rejects a half-entered amortisation term instead of dropping it", () => {
    expect(() =>
      purchaseApplicationFromForm({ amortization_value: "24", amortization_unit: "" }),
    ).toThrow(/amortization/);
    expect(() =>
      purchaseApplicationFromForm({ amortization_value: 24 }),
    ).toThrow(/amortization/);
    expect(() =>
      purchaseApplicationFromForm({ amortization_value: "0", amortization_unit: "months" }),
    ).toThrow(/amortization/);
    expect(() =>
      purchaseApplicationFromForm({ amortization_value: "abc", amortization_unit: "months" }),
    ).toThrow(/amortization/);
    expect(() =>
      purchaseApplicationFromForm({ amortization_value: "-3", amortization_unit: "years" }),
    ).toThrow(/amortization/);
  });

  it("accepts any positive amortisation figure and leaves blanks blank", () => {
    expect(
      purchaseApplicationFromForm({ amortization_value: 200, amortization_unit: "months" })
        .amortization_value,
    ).toBe(200);
    const blank = purchaseApplicationFromForm({});
    expect(blank.amortization_value).toBeUndefined();
    expect(blank.amortization_unit).toBeUndefined();
  });

  it("rejects a non-numeric beneficiary age instead of storing it as unknown", () => {
    expect(() =>
      purchaseApplicationFromForm({
        beneficiaries: [{ name: "Alyanna Santos", age: "twelve", relationship: "Daughter" }],
      }),
    ).toThrow(/beneficiary age/);
    expect(() =>
      purchaseApplicationFromForm({
        beneficiaries: [{ name: "Miguel Santos", age: "-1", relationship: "Son" }],
      }),
    ).toThrow(/beneficiary age/);
    const blankAge = purchaseApplicationFromForm({
      beneficiaries: [{ name: "Alyanna Santos", age: "", relationship: "Daughter" }],
    });
    expect(blankAge.beneficiaries[0]?.age).toBeNull();
  });
});
