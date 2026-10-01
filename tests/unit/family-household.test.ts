import { describe, expect, it } from "vitest";
import {
  familyPeople,
  getFamilyCase,
  getFamilyHousehold,
  getFamilyLotRecord,
  getFamilySnapshot,
  listFamilyAppointments,
  listFamilyRequests,
} from "@/lib/api-client/family";
import {
  nextFamilyObligation,
  nextFamilyVisit,
  personIdFrom,
} from "@/lib/family/family-household";

/**
 * The household model (captain, 2026-09-30): one account, many loved ones.
 *
 * These tests pin the two rules the feature rests on: every record is addressed
 * per person (the same records the pages always read, now keyed by `?person=`),
 * and nothing is blended — two loved ones' money and visits stay separate.
 */
const FIXED_NOW = new Date("2026-10-01T00:00:00Z");

describe("the household model", () => {
  it("merges each loved one's plan, money and papers with their lot, records and case", async () => {
    const household = await getFamilyHousehold();
    expect(household.family.display_name).toBe("Cory Customer");
    expect(household.people.length).toBeGreaterThanOrEqual(2);
    for (const person of household.people) {
      expect(person.id).toBeTruthy();
      expect(person.name).toBeTruthy();
      expect(person.plan_summary.plan_name).toBeTruthy();
      expect(person.lot?.lot_number).toBeTruthy();
      expect(Array.isArray(person.requests)).toBe(true);
      expect(Array.isArray(person.appointments)).toBe(true);
      expect(person.familyCase?.steps.length).toBe(5);
    }
  });

  it("resolves the address to one person, defaulting to the first", async () => {
    const household = await getFamilyHousehold();
    const first = household.people[0];
    const second = household.people[1];

    const defaultSnapshot = await getFamilySnapshot();
    expect(defaultSnapshot.loved_one.name).toBe(first.name);
    expect(defaultSnapshot.person_id).toBe(first.id);

    const secondSnapshot = await getFamilySnapshot(second.id);
    expect(secondSnapshot.loved_one.name).toBe(second.name);
    expect(secondSnapshot.person_id).toBe(second.id);
    expect(secondSnapshot.household?.map((one) => one.id)).toEqual(
      household.people.map((one) => one.id),
    );
  });

  it("keeps an unknown person id on the first loved one rather than 404ing", async () => {
    const household = await getFamilyHousehold();
    const snapshot = await getFamilySnapshot("not-a-person");
    expect(snapshot.person_id).toBe(household.people[0].id);
  });

  it("gives every page the chosen person's own records", async () => {
    const household = await getFamilyHousehold();
    const second = household.people[1];

    const [snapshot, lot, requests, appointments, familyCase] = await Promise.all([
      getFamilySnapshot(second.id),
      getFamilyLotRecord(second.id),
      listFamilyRequests(second.id),
      listFamilyAppointments(second.id),
      getFamilyCase(second.id),
    ]);
    expect(snapshot.loved_one.name).toBe(second.name);
    expect(lot.lot_number).toBe(second.lot?.lot_number);
    expect(requests.map((request) => request.id)).toEqual(
      second.requests.map((request) => request.id),
    );
    expect(appointments.map((appointment) => appointment.id)).toEqual(
      second.appointments.map((appointment) => appointment.id),
    );
    expect(familyCase?.loved_one).toBe(second.name);
  });

  it("exposes the switcher's people list, one entry per loved one", async () => {
    const household = await getFamilyHousehold();
    const people = familyPeople(household);
    expect(people).toHaveLength(household.people.length);
    for (const person of people) {
      expect(Object.keys(person).sort()).toEqual(["id", "life_dates", "name"]);
    }
  });
});

describe("personIdFrom — the address is untrusted input", () => {
  it("reads a plain value, the first of an array, and nothing when absent", () => {
    expect(personIdFrom({ person: "aurora-dela-cruz" })).toBe("aurora-dela-cruz");
    expect(personIdFrom({ person: ["aurora-dela-cruz", "ernesto-dela-cruz"] })).toBe(
      "aurora-dela-cruz",
    );
    expect(personIdFrom({ person: [] })).toBeUndefined();
    expect(personIdFrom({ person: "   " })).toBeUndefined();
    expect(personIdFrom({})).toBeUndefined();
    expect(personIdFrom(undefined)).toBeUndefined();
  });
});

describe("next obligation and next visit stay per person", () => {
  it("derives each loved one's own next open instalment", async () => {
    const household = await getFamilyHousehold();
    const ernesto = household.people.find((person) => person.id === "ernesto-dela-cruz");
    const aurora = household.people.find((person) => person.id === "aurora-dela-cruz");
    if (!ernesto || !aurora) throw new Error("fixture missing a person");

    const a = nextFamilyObligation(ernesto, FIXED_NOW);
    const b = nextFamilyObligation(aurora, FIXED_NOW);
    expect(a?.reference).toBe("VM-PLAN-2026-0188");
    expect(b?.reference).toBe("VM-PLAN-2026-0241");
    expect(a?.amount).not.toBe(b?.amount);
    expect(a?.days_until_due).toBeLessThan(0);
    expect(b?.days_until_due).toBeGreaterThan(0);
  });

  it("returns the earliest non-past visit, or null when none is ahead", async () => {
    const household = await getFamilyHousehold();
    const ernesto = household.people.find((person) => person.id === "ernesto-dela-cruz");
    const aurora = household.people.find((person) => person.id === "aurora-dela-cruz");
    if (!ernesto || !aurora) throw new Error("fixture missing a person");

    expect(nextFamilyVisit(ernesto.appointments, FIXED_NOW)).toBeNull();
    const visit = nextFamilyVisit(aurora.appointments, FIXED_NOW);
    expect(visit?.id).toBe("appt-aurora-park");
  });

  it("returns null when a plan is paid up, never a made-up obligation", () => {
    const person = {
      payment_schedule: {
        reference: "VM-PLAN-2026-9999",
        term: "monthly" as const,
        first_due_on: "2026-07-01",
        installments: [{ seq: 1, amount_cents: 1000000, paid_cents: 1000000 }],
      },
    };
    expect(nextFamilyObligation(person, FIXED_NOW)).toBeNull();
  });
});
