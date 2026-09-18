import { describe, expect, it } from "vitest";
import inquiries from "@/lib/fixtures/crm/inquiries.json";
import leadRecords from "@/lib/fixtures/crm/lead-records.json";
import workspace from "@/lib/fixtures/agent/workspace.json";
import {
  LEAD_CONTACT_KINDS,
  LEAD_INTERESTS,
  LEAD_SOURCES,
  crmLeadsLiveModeEnabled,
  getCrmLead,
  listCrmLeads,
} from "@/lib/api-client/crm-leads";
import { PIPELINE_STAGES } from "@/lib/agent/agent-view";

/**
 * The staff lead-record fixture is PROVISIONAL (no crm-families/lead contract
 * exists — see lib/api-client/crm-leads.ts). These assertions pin the record on
 * the office's side so a future contract freeze starts from a known state, and
 * enforce the two cross-references the file's provenance names:
 *
 *   · the enquiry fields are the recorded inquiries fixture's own row, and
 *   · where the person also exists in the agent workspace, the movement, contact
 *     history, owner and next step are IDENTICAL — the office and the agent can
 *     never tell different stories about the same lead.
 *
 * It also fails any amount-like leaf: this file's business is the person, not
 * money (the recorded pricing/finance fixtures own every figure).
 */

type RawLead = {
  id: string;
  inquiry_reference: string | null;
  name: string;
  phone: string;
  email: string;
  source: string;
  topic: string;
  message: string;
  interest: string;
  stage: string;
  owner: string;
  first_contact_at: string;
  last_contact_at: string;
  next_action: string;
  stage_history: Array<{ stage: string; at: string; by: string; note: string }>;
  activity: Array<{ id: string; kind: string; at: string; title: string; detail: string }>;
};

const leads = leadRecords.leads as unknown as RawLead[];
const inquiriesRows = inquiries.inquiries as unknown as Array<{
  reference: string;
  person: { full_name: string; email: string; phone: string };
  source: string;
  topic: string;
  message: string;
}>;
const prospects = workspace.prospects as unknown as Array<{
  id: string;
  stage: string;
  owner: string;
  first_contact_at: string;
  last_contact_at: string;
  next_action: string;
  stage_history: unknown;
}>;
const activityByProspect = workspace.prospect_activity as unknown as Record<
  string,
  unknown
>;

describe("staff lead-records fixture", () => {
  it("is fixture-only until a lead/customer-records contract freezes", () => {
    expect(crmLeadsLiveModeEnabled()).toBe(false);
  });

  it("reads every recorded lead through the client, and 404s an unknown id", async () => {
    const listed = await listCrmLeads();
    expect(listed).toHaveLength(leads.length);
    expect(listed.map((l) => l.id)).toEqual(leads.map((l) => l.id));
    await expect(getCrmLead("lead-nobody")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
    await expect(getCrmLead(leads[0].id)).resolves.toMatchObject({ id: leads[0].id });
  });

  it("uses the PRD pipeline stages only, and every lead has a recorded origin", () => {
    for (const lead of leads) {
      expect(PIPELINE_STAGES).toContain(lead.stage);
      expect(lead.stage_history.length, `${lead.id} has no recorded movement`).toBeGreaterThan(0);
      for (const move of lead.stage_history) expect(PIPELINE_STAGES).toContain(move.stage);
    }
  });

  it("gives every lead a movement that starts at the enquiry and ends where they stand", () => {
    for (const lead of leads) {
      const history = lead.stage_history;
      expect(history[0].stage, `${lead.id}: the first move is the enquiry`).toBe("new");
      expect(history[0].at).toBe(lead.first_contact_at);
      expect(history[history.length - 1].stage, `${lead.id}: the last move is the stage`).toBe(
        lead.stage,
      );
      expect(history[history.length - 1].at).toBe(lead.last_contact_at);
      let previousTime = -Infinity;
      let previousStage = -1;
      for (const move of history) {
        const at = new Date(move.at).getTime();
        expect(Number.isNaN(at), `${lead.id}: ${move.at} is not a date`).toBe(false);
        expect(at, `${lead.id}: movement is out of order`).toBeGreaterThanOrEqual(previousTime);
        const stage = PIPELINE_STAGES.indexOf(move.stage as (typeof PIPELINE_STAGES)[number]);
        expect(stage, `${lead.id}: stage moves backwards`).toBeGreaterThan(previousStage);
        expect(move.by.length).toBeGreaterThan(0);
        expect(move.note.length).toBeGreaterThan(0);
        previousTime = at;
        previousStage = stage;
      }
      expect(new Date(lead.first_contact_at).getTime()).toBeLessThanOrEqual(
        new Date(lead.last_contact_at).getTime(),
      );
    }
  });

  it("uses the recorded lead-source, interest and contact-kind vocabularies", () => {
    for (const lead of leads) {
      expect((LEAD_SOURCES as readonly string[]).includes(lead.source)).toBe(true);
      expect((LEAD_INTERESTS as readonly string[]).includes(lead.interest)).toBe(true);
      for (const entry of lead.activity) {
        expect((LEAD_CONTACT_KINDS as readonly string[]).includes(entry.kind)).toBe(true);
        expect(entry.title.length).toBeGreaterThan(0);
        expect(entry.detail.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every recorded contact inside the lead's recorded window", () => {
    for (const lead of leads) {
      for (const entry of lead.activity) {
        const at = new Date(entry.at).getTime();
        expect(Number.isNaN(at), `${lead.id}: ${entry.at} is not a date`).toBe(false);
        expect(at).toBeGreaterThanOrEqual(new Date(lead.first_contact_at).getTime());
        expect(at).toBeLessThanOrEqual(new Date(lead.last_contact_at).getTime());
      }
    }
  });

  it("takes the enquiry fields from the recorded inquiries row its reference names", () => {
    for (const lead of leads) {
      if (lead.inquiry_reference == null) continue;
      const inquiry = inquiriesRows.find((row) => row.reference === lead.inquiry_reference);
      expect(inquiry, `${lead.id}: no recorded inquiry ${lead.inquiry_reference}`).toBeTruthy();
      expect(lead.name).toBe(inquiry!.person.full_name);
      expect(lead.phone).toBe(inquiry!.person.phone);
      expect(lead.email).toBe(inquiry!.person.email);
      expect(lead.source).toBe(inquiry!.source);
      expect(lead.topic).toBe(inquiry!.topic);
      expect(lead.message).toBe(inquiry!.message);
    }
  });

  it("mirrors the agent record exactly for a person both surfaces carry", () => {
    for (const lead of leads) {
      const prospect = prospects.find((p) => p.id === lead.id);
      if (!prospect) continue;
      expect(lead.stage, `${lead.id}: stage drift`).toBe(prospect.stage);
      expect(lead.owner, `${lead.id}: owner drift`).toBe(prospect.owner);
      expect(lead.first_contact_at).toBe(prospect.first_contact_at);
      expect(lead.last_contact_at).toBe(prospect.last_contact_at);
      expect(lead.next_action).toBe(prospect.next_action);
      expect(lead.stage_history).toEqual(prospect.stage_history);
      expect(lead.activity).toEqual(activityByProspect[lead.id] ?? []);
    }
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

  it("keeps every recorded lead's ids unique", () => {
    const ids = leads.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
