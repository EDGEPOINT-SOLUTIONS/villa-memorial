import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import snapshot from "@/lib/fixtures/family/snapshot.json";
import familyWorkspace from "@/lib/fixtures/family/workspace.json";
import agentWorkspace from "@/lib/fixtures/agent/workspace.json";
import customersFile from "@/lib/fixtures/crm/customers.json";
import memorialsFile from "@/lib/fixtures/memorials/memorials.json";
import { nextPaymentDue, parsePaymentSchedule } from "@/lib/payment-schedule";
import { familyDocumentReleased } from "@/lib/family/family-view";
import type { Client } from "@/lib/api-client/agent";
import type { FamilyAppointment } from "@/lib/api-client/family";

/**
 * THE DEMO IS ONE WORLD — the consistency contract.
 *
 * The captain's brief (2026-09-30): “The datas are not consistent, please make the
 * datas consistent.” The demo household the family portal serves — the manager
 * Cory Customer, the loved ones Ernesto and Aurora Dela Cruz, their plans
 * (VM-PLAN-2026-0188 · Lawn A-01; VM-PLAN-2026-0241 · Niche C-02) and their money —
 * used to be absent from the office/agent record entirely, so a person looking at
 * both portals saw two different funeral homes. The family portal also stored the
 * lot's plan name and owner a second time, a copy free to drift.
 *
 * This test pins the fixed contract on BOTH sides of the seam:
 *
 *   A. FIXTURES — the one record and the derivation.
 *      · `family/snapshot.json` is the ONE home for the people, the plans and the
 *        money; `family/workspace.json` is the ONE home for the lot codes and the
 *        visits. The workspace no longer stores `lot.plan_name` / `lot.owner_name`
 *        — they are derived from the snapshot by `getFamilyHousehold()`.
 *      · `agent/workspace.json` stores the household as a thin row (`client-cory`)
 *        with `household_ref` and no copy of the shared facts; `lib/api-client/
 *        agent.ts` derives them at read time.
 *
 *   B. SCREENS — every screen that prints a shared fact agrees.
 *      The family dashboard / lot / payments / papers / visits and the agent
 *      clients list / client record are rendered and the SAME strings are read
 *      from both.
 *
 * Anything that disagrees fails here, naming the fact. When a fixture is edited,
 * this test is the one that must move with it.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/dashboard",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  notFound: () => {
    throw new Error("not found");
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "im_u"
        ? {
            name,
            value: Buffer.from(JSON.stringify({ email: "customer@vm.demo" }), "utf8").toString(
              "base64",
            ),
          }
        : undefined,
  }),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "customer@vm.demo", scopes: [] }),
}));

const { listAgentClients } = await import("@/lib/api-client/agent");
const { getFamilyHousehold } = await import("@/lib/api-client/family");

const { default: FamilyLayout } = await import("@/app/(family)/client/layout");
const { default: FamilyDashboard } = await import("@/app/(family)/client/dashboard/page");
const { default: FamilyProperty } = await import("@/app/(family)/client/property/page");
const { default: FamilyPayments } = await import("@/app/(family)/client/payments/page");
const { default: FamilyDocuments } = await import("@/app/(family)/client/documents/page");
const { default: FamilyAppointments } = await import("@/app/(family)/client/appointments/page");
const { default: AgentClients } = await import("@/app/(agent)/agent/clients/page");
const { default: AgentClient } = await import("@/app/(agent)/agent/clients/[id]/page");

const HOUSEHOLD_CLIENT_ID = "client-cory";
/** The family pages read the selected person from `searchParams`; no `person` = the first. */
function personParams(id: string) {
  return { searchParams: Promise.resolve({ person: id } as Record<string, string | string[]>) };
}

async function renderAgentClient(): Promise<string> {
  return renderToStaticMarkup(
    await AgentClient({ params: Promise.resolve({ id: HOUSEHOLD_CLIENT_ID }) }),
  );
}

type SnapshotLovedOne = {
  id: string;
  name: string;
  life_dates: string;
  plan_summary: { plan_name: string; status: string; term: string; next_due: string };
  balance: { total: string; paid: string; remaining: string };
  balance_cents: { total: number; paid: number; remaining: number };
  payment_schedule: unknown;
  recent_documents: Array<{ title: string; kind: string; status: string }>;
};

type WorkspaceLovedOne = {
  id: string;
  lot: { park: string; section: string; lot_number: string };
  appointments: FamilyAppointment[];
};

const snapshotPeople = snapshot.loved_ones as unknown as SnapshotLovedOne[];
const workspacePeople = familyWorkspace.loved_ones as unknown as WorkspaceLovedOne[];

/** One loved one's shared facts, read from the family's recorded source. */
function householdFacts() {
  const people = snapshotPeople.map((person) => {
    const workspace = workspacePeople.find((entry) => entry.id === person.id);
    if (!workspace) throw new Error(`workspace has no record for ${person.id}`);
    const schedule = parsePaymentSchedule(person.payment_schedule);
    if (!schedule) throw new Error(`${person.id} records no usable payment schedule`);
    const due = nextPaymentDue(schedule);
    if (!due) throw new Error(`${person.id} records no open instalment`);
    return { person, workspace, schedule, due };
  });
  const earliest = [...people].sort((a, b) => a.due.due_on.localeCompare(b.due.due_on))[0];
  // The agent's “papers you can hand over” are only the copies the office has
  // RELEASED; a paper still being checked is not one of them (the same rule the
  // agent client applies, `familyDocumentReleased`).
  const paperTitles = Array.from(
    new Set(
      people.flatMap(({ person }) =>
        person.recent_documents
          .filter((document) => familyDocumentReleased(document.status))
          .map((document) => document.title),
      ),
    ),
  );
  const visits = people.flatMap(({ person, workspace }) =>
    workspace.appointments.map((appointment) => ({ person: person.name, appointment })),
  );
  return { family: snapshot.family, people, earliest, paperTitles, visits };
}

describe("the demo household is ONE record — fixture consistency", () => {
  it("stores each loved one's plan and money in the family snapshot only", () => {
    const { people } = householdFacts();
    expect(people.length).toBeGreaterThanOrEqual(2);
    for (const { person, workspace } of people) {
      expect(person.plan_summary.plan_name).toContain(workspace.lot.lot_number);
      expect(person.balance_cents.remaining).toBe(
        person.balance_cents.total - person.balance_cents.paid,
      );
      expect(person.payment_schedule).toBeTruthy();
    }
  });

  it("derives each lot's plan name and owner instead of storing a second copy", async () => {
    for (const workspace of workspacePeople) {
      const stored = workspace.lot as unknown as Record<string, unknown>;
      expect(stored.plan_name, `${workspace.id} still duplicates the plan name`).toBeUndefined();
      expect(stored.owner_name, `${workspace.id} still duplicates the account holder`).toBeUndefined();
    }
    const household = await getFamilyHousehold();
    for (const person of household.people) {
      const snapshotPerson = snapshotPeople.find((entry) => entry.id === person.id);
      expect(snapshotPerson, `no snapshot record for ${person.id}`).toBeTruthy();
      if (!snapshotPerson) continue;
      expect(person.lot?.plan_name).toBe(snapshotPerson.plan_summary.plan_name);
      expect(person.lot?.owner_name).toBe(snapshot.family.display_name);
    }
  });

  it("keeps the office/agent household row thin — no copy of the shared facts", () => {
    const raw = (agentWorkspace.clients as unknown as Array<Record<string, unknown>>).find(
      (client) => client.id === HOUSEHOLD_CLIENT_ID,
    );
    expect(raw, "the office/agent record no longer carries the demo household").toBeTruthy();
    expect(raw?.household_ref, "the household row must name its family source").toBeTruthy();
    for (const copied of ["name", "phone", "email", "holdings", "next_amount", "papers"]) {
      expect(raw?.[copied], `agent/workspace.json copies the shared fact “${copied}”`).toBeUndefined();
    }
  });

  it("derives the agent household's people, plans, money, lots, papers and visits from the family record", async () => {
    const facts = householdFacts();
    const clients = await listAgentClients();
    const household = clients.find((client) => client.id === HOUSEHOLD_CLIENT_ID) as Client;
    expect(household, "the agent clients list does not carry the demo household").toBeTruthy();

    // People
    expect(household.name).toBe(facts.family.display_name);
    expect(household.phone).toBe(facts.family.primary_contact);
    expect(household.email).toBe(facts.family.email);

    // Each loved one's plan + money + lot
    for (const { person, workspace, schedule } of facts.people) {
      const plan = household.holdings.find(
        (holding) => holding.kind === "plan" && holding.label === person.plan_summary.plan_name,
      );
      expect(plan, `the agent record has no plan for ${person.name}`).toBeTruthy();
      expect(plan?.detail).toContain(schedule.reference);
      expect(plan?.detail).toContain(person.balance.remaining);

      const lot = household.holdings.find(
        (holding) => holding.kind === "lot" && holding.label === `Lot ${workspace.lot.lot_number}`,
      );
      expect(lot, `the agent record has no lot for ${person.name}`).toBeTruthy();
      expect(lot?.detail).toContain(workspace.lot.section);
      expect(lot?.detail).toContain(workspace.lot.park);
    }

    // The next amount is the household's earliest open instalment.
    expect(household.next_amount).toEqual({
      amount_cents: facts.earliest.due.due_cents,
      due_at: facts.earliest.due.due_on,
    });

    // Papers (deduplicated titles)
    expect(household.papers).toEqual(facts.paperTitles);

    // Visits — same ids, person, labels, places and states the family portal shows.
    expect(
      household.visits?.map((visit) => ({
        id: visit.id,
        person: visit.person,
        day_label: visit.day_label,
        time_label: visit.time_label,
        where: visit.where,
        state: visit.state,
      })),
    ).toEqual(
      facts.visits.map(({ person, appointment }) => ({
        id: appointment.id,
        person,
        day_label: appointment.day_label,
        time_label: appointment.time_label,
        where: appointment.where,
        state: appointment.state,
      })),
    );
  });

  it("points the household at a real recorded customer, and keeps the memorial unpublished", () => {
    const cory = (customersFile.customers as Array<{ id: string; email: string }>).find(
      (customer) => customer.email === snapshot.family.email,
    );
    expect(cory, "the account holder is not in the office's customer record").toBeTruthy();

    // No loved one's memorial has chosen a visibility: nothing may be published.
    expect((memorialsFile as unknown as { consents: unknown[] }).consents).toEqual([]);
  });
});

describe("the demo household is ONE story — rendered screens agree", () => {
  it("reads the same household name on the family and agent portals", async () => {
    const family = renderToStaticMarkup(
      await FamilyLayout({ children: createElement("p", null, "body") }),
    );
    const agent = await renderAgentClient();
    for (const html of [family, agent]) expect(html).toContain("Dela Cruz family");
  });

  it("reads the same plan, reference and money on the family and agent screens", async () => {
    const facts = householdFacts();
    const first = facts.people[0];
    const params = personParams(first.person.id);
    const dashboard = renderToStaticMarkup(await FamilyDashboard(params));
    const payments = renderToStaticMarkup(await FamilyPayments(params));
    const agent = await renderAgentClient();

    for (const html of [dashboard, payments, agent]) {
      expect(html).toContain(first.person.plan_summary.plan_name);
    }
    expect(payments).toContain(first.schedule.reference);
    expect(agent).toContain(first.schedule.reference);
    expect(dashboard).toContain(first.person.balance.remaining);
    expect(payments).toContain(first.person.balance.remaining);
    expect(agent).toContain(first.person.balance.remaining);
    // The dashboard spells the next due date out; the agent record prints the plan's
    // own recorded line. Both are the same date and amount.
    expect(dashboard).toContain("27 September 2026");
    expect(agent).toContain(first.person.plan_summary.next_due);
  });

  it("reads the same lot code on the family lot screen and the agent record", async () => {
    const facts = householdFacts();
    const first = facts.people[0];
    const lotPage = renderToStaticMarkup(await FamilyProperty(personParams(first.person.id)));
    const agent = await renderAgentClient();
    for (const html of [lotPage, agent]) {
      expect(html).toContain(`Lot ${first.workspace.lot.lot_number}`);
      expect(html).toContain(first.workspace.lot.park);
      expect(html).toContain(facts.family.display_name);
    }
  });

  it("reads the same released papers on the family and agent screens — and never a paper still being checked", async () => {
    const facts = householdFacts();
    const first = facts.people[0];
    const papers = renderToStaticMarkup(await FamilyDocuments(personParams(first.person.id)));
    const agent = await renderAgentClient();
    for (const document of first.person.recent_documents) {
      // The family's own page always shows the paper, whatever its state …
      expect(papers).toContain(document.title);
      // … the agent's “papers you can hand over” only lists a RELEASED copy.
      if (familyDocumentReleased(document.status)) {
        expect(agent).toContain(document.title);
      }
    }
    // Aurora's Death certificate is recorded `pending_review`; the family page says
    // it is “Being checked” and the agent page must not call it released.
    const aurora = facts.people.find(({ person }) => person.id === "aurora-dela-cruz")!;
    const pending = aurora.person.recent_documents.filter(
      (document) => !familyDocumentReleased(document.status),
    );
    expect(pending.map((document) => document.title)).toContain("Death certificate");
    for (const document of pending) {
      expect(agent, `the agent page claims ${document.title} is released`).not.toContain(
        document.title,
      );
    }
  });

  it("reads the same visit dates and places on the family and agent screens", async () => {
    const facts = householdFacts();
    const first = facts.people[0];
    const visits = renderToStaticMarkup(await FamilyAppointments(personParams(first.person.id)));
    const agent = await renderAgentClient();
    for (const appointment of first.workspace.appointments) {
      // The family visit page is a calendar: it prints the weekday and the date on the
      // day cell and the time (and the open day's place) in its detail panel, while the
      // agent record prints the family's own `day_label` and `where` whole. The shared
      // source is pinned by the fixture half above, so a place cannot drift either.
      const [weekday, ...dateParts] = appointment.day_label.split(" ");
      const date = dateParts.join(" ");
      expect(visits).toContain(weekday);
      expect(visits).toContain(date);
      expect(visits).toContain(appointment.time_label);
      expect(agent).toContain(appointment.day_label);
      expect(agent).toContain(appointment.time_label);
      expect(agent).toContain(appointment.where);
    }
  });

  it("lists the household in the agent's book of business", async () => {
    const html = renderToStaticMarkup(await AgentClients({ searchParams: Promise.resolve({}) }));
    expect(html).toContain(snapshot.family.display_name);
    expect(html).toContain(householdFacts().people[0].person.plan_summary.plan_name);
  });
});
