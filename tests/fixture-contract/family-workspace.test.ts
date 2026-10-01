import { describe, expect, it } from "vitest";
import workspace from "@/lib/fixtures/family/workspace.json";
import snapshot from "@/lib/fixtures/family/snapshot.json";
import { FAMILY_HELP } from "@/lib/family/contact";
import { APPOINTMENT_REASONS } from "@/lib/public-forms/validation";
import {
  familyInstantDateLabel,
  familyInstantTimeLabel,
  familyInstantWeekday,
} from "@/lib/family/family-view";

/**
 * The family workspace fixture is PROVISIONAL (no frozen family API contract yet —
 * dev-authored, exactly like `lib/fixtures/agent/workspace.json`). It is a HOUSEHOLD
 * (captain, 2026-09-30): each loved one's lot, requests and appointments live under
 * `loved_ones[]`, keyed by the same `id` as the snapshot. This test pins the promises
 * the record-backed family screens rest on:
 *
 *   1. every fact it shows cross-references a real recorded source, per loved one;
 *   2. it carries no money, no chapel, no ticket number and no coordinator name;
 *   3. its own recorded labels agree with what the view layer renders from the
 *      instants, so a drift between the two cannot ship quietly.
 */
type WorkspacePerson = {
  id: string;
  lot: {
    park: string;
    section: string;
    lot_number: string;
    kept_by: string;
    with_office: string[];
  };
  requests: Array<{
    id: string;
    title: string;
    asked_on: string;
    state: string;
    next: string;
    action_label: string;
  }>;
  appointments: Array<{
    id: string;
    starts_at: string;
    day_label: string;
    time_label: string;
    title: string;
    reason: string;
    where: string;
    state: "confirmed" | "waiting" | "past";
    action_label: string;
    next?: string;
    discussed?: string;
  }>;
};

type Workspace = {
  _provenance?: { status?: string; note?: string[] | string };
  ask_for: Array<{ key: string; label: string; detail: string }>;
  loved_ones: WorkspacePerson[];
};

type SnapshotPerson = {
  id: string;
  name: string;
  plan_summary: { plan_name: string };
  balance_cents: { total: number; paid: number; remaining: number };
};

const ws = workspace as unknown as Workspace;
const snap = snapshot as unknown as {
  family: { display_name: string };
  loved_ones: SnapshotPerson[];
};

const snapById = new Map(snap.loved_ones.map((one) => [one.id, one]));

describe("the family workspace fixture", () => {
  it("is fixture-only until the family API contract freezes, and says so", async () => {
    const { familyLiveModeEnabled } = await import("@/lib/api-client/family");
    expect(familyLiveModeEnabled()).toBe(false);
    const provenance = JSON.stringify(ws._provenance ?? "");
    expect(provenance).toMatch(/PROVISIONAL/);
    expect(provenance).toMatch(/family API contract/);
  });

  it("is keyed per loved one, matching the snapshot's own ids", () => {
    expect(ws.loved_ones.length).toBeGreaterThanOrEqual(2);
    const ids = ws.loved_ones.map((one) => one.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(snapById.has(id), `workspace has no snapshot record for ${id}`).toBe(true);
    }
    expect(new Set(ids)).toEqual(new Set(snap.loved_ones.map((one) => one.id)));
  });

  it("records no amount and no ticket number anywhere", () => {
    // Money lives in the family snapshot and lib/villa-pricing.ts; the request log is
    // the office's own, and the app issues no ticket number.
    const body = JSON.stringify({ ...ws, _provenance: undefined });
    expect(body).not.toMatch(/₱|PHP|cent|peso/i);
    expect(body).not.toMatch(/ticket|TKT|#\d{3,}/i);
  });

  it("places no family at a chapel — the park's chapel list is still a PLACEHOLDER", () => {
    // A request may be *about* a chapel (the PRD's own taxonomy, crm-cases.md:44),
    // but no record may put a family at one: the park's chapel names are unconfirmed
    // (scheduling/chapel-admin.json) and the office, the park and a home are the only
    // places this fixture names.
    const places = ws.loved_ones
      .flatMap((one) => [
        ...one.appointments.map((appointment) => `${appointment.where} ${appointment.title}`),
        one.lot.park,
        one.lot.kept_by,
      ])
      .join(" ");
    expect(places).not.toMatch(/chapel|capilla|San Jose/i);
    expect(places).not.toMatch(/Chapel A|Chapel B/);
  });

  it("derives every lot's plan name and owner from the snapshot, never a second copy", async () => {
    // The workspace fixture no longer stores `plan_name`/`owner_name`: they are the
    // snapshot's own words, read through `getFamilyHousehold`. One fact, one record.
    for (const one of ws.loved_ones) {
      const stored = one.lot as unknown as Record<string, unknown>;
      expect(stored.plan_name, `${one.id} still stores the plan name`).toBeUndefined();
      expect(stored.owner_name, `${one.id} still stores the account holder`).toBeUndefined();
    }
    const { getFamilyHousehold } = await import("@/lib/api-client/family");
    const household = await getFamilyHousehold();
    for (const person of household.people) {
      const personSnap = snapById.get(person.id);
      expect(personSnap, `no snapshot record for ${person.id}`).toBeTruthy();
      if (!personSnap || !person.lot) continue;
      expect(person.lot.plan_name).toBe(personSnap.plan_summary.plan_name);
      expect(person.lot.owner_name).toBe(snap.family.display_name);
      // The lot number the screen leads with is the one the plan already names.
      expect(personSnap.plan_summary.plan_name).toContain(person.lot.lot_number);
      expect(person.lot.section).toBe(person.lot.lot_number.split("-")[0]);
      // The park is the client's own park (lib/family/contact.ts), never an invented one.
      expect(FAMILY_HELP.park).toContain(person.lot.park);
    }
  });

  it("keeps the money it does not own out of the record", () => {
    for (const one of snap.loved_ones) {
      expect(one.balance_cents.remaining).toBe(one.balance_cents.total - one.balance_cents.paid);
    }
    for (const one of ws.loved_ones) {
      expect(JSON.stringify(one.lot)).not.toMatch(/balance|amount|price/i);
    }
  });

  it("describes the fields the office still holds instead of asserting values for them", () => {
    for (const one of ws.loved_ones) {
      expect(one.lot.with_office.length).toBeGreaterThan(0);
      for (const field of one.lot.with_office) {
        // Every entry is a question the office can answer, never a made-up answer.
        expect(field, `“${field}” reads like an asserted value`).toMatch(/^(Who|Every|The|What) /);
      }
    }
  });

  it("uses only family words for a request's state, and one distinct action each", () => {
    const states = new Set(ws.loved_ones.flatMap((one) => one.requests.map((r) => r.state)));
    expect([...states].sort()).toEqual(["done", "waiting_on_you", "with_office"]);
    for (const one of ws.loved_ones) {
      for (const request of one.requests) {
        expect(request.title.length).toBeGreaterThan(3);
        expect(request.next.length).toBeGreaterThan(10);
        // Repeated link text is an accessibility defect; every row brings its own words.
        expect(request.action_label.length).toBeGreaterThan(3);
      }
    }
    const labels = ws.loved_ones.flatMap((one) => one.requests.map((r) => r.action_label));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("dates every request as a real calendar day", () => {
    for (const one of ws.loved_ones) {
      for (const request of one.requests) {
        expect(request.asked_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const parsed = new Date(`${request.asked_on}T00:00:00Z`);
        expect(Number.isNaN(parsed.getTime())).toBe(false);
      }
    }
  });

  it("reproduces each appointment's own day and time labels from its instant", () => {
    // The fixture records what the office wrote; the pages render from the instant.
    // If the two ever drift, one of them is wrong.
    for (const one of ws.loved_ones) {
      expect(one.appointments.length).toBeGreaterThan(0);
      for (const appointment of one.appointments) {
        const weekday = familyInstantWeekday(appointment.starts_at);
        const date = familyInstantDateLabel(appointment.starts_at);
        expect(`${weekday} ${date}`, `${appointment.id} day_label`).toBe(appointment.day_label);
        expect(familyInstantTimeLabel(appointment.starts_at), `${appointment.id} time_label`).toBe(
          appointment.time_label,
        );
      }
    }
  });

  it("uses the app's one appointment-reason vocabulary, never a new one", () => {
    const reasons = new Set<string>(APPOINTMENT_REASONS);
    for (const one of ws.loved_ones) {
      for (const appointment of one.appointments) {
        expect(reasons.has(appointment.reason), `unknown reason “${appointment.reason}”`).toBe(true);
      }
    }
  });

  it("gives every appointment its own visible action words within a person", () => {
    for (const one of ws.loved_ones) {
      const own = one.appointments.map((appointment) => appointment.action_label);
      for (const label of own) expect(label.length).toBeGreaterThan(3);
      expect(new Set(own).size).toBe(own.length);
    }
  });

  it("covers the PRD's universal request taxonomy in the family's words", () => {
    // crm-cases.md:44 — lot concern · payment · maintenance · document request ·
    // transfer · interment · memorial update · chapel/funeral inquiry · other.
    expect(ws.ask_for.map((item) => item.key)).toEqual([
      "lot",
      "papers",
      "payment",
      "transfer",
      "interment",
      "memorial",
      "services",
      "other",
    ]);
    for (const item of ws.ask_for) {
      expect(item.label.length).toBeGreaterThan(3);
      expect(item.detail.length).toBeGreaterThan(10);
    }
  });

  it("never presents a time the office has not confirmed as agreed", () => {
    for (const one of ws.loved_ones) {
      for (const appointment of one.appointments) {
        expect(appointment.where.length).toBeGreaterThan(3);
        if (appointment.state === "waiting") {
          expect(appointment.next ?? "", `${appointment.id} waiting`).toMatch(/confirm/i);
        }
        if (appointment.state === "confirmed") {
          expect(appointment.next ?? "", `${appointment.id} confirmed`).toMatch(/confirm/i);
        }
        if (appointment.state === "past") {
          // A past visit earns its place on the page by saying what was discussed.
          expect(appointment.discussed ?? "", `${appointment.id} past`).not.toBe("");
        }
      }
    }
  });
});
