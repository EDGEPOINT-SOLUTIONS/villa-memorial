import { describe, expect, it } from "vitest";
import {
  ALL_ROWS,
  appliedRows,
  CIVIL_STATUS_LETTER,
  DEAL_ROWS,
  emptyDraft,
  emptyDraftForCase,
  GENDER_LETTER,
  printedRowLabel,
  SERVICE_ROWS,
  validateDraft,
  type DaysSelection,
} from "@/lib/contracts/service-contract-capture";
import { emptyIntake, intakeToValues } from "@/lib/contracts/intake";
import { intakeFromForm } from "@/lib/contracts/intake-input";

/**
 * Villa's Funeral Service Contract paper form — capture completeness.
 *
 * These pin the capture model to the paper's own rows and blanks
 * (docs/07-client-villa/paper-forms/ transcript), and the intake round-trip to the
 * case contract's additive intake fields (case-events-v1.md). No test here exercises
 * money: the model deliberately carries none (FORMS_PLAN.md non-negotiables).
 */

const PAPER_SERVICE_LABELS = [
  "ROD",
  "ARABESQUE 1/2",
  "ARABESQUE Full glass",
  "Lizo (JR)",
  "Lizo (SR)",
  "Metal 1/2",
  "Metal Full / Bubble Top",
  "Others",
];

const PAPER_DEAL_LABELS = [
  "Ordinary Coffin",
  "Embalming",
  "Lights",
  "Delivery",
  "Pick-up",
  "Interment",
  "Extension",
];

describe("paper vocabulary mirrors the Service Contract Form", () => {
  it("lists the services column exactly as the paper prints it", () => {
    expect(SERVICE_ROWS.map((r) => r.label)).toEqual(PAPER_SERVICE_LABELS);
    expect(SERVICE_ROWS.every((r) => r.side === "service")).toBe(true);
  });

  it("lists the packaged-deals column exactly as the paper prints it", () => {
    expect(DEAL_ROWS.map((r) => r.label)).toEqual(PAPER_DEAL_LABELS);
    expect(DEAL_ROWS.every((r) => r.side === "deal")).toBe(true);
  });

  it("keeps the paper's two discrete boxes for Lizo and the number blank for Embalming", () => {
    const serviceLabels = SERVICE_ROWS.map((r) => r.label).join(" · ");
    expect(serviceLabels).toContain("Lizo (JR)");
    expect(serviceLabels).toContain("Lizo (SR)");
    expect(DEAL_ROWS.find((r) => r.label === "Embalming")?.kind).toBe("days");
    expect(SERVICE_ROWS.find((r) => r.label === "Others")?.kind).toBe("free_text");
  });

  it("keeps every row key unique across both columns", () => {
    const keys = ALL_ROWS.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("draft rows print the way the paper reads", () => {
  it("prints a filled Embalming blank as days, never as a bare row", () => {
    const row = DEAL_ROWS.find((r) => r.label === "Embalming")!;
    expect(printedRowLabel(row, { applied: true, days: "3" })).toBe("Embalming — 3 days");
    expect(printedRowLabel(row, { applied: true, days: "1" })).toBe("Embalming — 1 day");
    expect(printedRowLabel(row, { applied: true, days: "" })).toBe("Embalming ___ days");
  });

  it("prints the Others blank's description when filled", () => {
    const row = SERVICE_ROWS.find((r) => r.label === "Others")!;
    expect(printedRowLabel(row, { applied: true, detail: "Hearse transport" })).toBe(
      "Others: Hearse transport",
    );
  });

  it("returns applied rows in paper order, services then deals", () => {
    const draft = emptyDraft();
    draft.services.rod.applied = true;
    draft.services.arabesque_full_glass.applied = true;
    draft.deals.interment.applied = true;
    draft.deals.ordinary_coffin.applied = true;
    const labels = appliedRows(draft).map((r) => r.label);
    expect(labels).toEqual(["ROD", "ARABESQUE Full glass", "Ordinary Coffin", "Interment"]);
  });

  it("pre-ticks rows the case already records, by paper label", () => {
    const draft = emptyDraftForCase({ services: ["ROD", "Embalming", "Lights & Sound"] });
    expect(draft.services.rod.applied).toBe(true);
    expect((draft.deals.embalming as DaysSelection).applied).toBe(true);
    expect(draft.deals.lights.applied).toBe(true);
    expect(draft.deals.extension.applied).toBe(false);
  });

  it("leaves every row unticked when the case records no services", () => {
    expect(appliedRows(emptyDraftForCase({ services: [] }))).toEqual([]);
  });
});

describe("validation is structural, never monetary", () => {
  it("accepts an untouched draft", () => {
    expect(validateDraft(emptyDraft())).toEqual({ badDays: [], longDetails: [] });
  });

  it("rejects a non-whole-number of embalming days", () => {
    const draft = emptyDraft();
    (draft.deals.embalming as DaysSelection).applied = true;
    (draft.deals.embalming as DaysSelection).days = "three";
    expect(validateDraft(draft).badDays).toContain("Embalming (days)");

    (draft.deals.embalming as DaysSelection).days = "0";
    expect(validateDraft(draft).badDays).toContain("Embalming (days)");
  });

  it("accepts a blank days field even when the box is ticked", () => {
    const draft = emptyDraft();
    (draft.deals.embalming as DaysSelection).applied = true;
    expect(validateDraft(draft).badDays).toEqual([]);
  });

  it("refuses to print an LGU 'Others' tick without saying what it covers", () => {
    const draft = emptyDraft();
    draft.deductions.lgu.others = true;
    expect(validateDraft(draft).longDetails.join(" ")).toContain("LGU — Others");
  });
});

describe("header letters match the paper's ticks", () => {
  it("prints gender as M/F", () => {
    expect(GENDER_LETTER).toEqual({ male: "M", female: "F" });
  });

  it("prints civil status as S/M/O", () => {
    expect(CIVIL_STATUS_LETTER).toEqual({ single: "S", married: "M", other: "O" });
  });
});

describe("intake round-trip carries the paper's client-channel fields", () => {
  it("keeps a captured record intact through intakeToValues", () => {
    const intake = {
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
    const values = intakeToValues(intake, {});
    expect(values.client_gender).toBe("female");
    expect(values.client_civil_status).toBe("married");
    expect(values.client_facebook).toBe("fb.com/ana.santos");
    expect(values.client_email).toBe("ana.santos@example.com");
    expect(values.senior_citizen).toBe(true);
  });

  it("keeps an answered senior-citizen denial through intakeToValues", () => {
    const values = intakeToValues(
      {
        date_of_death: null,
        deceased_date_of_birth: null,
        deceased_gender: null,
        deceased_civil_status: null,
        senior_citizen: false,
        client_name: null,
        client_gender: null,
        client_civil_status: null,
        client_address: null,
        client_contact: null,
        client_facebook: null,
        client_email: null,
        client_relationship: null,
        client_id_presented: null,
        client_id_number: null,
        co_maker_name: null,
        contract_date: null,
        completed_at: null,
      },
      {},
    );
    expect(values.senior_citizen).toBe(false);
  });

  it("keeps an unanswered senior-citizen question blank through the form round-trip", () => {
    expect(emptyIntake().senior_citizen).toBeNull();
    expect(intakeToValues(null, {}).senior_citizen).toBeNull();
    expect(intakeFromForm({})).not.toHaveProperty("senior_citizen");
    expect(intakeFromForm({ senior_citizen: null })).not.toHaveProperty("senior_citizen");
  });

  it("forwards an answered senior-citizen question either way", () => {
    expect(intakeFromForm({ senior_citizen: true })).toMatchObject({ senior_citizen: true });
    expect(intakeFromForm({ senior_citizen: false })).toMatchObject({ senior_citizen: false });
  });

  it("treats an uncaptured intake as blank form values, not nulls", () => {
    const values = intakeToValues(null, {});
    expect(values).toEqual(emptyIntake());
  });

  it("forwards the new client fields from a form body", () => {
    const input = intakeFromForm({
      deceased_name: "Pedro Santos",
      client_gender: "female",
      client_civil_status: "married",
      client_facebook: "fb.com/ana.santos",
      client_email: "ana@example.com",
      client_contact: "",
      senior_citizen: true,
    });
    expect(input).toMatchObject({
      client_gender: "female",
      client_civil_status: "married",
      client_facebook: "fb.com/ana.santos",
      client_email: "ana@example.com",
      senior_citizen: true,
    });
    // Blank channel fields are dropped, never forwarded as ""
    expect(input).not.toHaveProperty("client_contact");
  });

  it("drops the client fields when the form leaves them blank", () => {
    const input = intakeFromForm({ client_name: "Ana Santos" });
    expect(input).not.toHaveProperty("client_gender");
    expect(input).not.toHaveProperty("client_email");
  });
});
