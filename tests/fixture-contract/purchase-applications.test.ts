import { describe, expect, it } from "vitest";
import { getLot } from "@/lib/api-client/property";
import {
  getPurchaseApplicationForLot,
  savePurchaseApplication,
} from "@/lib/api-client/purchase-applications";
import { buildPurchaseAgreement } from "@/lib/contracts/purchase-agreement";
import {
  buyerFullName,
  purchaseApplicationFromForm,
  purchaseApplicationMoneyRows,
} from "@/lib/contracts/purchase-application";
import { formatMinorUnits } from "@/lib/money";

/**
 * Track B fixture-contract tests. The purchase-application shape is NOT frozen by any
 * contract (property-gis's lot.* family stops at reserve/sell), so these pin the
 * PROVISIONAL demo records — seeded for lots that the lots fixture already names — to the
 * capture vocabulary of Villa's own papers (see lib/fixtures/property/
 * purchase-applications.json header). They exist so the demo loop (capture → agreement
 * prints real values) cannot drift silently while the shape waits on a dev freeze.
 */

const A002 = "00000000-0000-4000-8000-000000000D02"; // reserved for Marites Santos
const A003 = "00000000-0000-4000-8000-000000000D03"; // sold to Roberto Santos
const A001 = "00000000-0000-4000-8000-000000000D01"; // available, no application

describe("seeded purchase applications mirror the lots fixture's owners", () => {
  it("carries an application for every seeded reserved/sold demo lot", async () => {
    const marites = await getPurchaseApplicationForLot(A002);
    expect(marites).not.toBeNull();
    expect(buyerFullName(marites!)).toBe("Marites R. Santos");
    expect((await getLot(A002)).owner_name).toBe("Marites Santos");

    const roberto = await getPurchaseApplicationForLot(A003);
    expect(roberto).not.toBeNull();
    expect(buyerFullName(roberto!)).toBe("Roberto D. Santos");
  });

  it("records the structured capture: buyer, beneficiaries, classification, money rows", async () => {
    const app = await getPurchaseApplicationForLot(A002);
    expect(app).toMatchObject({
      lot_number: "A-002",
      application_date: "2026-08-10",
      classification: "Lawn Lot Prime",
      mode_of_payment: "monthly",
      amortization_value: 24,
      amortization_unit: "months",
      mcf_cents: 1_116_000,
      vat_cents: 1_077_860,
      total_contract_price_cents: 10_116_000,
      dpa_consent: true,
      sales_agent_name: "Elena Villanueva",
    });
    expect(app?.beneficiaries).toHaveLength(2);
    expect(app?.beneficiaries[0]).toEqual({
      name: "Alyanna Santos",
      age: 16,
      relationship: "Daughter",
    });
  });

  it("answers null for a lot with no application", async () => {
    expect(await getPurchaseApplicationForLot(A001)).toBeNull();
  });
});

describe("recording a purchase application (fixture demo store)", () => {
  it("upserts by lot and is visible to later reads, like the reservation overlay", async () => {
    const input = purchaseApplicationFromForm({
      application_date: "2026-09-01",
      first_name: "Juan",
      last_name: "Dela Cruz",
      date_of_birth: "1980-01-15",
      email: "juan@example.com",
      classification: "Condo-type",
      basic_price_cents: "75000",
      total_contract_price_cents: "84000",
      mcf_cents: "9000",
      mode_of_payment: "quarterly",
      amortization_value: 5,
      amortization_unit: "years",
      dpa_consent: true,
      beneficiaries: [{ name: "Juana Dela Cruz", age: "40", relationship: "Spouse" }],
    });
    const saved = await savePurchaseApplication(A001, "A-001", input);
    expect(saved.lot_id).toBe(A001);
    expect(saved.basic_price_cents).toBe(7_500_000);
    expect(saved.created_at).toBe(saved.updated_at);

    const reread = await getPurchaseApplicationForLot(A001);
    expect(reread?.last_name).toBe("Dela Cruz");
    expect(buyerFullName(reread!)).toBe("Juan Dela Cruz");
    expect(reread?.beneficiaries[0]?.age).toBe(40);

    // Updating keeps the original created_at and advances updated_at.
    const updated = await savePurchaseApplication(A001, "A-001", {
      ...input,
      sales_agent_name: "Elena Villanueva",
    });
    expect(updated.created_at).toBe(saved.created_at);
    expect(updated.updated_at >= saved.updated_at).toBe(true);
  });
});

describe("blank price rows cannot crash the lot page (regression)", () => {
  it("save with blank price rows renders lot page", async () => {
    // A counter can submit the capture form with every price row left blank — the
    // money cells arrive as "" and purchaseApplicationFromForm drops them.
    const input = purchaseApplicationFromForm({
      application_date: "2026-09-01",
      first_name: "Nena",
      last_name: "Ramos",
      classification: "Condo-type",
      mode_of_payment: "monthly",
      dpa_consent: true,
      basic_price_cents: "",
      total_contract_price_cents: "",
      mcf_cents: "",
      vat_cents: "",
    });
    const A004 = "00000000-0000-4000-8000-000000000D04"; // available, no application
    await savePurchaseApplication(A004, "A-004", input);

    // The fixture-store read gate turns the dropped blank rows into explicit null
    // money — never undefined or "" — so screens that guard only for null cannot
    // hand a blank cell to formatMinorUnits and crash.
    const application = await getPurchaseApplicationForLot(A004);
    expect(application).not.toBeNull();
    expect(application).toMatchObject({
      basic_price_cents: null,
      total_contract_price_cents: null,
      mcf_cents: null,
      vat_cents: null,
    });

    // The lot page's money rows render the app's empty-value conventions instead of
    // throwing: basic price shows the lot's listed figure (its starting price), and
    // MCF / VAT / Total prints the em dash for nothing written.
    const lot = await getLot(A004);
    expect(() =>
      purchaseApplicationMoneyRows(application!, lot.price_cents, lot.currency),
    ).not.toThrow();
    const rows = purchaseApplicationMoneyRows(application!, lot.price_cents, lot.currency);
    expect(rows.map((r) => r.label)).toEqual(["Basic price", "MCF / VAT / Total"]);
    expect(rows[0].value).toBe(formatMinorUnits(lot.price_cents, lot.currency));
    expect(rows[1].value).toBe("—");
  });
});

describe("invalid written figures surface instead of printing blank", () => {
  it("rejects a half-entered amortisation term at capture time", () => {
    expect(() =>
      purchaseApplicationFromForm({ amortization_value: "24", first_name: "Juan" }),
    ).toThrow(/amortization/);
    expect(() =>
      purchaseApplicationFromForm({
        amortization_value: "",
        amortization_unit: "months",
        first_name: "Juan",
      }),
    ).toThrow(/amortization/);
  });

  it("rejects a non-numeric beneficiary age at capture time", () => {
    expect(() =>
      purchaseApplicationFromForm({
        first_name: "Juan",
        beneficiaries: [{ name: "Juana Dela Cruz", age: "twelve", relationship: "Spouse" }],
      }),
    ).toThrow(/beneficiary age/);
  });
});

describe("a seeded application feeds the agreement generator real values", () => {
  it("prints Marites's written figures on her lot's agreement", async () => {
    const lot = await getLot(A002);
    const app = await getPurchaseApplicationForLot(A002);
    const payload = buildPurchaseAgreement({
      lot,
      application: app,
      tenantName: "Villa Memoria",
      signedOn: "2026-08-10",
    });
    const variables = payload.variables as Record<string, unknown>;
    expect(variables.party_second).toBe("Marites R. Santos");
    expect(variables.terms_version).toBe("lot-purchase-2026");

    const schedule = variables.schedule as Array<{
      label: string;
      amount_minor_units?: number;
      note?: string;
    }>;
    expect(schedule.find((r) => r.label === "VAT")?.amount_minor_units).toBe(1_077_860);
    const totals = variables.totals as Array<{ label: string; amount_minor_units?: number }>;
    expect(totals.find((r) => r.label === "Total contract price")?.amount_minor_units).toBe(
      10_116_000,
    );
    const signatories = variables.signatories as Array<{ name: string; role: string }>;
    expect(signatories.some((s) => s.role.includes("Sales agent"))).toBe(true);
  });
});
