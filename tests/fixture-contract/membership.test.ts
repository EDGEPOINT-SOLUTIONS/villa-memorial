import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { listMembershipApplications } from "@/lib/api-client/membership-applications";
import {
  MEMBERSHIP_RELATIONSHIPS,
  planHolderAgeOn,
  planHolderFullName,
} from "@/lib/contracts/membership-application";
import { planRateOf } from "@/lib/pricing-model";
import { SEED_PRICING } from "@/lib/villa-pricing";

/**
 * Membership-application fixture contract.
 *
 * No contract under docs/08-delivery/contracts/ names a membership / COC record — the
 * shape is PROVISIONAL (pre-need partner domain; the signed paper is not archived in this
 * project). These tests pin what the recorded demo rows DO promise while it waits:
 *
 *  - every recorded figure is the published 2026 plan rate for its tier × term × rate
 *    class, read through `planRateOf` on the pricing seed — a rate typed into the fixture
 *    (or a pricing edit that drifts from the seed) fails here, naming the row;
 *  - the rate class matches the holder's age on the application date (regular 1–60,
 *    senior 61–100 as the plan publishes);
 *  - the relationship values are the client's own four, and the rows carry NO issuance
 *    field (no COC number, no coverage start/end, no clause text) — the app reproduces no
 *    document it has never seen.
 */

const FIXTURE = path.join(
  process.cwd(),
  "lib/fixtures/commerce/membership-applications.json",
);

type RawSeed = { applications: Array<Record<string, unknown>> };

describe("membership application seed — figures are the published plan rates", () => {
  it("starts clean — no recorded application to rate (captain, 2026-10-02)", async () => {
    const applications = await listMembershipApplications();
    expect(applications).toEqual([]);
  });

  it("classifies each holder by the age the plan's own rate classes use", async () => {
    for (const app of await listMembershipApplications()) {
      const age = planHolderAgeOn(app.date_of_birth, app.application_date);
      expect(age, `${planHolderFullName(app)} needs a date of birth`).not.toBeNull();
      if (app.senior) {
        expect(age!).toBeGreaterThanOrEqual(61);
        expect(age!).toBeLessThanOrEqual(100);
      } else {
        expect(age!).toBeGreaterThanOrEqual(1);
        expect(age!).toBeLessThanOrEqual(60);
      }
    }
  });

  it("allocates unique, ascending record ids and names every holder", async () => {
    const applications = await listMembershipApplications();
    const ids = applications.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
    for (const app of applications) {
      expect(planHolderFullName(app).length).toBeGreaterThan(0);
      expect(app.application_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(app.branch.trim().length).toBeGreaterThan(0);
      expect(app.dpa_consent).toBe(true);
      expect(app.health_declaration).toBe(true);
    }
  });
});

describe("membership application seed — vocabulary and absence of issuance fields", () => {
  it("uses only the client's own relationship values", async () => {
    const allowed = MEMBERSHIP_RELATIONSHIPS.map((r) => r.value);
    for (const app of await listMembershipApplications()) {
      expect(app.beneficiaries.length).toBeGreaterThan(0);
      for (const beneficiary of app.beneficiaries) {
        expect(allowed).toContain(beneficiary.relationship);
      }
    }
  });

  it("carries no COC number, coverage window or clause text in any row", () => {
    const raw = JSON.parse(readFileSync(FIXTURE, "utf8")) as RawSeed;
    expect(raw.applications).toEqual([]);
    for (const row of raw.applications) {
      for (const key of Object.keys(row)) {
        expect(key).not.toMatch(/coc|coverage|clause|policy|start|end/i);
      }
    }
    // The published-rate reader still resolves a real tier × term from the seed.
    expect(planRateOf(SEED_PRICING.plans, "silver2", "monthly", false)).toBeGreaterThan(0);
  });

  it("keeps the fixture's provenance comment stating the paper is not archived", () => {
    const raw = JSON.parse(readFileSync(FIXTURE, "utf8")) as { comment: string[] };
    const comment = raw.comment.join("\n");
    expect(comment).toContain("No contract");
    expect(comment.toLowerCase()).toContain("not archived");
    expect(comment).toContain("PROVISIONAL");
  });
});
