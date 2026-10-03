/* --- test-only demo fixtures (clean start, captain 2026-10-02/03) --- */
vi.mock("@/lib/fixtures/lifecycle/engagements.json", async () => ({
  default: (await import("../fixtures/lifecycle-engagements-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getEngagementView,
  listEngagementViews,
  listNoticeTemplates,
  recordEngagementOutcome,
  recordEngagementPayment,
  saveNoticeTemplate,
  markNoticeSent,
  soldProspectsAwaiting,
} from "@/lib/api-client/lifecycle";
import { listNoticeSends, getEngagement, recordEngagement } from "@/lib/api-client/lifecycle-store";
import { recordProspectCapture, recordStageMove } from "@/lib/api-client/agent-store";
import { ApiError } from "@/lib/api-client/api-error";
import type { EngagementInput } from "@/lib/lifecycle";

/**
 * The lifecycle store and its app-facing read.
 *
 * The recorded seed is read-only and folded with an append-only journal: a
 * recording survives, reaches the next read, and allocates a reference that
 * cannot collide. The money is DERIVED from the recorded payments — a payment
 * never edits the contract, and an overpayment is refused rather than floored.
 */

const NOW = new Date("2026-10-03T00:00:00Z");

const PLAN_INPUT: EngagementInput = {
  kind: "plan",
  client: { name: "Test Member", phone: "", email: "" },
  prospect_id: null,
  agent: null,
  item: { sku: "", name: "Silver 2", detail: "", price_basis: "" },
  amount_cents: 1_200_000,
  mode: "monthly",
  installments: 12,
  first_due_on: "2026-10-27",
  schedule: null,
  lot: null,
};

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-lifecycle-store-"));
  process.env.LIFECYCLE_STORE_PATH = path.join(dir, "commerce-lifecycle.json");
  process.env.AGENT_STORE_PATH = path.join(dir, "agent-pipeline.json");
});

afterEach(async () => {
  delete process.env.LIFECYCLE_STORE_PATH;
  delete process.env.AGENT_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("the seed folds with the journal", () => {
  it("reads the recorded outcomes, payments and modular templates", async () => {
    const views = await listEngagementViews(NOW);
    expect(views.length).toBe(12);
    expect(new Set(views.map((view) => view.engagement.kind))).toEqual(
      new Set(["plan", "service", "lot", "product"]),
    );
    // Rosa Lim: 4 of 12 installments paid; the next is due 27 October.
    const rosa = await getEngagementView("eng-plan-0001", NOW);
    expect(rosa?.totals.paid_cents).toBe(448_000);
    expect(rosa?.payments).toHaveLength(4);
    expect(rosa?.totals.next_due?.seq).toBe(5);

    const templates = await listNoticeTemplates();
    expect(templates.map((template) => template.label)).toContain("Two days before");
    expect(templates.every((template) => template.active)).toBe(true);
  });

  it("surfaces an overdue lot and a due-soon plan for the demo day", async () => {
    const views = await listEngagementViews(NOW);
    const overdue = views.find((view) => view.engagement.id === "eng-lot-0002");
    expect(overdue?.totals.overdue_cents).toBeGreaterThan(0);
    const dueSoon = views.find((view) => view.engagement.id === "eng-plan-0003");
    expect(dueSoon?.totals.due_soon_cents).toBeGreaterThan(0);
  });
});

describe("recording an outcome", () => {
  it("allocates the next reference, persists it and folds it into every read", async () => {
    const created = await recordEngagementOutcome(
      {
        kind: "plan",
        name: "Test Member",
        item_name: "Silver 2",
        amount: "12000",
        mode: "monthly",
        installments: "12",
        first_due_on: "2026-10-27",
      },
      "Sam Staff",
      NOW,
    );
    expect(created.reference).toBe("VMP-2026-0005");
    expect(created.recorded_by).toBe("Sam Staff");

    const reread = await getEngagement(created.id);
    expect(reread?.client.name).toBe("Test Member");

    // The journal on disk is an append-only envelope, not a rewritten seed.
    const raw = JSON.parse(await readFile(process.env.LIFECYCLE_STORE_PATH as string, "utf8"));
    expect(raw.version).toBe(1);
    expect(raw.events).toHaveLength(1);
    expect(raw.events[0].kind).toBe("engagement_recorded");
  });

  it("refuses a malformed outcome and writes nothing", async () => {
    await expect(
      recordEngagementOutcome({ kind: "plan", name: "", item_name: "", amount: "0" }, null, NOW),
    ).rejects.toBeInstanceOf(ApiError);
    const views = await listEngagementViews(NOW);
    expect(views).toHaveLength(12);
  });
});

describe("recording a payment", () => {
  it("derives the balance and refuses an overpayment", async () => {
    const before = await getEngagementView("eng-plan-0001", NOW);
    const outstanding = before?.totals.outstanding_cents ?? 0;

    await recordEngagementPayment(
      { engagement_id: "eng-plan-0001", amount: "1120", paid_on: "2026-10-03", note: "October" },
      "Sam Staff",
      NOW,
    );
    const after = await getEngagementView("eng-plan-0001", NOW);
    expect(after?.totals.paid_cents).toBe((before?.totals.paid_cents ?? 0) + 112_000);

    await expect(
      recordEngagementPayment(
        { engagement_id: "eng-plan-0001", amount: String(outstanding + 100), paid_on: "2026-10-03" },
        "Sam Staff",
        NOW,
      ),
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe("modular notices", () => {
  it("adds and edits a template, and records a hand-off", async () => {
    const added = await saveNoticeTemplate(
      { label: "One week before", days_before: 7, message: "Hello {member}, {amount} is due {date}.", active: true },
      NOW,
    );
    expect((await listNoticeTemplates()).map((template) => template.label)).toContain("One week before");

    const paused = await saveNoticeTemplate(
      { ...added, active: false },
      NOW,
    );
    const reread = (await listNoticeTemplates()).find((template) => template.id === added.id);
    expect(reread?.active).toBe(false);
    expect(paused.created_at).toBe(added.created_at);

    await markNoticeSent(
      { engagement_id: "eng-plan-0001", template_id: "notice-2-days", seq: 5 },
      "Sam Staff",
      NOW,
    );
    const sends = await listNoticeSends();
    expect(sends).toHaveLength(1);
    expect(sends[0]).toMatchObject({ engagement_id: "eng-plan-0001", seq: 5, sent_by: "Sam Staff" });
  });
});

describe("the store lock and id allocation", () => {
  it("does not collide when two outcomes are recorded at once", async () => {
    const [a, b] = await Promise.all([
      recordEngagement(PLAN_INPUT, "Sam", NOW),
      recordEngagement(PLAN_INPUT, "Sam", NOW),
    ]);
    expect(a.id).not.toBe(b.id);
    expect(new Set([a.reference, b.reference]).size).toBe(2);
  });
});

describe("the prospect fold (one fact, one source)", () => {
  it("surfaces a sold prospect with no recorded outcome, and clears it once recorded", async () => {
    await recordProspectCapture({
      capture: {
        id: "prospect-sold",
        name: "Nena Bautista",
        phone: "+63 917 000 0001",
        email: "nena@example.com",
        source: "walk_in",
        interest: "plan",
        want: "A pre-need plan",
        callback: "",
        note: "Sold at the desk.",
        captured_by: "Sam Staff",
      },
    });
    await recordStageMove({ prospectId: "prospect-sold", stage: "sold", by: "Sam Staff", note: "Sold." });

    const awaiting = await soldProspectsAwaiting("plan");
    expect(awaiting.map((prospect) => prospect.id)).toContain("prospect-sold");

    await recordEngagementOutcome(
      {
        kind: "plan",
        name: "Nena Bautista",
        item_name: "Silver 2",
        amount: "12000",
        mode: "monthly",
        installments: "12",
        first_due_on: "2026-10-27",
        prospect_id: "prospect-sold",
      },
      "Sam Staff",
      NOW,
    );
    expect((await soldProspectsAwaiting("plan")).map((prospect) => prospect.id)).not.toContain(
      "prospect-sold",
    );
  });
});
