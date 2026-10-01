import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PersonSwitcher } from "@/components/family/family-person-switcher";
import { PersonSummaryCard } from "@/components/family/family-household-ui";
import { isHousehold } from "@/lib/family/family-household";
import type { FamilyPerson } from "@/lib/api-client/family";

/**
 * The person switcher and the household summaries (captain, 2026-09-30).
 *
 * The single-person case is the one that must not regress: a household with one
 * loved one renders NO switcher at all. With several, the switcher offers
 * “Everyone” and each loved one as real links.
 */
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

const TWO = [
  { id: "ernesto-dela-cruz", name: "Ernesto Dela Cruz", life_dates: "1948 – 2026" },
  { id: "aurora-dela-cruz", name: "Aurora Dela Cruz", life_dates: "1951 – 2024" },
];

describe("the person switcher", () => {
  it("renders nothing for a single-person household — no empty switcher, no ‘1 of 1’", () => {
    const html = renderToStaticMarkup(<PersonSwitcher people={[TWO[0]]} selectedId={TWO[0].id} />);
    expect(html).toBe("");
  });

  it("treats one loved one as not a household", () => {
    expect(isHousehold({ household: [TWO[0]] })).toBe(false);
    expect(isHousehold({ household: TWO })).toBe(true);
    expect(isHousehold({})).toBe(false);
  });

  it("offers everyone and each loved one as their own address", () => {
    const html = renderToStaticMarkup(
      <PersonSwitcher people={TWO} selectedId="aurora-dela-cruz" basePath="/client/payments" />,
    );
    expect(html).toContain("Everyone");
    expect(html).toContain("Ernesto Dela Cruz");
    expect(html).toContain("Aurora Dela Cruz");
    expect(html).toContain('href="/client/dashboard"');
    expect(html).toContain('href="/client/payments?person=ernesto-dela-cruz"');
    expect(html).toContain('href="/client/payments?person=aurora-dela-cruz"');
    // Exactly one person is the current view.
    expect(html.match(/aria-current="page"/g) ?? []).toHaveLength(1);
  });

  it("marks Everyone as current only on the household dashboard", () => {
    const dashboard = renderToStaticMarkup(
      <PersonSwitcher people={TWO} basePath="/client/dashboard" everyoneCurrent />,
    );
    expect(dashboard.match(/aria-current="page"/g) ?? []).toHaveLength(1);
    expect(dashboard).toContain(">Everyone<");
  });
});

describe("the household summary card", () => {
  it("shows one person's own plan and next visit, never a combined total", () => {
    const person: FamilyPerson = {
      id: "aurora-dela-cruz",
      name: "Aurora Dela Cruz",
      life_dates: "1951 – 2024",
      plan_summary: {
        plan_name: "Garden Niche · Niche C-02",
        status: "Active",
        term: "5 years",
        next_due: "Oct 5, 2026 · ₱8,505",
      },
      balance: { total: "₱34,020", paid: "₱17,010", remaining: "₱17,010" },
      balance_cents: { total: 3402000, paid: 1701000, remaining: 1701000 },
      payment_schedule: {
        reference: "VM-PLAN-2026-0241",
        term: "monthly",
        first_due_on: "2026-08-05",
        installments: [
          { seq: 1, amount_cents: 850500, paid_cents: 850500 },
          { seq: 2, amount_cents: 850500, paid_cents: 850500 },
          { seq: 3, amount_cents: 850500, paid_cents: 0 },
          { seq: 4, amount_cents: 850500, paid_cents: 0 },
        ],
      },
      recent_documents: [],
      lot: {
        plan_name: "Garden Niche · Niche C-02",
        park: "Sanctuario de Mercedes y Gloria",
        section: "C",
        lot_number: "C-02",
        owner_name: "Cory Customer",
        owner_note: "The name on this account",
        kept_by: "The property office, Sunrise",
        record_note: "…",
        with_office: [],
      },
      requests: [],
      appointments: [
        {
          id: "appt-aurora-park",
          kind: "park_visit",
          starts_at: "2026-10-13T01:30:00Z",
          day_label: "Tuesday 13 October",
          time_label: "9:30 AM",
          title: "Walk to her lot with us",
          reason: "Visit a memorial lot",
          where: "Sanctuario de Mercedes y Gloria · the Main Entrance",
          bring: [],
          state: "confirmed",
          action_label: "Call to move this visit",
          next: "Confirmed by the office.",
        },
      ],
      familyCase: null,
    };
    const html = renderToStaticMarkup(
      <PersonSummaryCard person={person} now={new Date("2026-10-01T00:00:00Z")} />,
    );
    expect(html).toContain("Aurora Dela Cruz");
    expect(html).toContain("₱8,505");
    expect(html).toContain("Next visit");
    expect(html).toContain("Tuesday, 13 October");
    expect(html).toContain("nothing here adds two people’s money together");
  });
});
