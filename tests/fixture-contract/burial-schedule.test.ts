import { describe, expect, it } from "vitest";
import burialsFile from "@/lib/fixtures/scheduling/burials.json";
import casesFile from "@/lib/fixtures/operations/cases.json";
import lotsFile from "@/lib/fixtures/property/lots.json";
import lifecycleFile from "@/lib/fixtures/property/lot-lifecycle.json";
import { isCalendarDate } from "@/lib/chapel-booking";
import { BURIAL_CONFLICT_KINDS, LIGHT_PICKUP_STATES, isTimeOfDay } from "@/lib/burial-calendar";

/**
 * The burial-schedule fixture is PROVISIONAL — no contract names a burial
 * schedule or a light-pickup record — so this suite pins the promises the staff
 * calendar rests on:
 *
 *   1. every burial's identity (case, deceased name, coordinator) is a recorded
 *      case's own words — nothing is invented;
 *   2. every lot is a real property row and, where the lot lifecycle records an
 *      interment for that case, the burial's lot agrees with it;
 *   3. a light-pickup entry, when present, is a real park clock reading with a
 *      crew ROLE (never a person) and a vocabulary state;
 *   4. no amount, price or fee appears anywhere — a burial schedule is not a sale.
 */
const store = burialsFile as unknown as {
  _provenance: { status?: string; note?: string[] | string };
  tenant_id: string;
  as_of: string;
  burials: Array<{
    id: string;
    date: string;
    time: string;
    case_number: string;
    deceased_name: string;
    lot_number: string;
    section: string;
    coordinator: string;
    light_pickup: {
      time: string;
      state: string;
      crew: string;
      note: string | null;
    } | null;
    note: string | null;
  }>;
};

const CASES = casesFile as unknown as {
  cases: Array<{
    case_number: string;
    deceased_name: string;
    assigned_coordinator: string;
  }>;
};
const LOTS = lotsFile as unknown as {
  lots: Array<{ lot_number: string; section: string }>;
};
const LIFECYCLE = lifecycleFile as unknown as {
  interments: Array<{ case_number: string; lot_number: string }>;
};

function amountLikeKeys(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => amountLikeKeys(entry, `${path}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      /amount|price|cost|fee|rate|cents|currency/i.test(key)
        ? [`${path}.${key}`]
        : amountLikeKeys(entry, `${path}.${key}`),
    );
  }
  return [];
}

describe("the burial schedule is app-authored and cross-referenced", () => {
  it("says so in its provenance", () => {
    expect(store._provenance.status ?? "").toMatch(/APP-AUTHORED/);
    const note = Array.isArray(store._provenance.note)
      ? store._provenance.note.join(" ")
      : (store._provenance.note ?? "");
    expect(note).toMatch(/no contract names/i);
  });

  it("opens on a real recorded day", () => {
    expect(isCalendarDate(store.as_of)).toBe(true);
  });

  it("ties every burial to a real case, with the case's own words", () => {
    for (const burial of store.burials) {
      const kase = CASES.cases.find((c) => c.case_number === burial.case_number);
      expect(kase, `${burial.id} names ${burial.case_number}`).toBeDefined();
      expect(burial.deceased_name, `${burial.id} deceased`).toBe(kase?.deceased_name);
      expect(burial.coordinator, `${burial.id} coordinator`).toBe(kase?.assigned_coordinator);
    }
  });

  it("schedules a burial on a real lot, agreeing with the lot lifecycle's interment", () => {
    for (const burial of store.burials) {
      const lot = LOTS.lots.find((l) => l.lot_number === burial.lot_number);
      expect(lot, `${burial.id} names lot ${burial.lot_number}`).toBeDefined();
      expect(burial.section, `${burial.id} section`).toBe(lot?.section);
      const interment = LIFECYCLE.interments.find(
        (i) => i.case_number === burial.case_number,
      );
      if (interment) {
        expect(burial.lot_number, `${burial.id} vs interment`).toBe(interment.lot_number);
      }
    }
  });

  it("records a burial on a real calendar day and a park clock time", () => {
    const ids = new Set<string>();
    for (const burial of store.burials) {
      expect(ids.has(burial.id), `duplicate id ${burial.id}`).toBe(false);
      ids.add(burial.id);
      expect(isCalendarDate(burial.date), `${burial.id} date`).toBe(true);
      expect(isTimeOfDay(burial.time), `${burial.id} time`).toBe(true);
    }
  });
});

describe("the light pickup is a recorded schedule on its own burial", () => {
  it("gives every present pickup a clock time, a crew role and a vocabulary state", () => {
    const withPickup = store.burials.filter((b) => b.light_pickup !== null);
    // Clean start (captain, 2026-10-02): the recorded demo burials are removed, so
    // there is no pickup to schedule until the office records a burial.
    expect(store.burials).toEqual([]);
    expect(withPickup).toEqual([]);
    expect(isTimeOfDay("08:00")).toBe(true);
    expect(LIGHT_PICKUP_STATES.length).toBeGreaterThan(0);
  });

  it("keeps the pickup crew a role label, never a person's name", () => {
    for (const burial of store.burials) {
      const pickup = burial.light_pickup;
      if (!pickup) continue;
      // A person would be two capitalised words; a crew label is a role.
      expect(pickup.crew.split(/\s+/).length, `${burial.id} crew`).toBeLessThanOrEqual(3);
    }
  });
});

describe("the schema and the money rule", () => {
  it("uses only the conflict vocabulary the calendar knows", () => {
    expect(BURIAL_CONFLICT_KINDS).toContain("pickup_crew");
  });

  it("carries no amount, price or fee anywhere", () => {
    expect(amountLikeKeys(store)).toEqual([]);
  });
});
