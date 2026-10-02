import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import snapshot from "@/lib/fixtures/family/snapshot.json";
import { assertNoParagraphNesting } from "../helpers/paragraph-nesting";

/**
 * The four record-backed family screens the captain approved on 2026-09-18 —
 * Requests, Appointments, My Lots and Remembering.
 *
 * These tests pin the JOB each screen does on the office's recorded fixture
 * (lib/fixtures/family/workspace.json): every request with its state, every
 * appointment with whether a person confirmed it, the lot record with the money
 * already recorded on the plan, and the memorial's state (nothing published,
 * nothing decided). They also pin what must NOT appear: no invented amount
 * outside the snapshot, no chapel, no published memorial content.
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
  usePathname: () => "/client/requests",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "customer@vm.demo", scopes: [] }),
}));

type PageComponent = (props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) => Promise<React.ReactElement>;

const { default: RequestsPage } = await import("@/app/(family)/client/requests/page");
const { default: AppointmentsPage } = await import("@/app/(family)/client/appointments/page");
const { default: LotPage } = await import("@/app/(family)/client/property/page");
const { default: MemorialsPage } = await import("@/app/(family)/client/memorials/page");

async function render(page: PageComponent): Promise<string> {
  return renderToStaticMarkup(await page({}));
}

describe("Requests — the family's requests and where each one stands", () => {
  it("shows every request with the family's word for its state", async () => {
    const html = await render(RequestsPage);
    expect(html).toContain("Cut the grass around your lot");
    expect(html).toContain("A certified copy of the service contract");
    expect(html).toContain("Your balance, written down");
    expect(html).toContain("With the office");
    expect(html).toContain("Waiting on you");
    expect(html).toContain(">Done<");
    // The date the office wrote each one down comes from the record.
    expect(html).toContain("Asked 12 September");
    expect(html).toContain("Asked 15 September");
  });

  it("gives every row its own way to reach a person", async () => {
    const html = await render(RequestsPage);
    expect(html).toContain("Call for the latest");
    expect(html).toContain("Call and we will sort it");
    expect(html).toContain("Ask for another copy");
    expect(html).toContain('href="tel:+639176178489"');
  });

  it("answers “what can I ask for?” with the office's own service list", async () => {
    const html = await render(RequestsPage);
    expect(html).toContain("Something at the lot");
    expect(html).toContain("A paper or a copy");
    expect(html).toContain("A payment question");
    expect(html).toContain("A change to who the lot belongs to");
    expect(html).toContain("Interment or exhumation");
    expect(html).toContain("A chapel or funeral question");
  });

  it("says plainly that the log is kept by hand and reaches us by phone", async () => {
    const html = await render(RequestsPage);
    expect(html).toContain("request service isn’t connected");
    expect(html).toContain("What this page can’t show yet");
    expect(html).not.toMatch(/ticket|Ticket/);
    expect(html).not.toContain("₱");
    assertNoParagraphNesting(html, "Requests");
  });
});

describe("Appointments — the month, and whether a person confirmed each time", () => {
  const APPOINTMENTS = { searchParams: Promise.resolve({ person: "ernesto-dela-cruz" }) };
  const renderAppointments = async () => renderToStaticMarkup(await AppointmentsPage(APPOINTMENTS));

  it("marks every recorded time on its own day of the month", async () => {
    const html = await renderAppointments();
    // The calendar opens on the month that holds the recorded times.
    expect(html).toContain("September 2026");
    expect(html).toContain("What is arranged");
    // Every day's mark names the visit and its state, so a screen reader — and
    // the page's own day detail — can read what the day is for.
    expect(html).toContain("The office comes to you");
    expect(html).toContain("Confirmed by the office");
    expect(html).toContain("Waiting for the office");
    expect(html).toContain("Sat with us at the office");
    expect(html).toContain("Happened");
  });

  it("prints each time from its instant, in the park's own time", async () => {
    const html = await renderAppointments();
    expect(html).toContain("Tuesday");
    expect(html).toContain("22 September");
    expect(html).toContain("10:00 AM");
    expect(html).toContain("29 September");
    expect(html).toContain("9:30 AM");
  });

  it("asks for a visit from the chosen day, showing the office payload", async () => {
    const html = await renderAppointments();
    expect(html).toContain("Ask for a visit on this day");
    expect(html).toContain("What the office will receive");
    expect(html).toContain("For the day");
    expect(html).toContain("nothing is booked until they call you");
  });

  it("lays out the booking path as three plain steps, ending with a phone call", async () => {
    const html = await renderAppointments();
    expect(html).toContain("Call us");
    expect(html).toContain("We agree the day with you");
    expect(html).toContain("Call to set a day");
    expect(html).toContain("Your home, the office in Sunrise, or the park at Begang");
    expect(html).toContain('href="/map"');
  });

  it("never invents a chapel, an amount or a confirmation", async () => {
    const html = await renderAppointments();
    expect(html).not.toMatch(/chapel/i);
    expect(html).not.toContain("₱");
    expect(html).toContain("scheduling service isn’t connected");
    assertNoParagraphNesting(html, "Ask for a visit");
  });
});

describe("My Lots — the lot record beside the family's own plan", () => {
  it("shows the place, the plan and the name the record is held in", async () => {
    const html = await render(LotPage);
    expect(html).toContain("Lot A-01");
    expect(html).toContain("Section A");
    expect(html).toContain("Premium Lawn · Lawn A-01");
    expect(html).toContain("Sanctuario de Mercedes y Gloria");
    expect(html).toContain(snapshot.family.display_name);
    expect(html).toContain("Held in the name of");
  });

  it("shows the lot's recorded amortization, never the plan balance again", async () => {
    const html = await render(LotPage);
    // The plan's own money stays on Payments; the lot page links there instead
    // of reprinting the balance it does not own.
    expect(html).toContain('href="/client/payments"');
    // The only amounts here are the client's recorded lot-sheet amortization
    // for section A (Prime Lots): regular ₱1,920, senior ₱1,688 and the
    // ₱128,000 selling total — never the plan balance the Payments page owns.
    const amounts = html.match(/₱[\d,]+/g) ?? [];
    expect([...new Set(amounts)].sort()).toEqual(["₱1,688", "₱1,920", "₱128,000"].sort());
    expect(html).not.toContain("₱42,000");
    expect(html).not.toContain("₱22,000");
  });

  it("lists what the office still holds instead of guessing it", async () => {
    const html = await render(LotPage);
    expect(html).toContain("the right of interment is on the ownership papers");
    expect(html).toContain("we’ll read them to you");
    expect(html).toContain("stay with our property office");
    assertNoParagraphNesting(html, "Your lot");
  });
});

describe("Remembering — one switch per loved one, nothing published by default", () => {
  it("lists every loved one with their own named switch", async () => {
    const html = await render(MemorialsPage);
    expect(html).toContain("You decide who is remembered.");
    expect(html).toContain("Ernesto Dela Cruz");
    expect(html).toContain("Aurora Dela Cruz");
    expect(html).toContain("Make Ernesto Dela Cruz visible");
    expect(html).toContain("Make Aurora Dela Cruz visible");
  });

  it("says plainly that nothing is public while the switch is off", async () => {
    const html = await render(MemorialsPage);
    expect(html).toContain("Nothing about Ernesto Dela Cruz is shown publicly.");
    expect(html).toContain("Nothing about Aurora Dela Cruz is shown publicly.");
    // Every field choice defaults OFF and none is checked.
    expect(html.match(/checked=""/g) ?? []).toHaveLength(0);
  });

  it("explains each field choice in the family's own words", async () => {
    const html = await render(MemorialsPage);
    expect(html).toContain("Show their photograph");
    expect(html).toContain("Only used if you have attached one.");
    expect(html).toContain("Show the year they were born");
    expect(html).toContain("Show the year they died");
    expect(html).toContain("Show the lot number");
    expect(html).toContain("private business");
  });

  it("keeps the honesty about what the office's service still cannot do", async () => {
    const html = await render(MemorialsPage);
    expect(html).toContain("What this page can’t show yet");
    expect(html).toContain("stories and messages are not open yet");
    expect(html).not.toContain("₱");
    assertNoParagraphNesting(html, "Remembering");
  });
});

// Test-only demo seed: the product fixtures start clean (captain, 2026-10-02).
// This suite exercises the recorded records through a test-only copy, so the
// pages keep their content-bearing contract tests without restoring demo data.
vi.mock("@/lib/fixtures/agent/workspace.json", async () => ({
  default: (await import("../fixtures/agent-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/snapshot.json", async () => ({
  default: (await import("../fixtures/family-snapshot-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/workspace.json", async () => ({
  default: (await import("../fixtures/family-workspace-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/case.json", async () => ({
  default: (await import("../fixtures/family-case-demo.json")).default,
}));
