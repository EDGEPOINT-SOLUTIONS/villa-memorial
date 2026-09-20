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

type PageComponent = () => Promise<React.ReactElement>;

const { default: RequestsPage } = await import("@/app/(family)/client/requests/page");
const { default: AppointmentsPage } = await import("@/app/(family)/client/appointments/page");
const { default: LotPage } = await import("@/app/(family)/client/property/page");
const { default: MemorialsPage } = await import("@/app/(family)/client/memorials/page");

async function render(page: PageComponent): Promise<string> {
  return renderToStaticMarkup(await page());
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

describe("Appointments — the times, and whether a person confirmed them", () => {
  it("shows what is arranged, what waits for the office and what has happened", async () => {
    const html = await render(AppointmentsPage);
    expect(html).toContain("What is arranged");
    expect(html).toContain("The office comes to you");
    expect(html).toContain("Confirmed by the office");
    expect(html).toContain("Waiting for the office");
    expect(html).toContain("Sat with us at the office");
    expect(html).toContain("Happened");
    expect(html).toContain("What you asked about before");
  });

  it("prints each time from its instant, in the park's own time", async () => {
    const html = await render(AppointmentsPage);
    expect(html).toContain("Tuesday");
    expect(html).toContain("22 September");
    expect(html).toContain("10:00 AM");
    expect(html).toContain("29 September");
    expect(html).toContain("9:30 AM");
  });

  it("lays out the booking path as three plain steps, ending with a phone call", async () => {
    const html = await render(AppointmentsPage);
    expect(html).toContain("Call us");
    expect(html).toContain("We agree the day with you");
    expect(html).toContain("Call to set a day");
    expect(html).toContain("Your home, the office in Sunrise, or the park at Begang");
    expect(html).toContain('href="/map"');
  });

  it("never invents a chapel, an amount or a confirmation", async () => {
    const html = await render(AppointmentsPage);
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

  it("keeps the money on the payments page, with no invented amount here", async () => {
    const html = await render(LotPage);
    // The lot page no longer reprints the balance (it duplicated Payments); it
    // links there, and carries no amount of its own that could drift.
    expect(html).toContain('href="/client/payments"');
    const amounts = html.match(/₱[\d,]+/g) ?? [];
    expect(amounts, `unexpected amount on the lot page: ${amounts.join(", ")}`).toHaveLength(0);
  });

  it("lists what the office still holds instead of guessing it", async () => {
    const html = await render(LotPage);
    expect(html).toContain("the right of interment is on the ownership papers");
    expect(html).toContain("we’ll read them to you");
    expect(html).toContain("stay with our property office");
    assertNoParagraphNesting(html, "Your lot");
  });
});

describe("Remembering — the memorial's state, and nothing published", () => {
  it("leads with the true fact and the record the office holds", async () => {
    const html = await render(MemorialsPage);
    expect(html).toContain("Nothing about Ernesto is published anywhere.");
    expect(html).toContain("In loving memory");
    expect(html).toContain("Ernesto Dela Cruz");
    expect(html).toContain("1948 – 2026");
    expect(html).toContain("ED");
    expect(html).toContain("Lot A-01");
  });

  it("offers every visibility choice as undecided — no default is invented", async () => {
    const html = await render(MemorialsPage);
    expect(html).toContain("Only your family");
    expect(html).toContain("Relatives with a private link");
    expect(html).toContain("Anyone who looks for them");
    expect(html.match(/Not decided yet/g) ?? []).toHaveLength(3);
  });

  it("says what the service will add, and that nothing can be posted today", async () => {
    const html = await render(MemorialsPage);
    expect(html).toContain("Their story");
    expect(html).toContain("Photographs");
    expect(html).toContain("Messages from family and friends");
    expect(html).toContain("The dates you want to remember");
    expect(html).toContain("nothing can be posted");
    expect(html).not.toContain("₱");
    assertNoParagraphNesting(html, "Remembering");
  });
});
