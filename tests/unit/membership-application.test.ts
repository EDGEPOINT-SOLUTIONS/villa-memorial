import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { ApiError } from "@/lib/api-client/api-error";
import {
  getMembershipApplication,
  listMembershipApplications,
  MEMBERSHIP_ADMIN_NOT_WIRED,
  membershipLiveModeEnabled,
  recordMembershipApplication,
} from "@/lib/api-client/membership-applications";
import {
  membershipStorePath,
  recordMembershipApplication as recordStoredApplication,
} from "@/lib/api-client/membership-store";
import { loadPricingDocument, savePlanPricing } from "@/lib/api-client/pricing";
import {
  APPLICATION_NOT_A_COC_NOTE,
  DPA_CONSENT_STATEMENT,
  HEALTH_DECLARATION_STATEMENT,
  MEMBERSHIP_COVERAGE,
  MEMBERSHIP_RELATIONSHIPS,
  MEMBERSHIP_RELATIONSHIP_LABEL,
  PAPER_AUTHORITY_NOTE,
  PLAN_RATE_CLASSES,
  emptyMembershipApplicationInput,
  membershipApplicationFromForm,
  membershipApplicationIssues,
  membershipRateCents,
  planHolderAgeOn,
  planHolderFullName,
  planTermLabel,
  planTermPer,
  validateMembershipApplication,
  type MembershipApplicationInput,
} from "@/lib/contracts/membership-application";
import {
  buildMembershipApplicationPaper,
  membershipPaperFileStem,
} from "@/lib/contracts/membership-paper";
import { paperToDocxBuffer } from "@/lib/export/docx";
import { paperToPdfBuffer } from "@/lib/export/pdf";
import { planRateOf, type PlanPricing } from "@/lib/pricing-model";
import { SEED_PRICING } from "@/lib/villa-pricing";

/**
 * The Villa Memorial Plan membership application — the enrolment folio's rules home, its
 * durable fixture store, the app-facing client and the application paper.
 *
 * The shape is UNFROZEN on purpose (no membership/COC record contract exists; the signed
 * paper is not archived in this project — see lib/contracts/membership-application.ts).
 * These tests pin what the app itself promises while it waits: the client's own
 * relationship vocabulary, structural validation, a durable demo record, the rate READ
 * from the pricing store (never typed), the honest application-not-a-COC marking on the
 * paper, and real .docx/.pdf exports. Every test gets its own throwaway store paths.
 */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "villa-membership-"));
  process.env.MEMBERSHIP_STORE_PATH = path.join(dir, "membership.json");
  process.env.PRICING_STORE_PATH = path.join(dir, "pricing.json");
  delete process.env.COMMERCE_BASE_URL;
});

afterEach(async () => {
  delete process.env.MEMBERSHIP_STORE_PATH;
  delete process.env.PRICING_STORE_PATH;
  delete process.env.COMMERCE_BASE_URL;
  await rm(dir, { recursive: true, force: true });
});

/** A complete, valid form body — the shape the folio POSTs. */
function validBody(overrides: Record<string, unknown> = {}) {
  return {
    application_date: "2026-09-18",
    last_name: "Dela Cruz",
    first_name: "Maria",
    middle_name: "Santos",
    date_of_birth: "1980-05-02",
    contact_number: "0917-555-0142",
    email: "maria@example.ph",
    address: "123 Rizal St., Isabela City",
    beneficiaries: [
      { name: "Juan Dela Cruz", relationship: "legal_spouse" },
      { name: "Ana Dela Cruz", relationship: "child_of_legal_age" },
    ],
    branch: "Isabela City",
    plan_tier: "silver1",
    plan_term: "monthly",
    senior: false,
    health_declaration: true,
    dpa_consent: true,
    ...overrides,
  };
}

describe("the plan's own vocabulary (client documents, not invented)", () => {
  it("names exactly the client's four relationships", () => {
    expect(MEMBERSHIP_RELATIONSHIPS.map((r) => r.value)).toEqual([
      "legal_spouse",
      "child_of_legal_age",
      "parent",
      "sibling",
    ]);
    expect(MEMBERSHIP_RELATIONSHIPS.map((r) => r.label)).toEqual([
      "Legal spouse",
      "Child of legal age",
      "Parent",
      "Sibling",
    ]);
    expect(MEMBERSHIP_RELATIONSHIP_LABEL.parent).toBe("Parent");
  });

  it("states the coverage line the plan's records describe", () => {
    expect(MEMBERSHIP_COVERAGE).toContain("Eternal Plans, Inc.");
    expect(MEMBERSHIP_COVERAGE).toContain("network of accredited mortuaries");
  });

  it("keeps the two published rate classes with their own eligibility lines", () => {
    expect(PLAN_RATE_CLASSES.map((k) => k.value)).toEqual(["regular", "senior"]);
    expect(PLAN_RATE_CLASSES[0].eligibility).toBe("Ages 1–60");
    expect(PLAN_RATE_CLASSES[1].eligibility).toContain("61–100");
  });

  it("says application, never certificate, in the one honest line", () => {
    expect(APPLICATION_NOT_A_COC_NOTE).toContain("application, not a certificate of coverage");
    expect(APPLICATION_NOT_A_COC_NOTE).toContain("office issues the real membership document");
  });

  it("labels terms from the one term definition", () => {
    expect(planTermLabel("quarterly")).toBe("Quarterly");
    expect(planTermPer("monthly")).toBe("/ month");
  });
});

describe("form normalisation", () => {
  it("keeps a filled body and turns blanks into nulls", () => {
    const input = membershipApplicationFromForm(validBody({ email: "  ", address: "" }));
    expect(input.first_name).toBe("Maria");
    expect(input.email).toBeNull();
    expect(input.address).toBeNull();
    expect(input.beneficiaries).toHaveLength(2);
    expect(input.senior).toBe(false);
    expect(input.dpa_consented_at).not.toBeNull();
  });

  it("drops beneficiary rows left blank and keeps the named ones", () => {
    const input = membershipApplicationFromForm(
      validBody({
        beneficiaries: [
          { name: "", relationship: "parent" },
          { name: "  Lourdes Cruz ", relationship: "parent" },
        ],
      }),
    );
    expect(input.beneficiaries).toEqual([{ name: "Lourdes Cruz", relationship: "parent" }]);
  });

  it("records no consent timestamp when consent is unticked", () => {
    const input = membershipApplicationFromForm(validBody({ dpa_consent: false }));
    expect(input.dpa_consent).toBe(false);
    expect(input.dpa_consented_at).toBeNull();
  });

  it("refuses a relationship outside the client's list instead of storing it", () => {
    expect(() =>
      membershipApplicationFromForm(
        validBody({ beneficiaries: [{ name: "Cousin", relationship: "cousin" }] }),
      ),
    ).toThrow(/not one of the plan's recorded relationships/);
  });

  it("refuses an unknown tier or payment mode", () => {
    expect(() => membershipApplicationFromForm(validBody({ plan_tier: "platinum" }))).toThrow(
      /five tiers/,
    );
    expect(() => membershipApplicationFromForm(validBody({ plan_term: "weekly" }))).toThrow(
      /four payment modes/,
    );
  });

  it("refuses a body with no plan tier or payment mode instead of guessing", () => {
    expect(() => membershipApplicationFromForm(null)).toThrow(/plan tier is required/);
    expect(() => membershipApplicationFromForm("junk")).toThrow(/plan tier is required/);
    expect(() => membershipApplicationFromForm({ plan_tier: "bronze1" })).toThrow(
      /payment mode is required/,
    );
  });
});

describe("validation is structural and names what is missing", () => {
  it("lists every required cell for a blank application", () => {
    const issues = membershipApplicationIssues(emptyMembershipApplicationInput(""));
    expect(issues.join(" ")).toContain("plan holder's name");
    expect(issues.join(" ")).toContain("date of birth");
    expect(issues.join(" ")).toContain("branch");
    expect(issues.join(" ")).toContain("beneficiary");
    expect(issues.join(" ")).toContain("good-health declaration");
    expect(issues.join(" ")).toContain("data-privacy consent");
  });

  it("accepts a complete application and reports the exact missing fields", () => {
    const complete = membershipApplicationFromForm(validBody());
    expect(validateMembershipApplication(complete)).toEqual({});

    const missingBranch = { ...complete, branch: "" };
    expect(membershipApplicationIssues(missingBranch)).toEqual([
      "Record the branch enrolling the plan.",
    ]);

    const blankBeneficiary = {
      ...complete,
      beneficiaries: [{ name: "  ", relationship: "parent" as const }],
    };
    expect(membershipApplicationIssues(blankBeneficiary)[0]).toContain("beneficiary row");
  });

  it("rejects a malformed date and accepts a well-formed one", () => {
    const complete = membershipApplicationFromForm(validBody());
    expect(membershipApplicationIssues({ ...complete, application_date: "18/09/2026" })).toContain(
      "Not a valid date.",
    );
    expect(membershipApplicationIssues({ ...complete, date_of_birth: "junk" })).toContain(
      "Not a valid date of birth.",
    );
  });

  it("reads the age beside the date of birth the way the paper does", () => {
    expect(planHolderAgeOn("1980-05-02", "2026-09-18")).toBe(46);
    expect(planHolderAgeOn(null, "2026-09-18")).toBeNull();
  });
});

describe("the rate is READ from the pricing store, never typed", () => {
  it("equals the published tier × term figure for every cell and rate class", () => {
    for (const tier of ["bronze1", "bronze2", "silver1", "silver2", "gold"] as const) {
      for (const term of ["monthly", "quarterly", "semi", "annual"] as const) {
        for (const senior of [false, true]) {
          expect(membershipRateCents(SEED_PRICING.plans, tier, term, senior)).toBe(
            planRateOf(SEED_PRICING.plans, tier, term, senior) * 100,
          );
        }
      }
    }
  });

  it("records the CURRENT published figure after an office rate edit", async () => {
    const plans = clone(SEED_PRICING.plans) as PlanPricing;
    plans.regular.find((r) => r.mode === "Monthly")!.bronze1 = 619;
    plans.regular.find((r) => r.mode === "Semi-annual")!.bronze1 = 3714;
    plans.regular.find((r) => r.mode === "Quarterly")!.bronze1 = 1857;
    plans.regular.find((r) => r.mode === "Annual")!.bronze1 = 7428;
    const saved = await savePlanPricing(plans, "Sam Staff");
    expect(saved.updated_at).not.toBeNull();

    const recorded = await recordMembershipApplication(
      validBody({ plan_tier: "bronze1", plan_term: "monthly" }),
      "Sam Staff",
    );
    expect(recorded.rate_cents).toBe(619 * 100);
    expect(recorded.pricing_updated_at).toBe(saved.updated_at);
    expect(recorded.recorded_by).toBe("Sam Staff");
  });

  it("refuses an invalid application (422 with field errors) and writes nothing", async () => {
    await expect(
      recordMembershipApplication(validBody({ branch: "", health_declaration: false }), "Sam Staff"),
    ).rejects.toMatchObject({ status: 422 });
    expect(await listMembershipApplications()).toHaveLength(2); // just the seed rows
  });
});

describe("durable fixture store", () => {
  it("records an application, allocates the next id and survives a re-read", async () => {
    const recorded = await recordMembershipApplication(validBody(), "Sam Staff");
    expect(recorded.id).toBe(3); // seed holds 1 and 2
    expect(recorded.application_date).toBe("2026-09-18");
    expect(recorded.beneficiaries).toHaveLength(2);

    const reread = await getMembershipApplication(3);
    expect(reread).not.toBeNull();
    expect(planHolderFullName(reread!)).toBe("Maria Santos Dela Cruz");
    expect(reread!.rate_cents).toBe(
      planRateOf(SEED_PRICING.plans, "silver1", "monthly", false) * 100,
    );

    // The journal is on disk, append-only and versioned.
    const journal = JSON.parse(await readFile(membershipStorePath(), "utf8")) as {
      version: number;
      events: Array<{ kind: string; application: { id: number } }>;
    };
    expect(journal.version).toBe(1);
    expect(journal.events).toHaveLength(1);
    expect(journal.events[0].kind).toBe("application_recorded");
    expect(journal.events[0].application.id).toBe(3);

    // The register folds seed + journal, seed first.
    const all = await listMembershipApplications();
    expect(all.map((a) => a.id)).toEqual([1, 2, 3]);
  });

  it("allocates distinct ids across two recordings", async () => {
    const first = await recordMembershipApplication(validBody(), "Sam Staff");
    const second = await recordMembershipApplication(
      validBody({ first_name: "Jose", last_name: "Ramos" }),
      "Sam Staff",
    );
    expect([first.id, second.id]).toEqual([3, 4]);
  });

  it("returns null for an unrecorded id and never throws for a junk one", async () => {
    expect(await getMembershipApplication(99)).toBeNull();
    expect(await getMembershipApplication(Number.NaN)).toBeNull();
  });

  it("fails loudly (500) on a corrupt journal instead of guessing", async () => {
    await writeFile(membershipStorePath(), "{ not json", "utf8");
    await expect(listMembershipApplications()).rejects.toMatchObject({ status: 500 });
  });

  it("fails loudly (500) when an event carries an unfrozen relationship", async () => {
    await writeFile(
      membershipStorePath(),
      JSON.stringify({
        version: 1,
        events: [
          {
            kind: "application_recorded",
            at: "2026-09-18T00:00:00Z",
            application: {
              ...validBody(),
              id: 7,
              rate_cents: 100,
              pricing_updated_at: null,
              recorded_by: null,
              created_at: "2026-09-18T00:00:00Z",
              beneficiaries: [{ name: "Cousin", relationship: "cousin" }],
            },
          },
        ],
      }),
      "utf8",
    );
    await expect(listMembershipApplications()).rejects.toBeInstanceOf(ApiError);
  });

  it("writes exactly what a direct draft gives it (no hidden recompute)", async () => {
    const input: MembershipApplicationInput = membershipApplicationFromForm(validBody());
    const record = await recordStoredApplication({
      input,
      rate_cents: 123_456,
      pricing_updated_at: "2026-09-01T00:00:00Z",
      recorded_by: "Ada Admin",
    });
    expect(record.rate_cents).toBe(123_456);
    expect(record.recorded_by).toBe("Ada Admin");
    const reread = await getMembershipApplication(record.id);
    expect(reread!.rate_cents).toBe(123_456);
    expect(reread!.pricing_updated_at).toBe("2026-09-01T00:00:00Z");
  });
});

describe("live mode is an honest refusal, not a fake partner integration", () => {
  it("answers 503 with the reason and writes nothing", async () => {
    process.env.COMMERCE_BASE_URL = "http://gateway.test";
    expect(membershipLiveModeEnabled()).toBe(true);
    await expect(recordMembershipApplication(validBody(), "Sam Staff")).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining(MEMBERSHIP_ADMIN_NOT_WIRED),
    });
    await expect(listMembershipApplications()).rejects.toMatchObject({ status: 503 });
  });
});

describe("the application paper (the shared paper/export kit)", () => {
  it("carries the application-not-a-COC marking, not a COC number", async () => {
    const recorded = await recordMembershipApplication(validBody(), "Sam Staff");
    const { blocks, title } = buildMembershipApplicationPaper(recorded);
    expect(title).toBe("Membership Application");
    const allText = blocks
      .flatMap((b) => {
        if (b.kind === "line") return [b.text];
        if (b.kind === "table")
          return b.rows.flat().map((c) => `${c.label ?? ""} ${c.value}`);
        return [];
      })
      .join(" | ");
    expect(allText).toContain(APPLICATION_NOT_A_COC_NOTE);
    expect(allText).toContain(PAPER_AUTHORITY_NOTE);
    expect(allText).toContain("Maria Santos Dela Cruz");
    expect(allText).toContain("Legal spouse");
    expect(allText).toContain("Child of legal age");
    expect(allText).toContain("Isabela City");
    expect(allText).toContain("₱1,000.00"); // silver1 monthly, as stored
    expect(allText).toContain(HEALTH_DECLARATION_STATEMENT);
    expect(allText).toContain(DPA_CONSENT_STATEMENT);
    // No coverage number, no coverage dates — the office issues those.
    expect(allText).not.toMatch(/COC No\.|Certificate No\.|Coverage (start|end)/i);
    // The identity fields are the paper's own blanks, not the app's record id.
    expect(allText).toContain("____________");
  });

  it("prints the recorded rate exactly as stored, then a later edit does not rewrite it", async () => {
    const recorded = await recordMembershipApplication(validBody(), "Sam Staff");
    const { blocks } = buildMembershipApplicationPaper(recorded);
    const tableText = blocks
      .filter((b) => b.kind === "table")
      .flatMap((b) => (b.kind === "table" ? b.rows.flat().map((c) => c.value) : []))
      .join(" | ");
    expect(recorded.rate_cents).toBe(100_000);
    expect(tableText).toContain("₱1,000.00");

    const plans = clone(SEED_PRICING.plans) as PlanPricing;
    plans.regular.find((r) => r.mode === "Monthly")!.silver1 = 1999;
    plans.regular.find((r) => r.mode === "Semi-annual")!.silver1 = 1999 * 6;
    plans.regular.find((r) => r.mode === "Quarterly")!.silver1 = 1999 * 3;
    plans.regular.find((r) => r.mode === "Annual")!.silver1 = 1999 * 12;
    await savePlanPricing(plans, "Ada Admin");

    // The recorded folio still prints what was recorded — never today's card.
    const reread = await getMembershipApplication(recorded.id);
    const rebuilt = buildMembershipApplicationPaper(reread!);
    const rebuiltText = rebuilt.blocks
      .filter((b) => b.kind === "table")
      .flatMap((b) => (b.kind === "table" ? b.rows.flat().map((c) => c.value) : []))
      .join(" | ");
    expect(rebuiltText).toContain("₱1,000.00");
    expect(rebuiltText).not.toContain("₱1,999.00");
  });

  it("prints honest em dashes for uncaptured cells", () => {
    const blank = {
      ...emptyMembershipApplicationInput("2026-09-18"),
      rate_cents: 0,
      pricing_updated_at: null,
      recorded_by: null,
    };
    const { blocks } = buildMembershipApplicationPaper(blank);
    const text = blocks
      .filter((b) => b.kind === "table")
      .flatMap((b) => (b.kind === "table" ? b.rows.flat().map((c) => c.value) : []))
      .join(" | ");
    expect(text).toContain("—");
  });

  it("exports a valid .docx carrying the enrolment values and the honest line", async () => {
    const recorded = await recordMembershipApplication(validBody(), "Sam Staff");
    const { blocks } = buildMembershipApplicationPaper(recorded);
    const buffer = await paperToDocxBuffer(blocks);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = zip.file("word/document.xml");
    expect(documentXml).toBeTruthy();
    const text = await documentXml!.async("string");
    expect(text).toContain("Maria Santos Dela Cruz");
    expect(text).toContain("application, not a certificate of coverage");
    expect(text).toContain("₱1,000.00");
    expect(text).toContain("Juan Dela Cruz");
  });

  it("exports a structurally valid .pdf", async () => {
    const recorded = await recordMembershipApplication(validBody(), "Sam Staff");
    const { blocks } = buildMembershipApplicationPaper(recorded);
    const buffer = await paperToPdfBuffer(blocks);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const text = buffer.toString("latin1");
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/Page");
  });

  it("names the export file for the holder and the application date", async () => {
    const recorded = await recordMembershipApplication(validBody(), "Sam Staff");
    expect(membershipPaperFileStem(recorded)).toBe(
      "Membership-Application-Maria-Santos-Dela-Cruz-2026-09-18",
    );
  });
});

describe("seed fixture (recorded demo records)", () => {
  it("ships two provisional demo applications with valid frozen vocabulary", async () => {
    const applications = await listMembershipApplications();
    expect(applications).toHaveLength(2);
    for (const app of applications) {
      expect(Number.isInteger(app.id)).toBe(true);
      expect(app.rate_cents).toBeGreaterThan(0);
      expect(app.beneficiaries.length).toBeGreaterThan(0);
      for (const b of app.beneficiaries) {
        expect(MEMBERSHIP_RELATIONSHIPS.map((r) => r.value)).toContain(b.relationship);
      }
      expect(validateMembershipApplication(app)).toEqual({});
    }
  });

  it("keeps its recorded figures on the pricing seed", async () => {
    for (const app of await listMembershipApplications()) {
      expect(app.rate_cents).toBe(
        planRateOf(SEED_PRICING.plans, app.plan_tier, app.plan_term, app.senior) * 100,
      );
    }
  });

  it("carries no COC number, coverage dates or clause text in the raw seed", async () => {
    const raw = JSON.parse(
      await readFile(
        path.join(process.cwd(), "lib/fixtures/commerce/membership-applications.json"),
        "utf8",
      ),
    ) as { applications: Array<Record<string, unknown>> };
    expect(raw.applications.length).toBeGreaterThan(0);
    for (const row of raw.applications) {
      for (const key of Object.keys(row)) {
        expect(key).not.toMatch(/coc|coverage|clause|policy|start|end/i);
      }
    }
  });

  it("stays consistent with the current pricing document at read time", async () => {
    const pricing = await loadPricingDocument();
    const app = await getMembershipApplication(1);
    expect(app!.rate_cents).toBe(
      planRateOf(pricing.plans, app!.plan_tier, app!.plan_term, app!.senior) * 100,
    );
  });
});
