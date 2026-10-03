import { describe, expect, it } from "vitest";
import leadRecords from "@/lib/fixtures/crm/lead-records.json";
import { crmLeadsLiveModeEnabled, getCrmLead, listCrmLeads } from "@/lib/api-client/crm-leads";

/**
 * The staff lead-record fixture (Relationships → Sales pipeline). It is
 * PROVISIONAL (no crm-families/lead contract exists — see
 * lib/api-client/crm-leads.ts) and starts CLEAN (captain, 2026-10-02): the demo
 * leads are removed, so the pipeline screen renders its honest empty state. The
 * office's live prospect lifecycle runs on the shared agent journal instead —
 * see lib/api-client/agent.ts — and an enquiry converted on the Inquiries board
 * reaches the Prospects screen and the agent pipeline through it.
 *
 * These assertions pin the empty state, the 404 on an unknown id and the one
 * rule that must never drift: this file's business is the person, never money.
 */

const leads = leadRecords.leads as unknown as unknown[];

describe("staff lead-records fixture starts clean", () => {
  it("is fixture-only until a lead/customer-records contract freezes", () => {
    expect(crmLeadsLiveModeEnabled()).toBe(false);
  });

  it("carries no recorded leads", async () => {
    expect(leads).toEqual([]);
    expect(await listCrmLeads()).toEqual([]);
    await expect(getCrmLead("lead-nobody")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
  });

  it("NEVER invents an amount — the lead file carries no money leaf at all", () => {
    const offenders: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`));
      if (typeof value === "object" && value !== null) {
        for (const [key, child] of Object.entries(value)) {
          if (/amount|cent|price|fee|rate|commission/i.test(key)) offenders.push(`${path}.${key}`);
          walk(child, `${path}.${key}`);
        }
        return;
      }
      if (typeof value === "string" && /[₱]|\bphp\b/i.test(value)) offenders.push(`${path}=${value}`);
    };
    walk(leadRecords, "lead-records");
    expect(offenders).toEqual([]);
  });
});
