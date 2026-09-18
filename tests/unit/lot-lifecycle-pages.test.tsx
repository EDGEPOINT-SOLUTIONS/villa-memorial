import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
import { assertNoParagraphNesting } from "../helpers/paragraph-nesting";
import { measureProse } from "../helpers/prose";

/**
 * The four lot-record screens (captain checklist F-11), rendered as the real page
 * components over the office's recorded file. What this suite pins:
 *  · the answer at a glance leads each screen (owner / state / next step first);
 *  · every workflow's platform gap is named once, briefly;
 *  · gating is the property area's own (`property:read`, graceful forbidden state);
 *  · one h1 per route, a way back to the lot, the tab row with aria-current;
 *  · no prose walls — every paragraph stays a single short sentence.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
  usePathname: () => "/staff/property",
}));

const { default: OwnershipPage } = await import(
  "@/app/(staff)/staff/property/[id]/ownership/page"
);
const { default: TransfersPage } = await import(
  "@/app/(staff)/staff/property/[id]/transfers/page"
);
const { default: IntermentsPage } = await import(
  "@/app/(staff)/staff/property/[id]/interments/page"
);
const { default: ExhumationsPage } = await import(
  "@/app/(staff)/staff/property/[id]/exhumations/page"
);
const { default: LotDetailPage } = await import("@/app/(staff)/staff/property/[id]/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

const A001 = "00000000-0000-4000-8000-000000000D01"; // available, no records
const A002 = "00000000-0000-4000-8000-000000000D02"; // reserved for Marites Santos
const A003 = "00000000-0000-4000-8000-000000000D03"; // sold to Roberto Santos
const C001 = "00000000-0000-4000-8000-000000000D09"; // sold to Juan Dela Cruz
const C004 = "00000000-0000-4000-8000-000000000D0C"; // reserved for Ana Gonzales

function signInAs(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

function render(page: (props: { params: Promise<{ id: string }> }) => Promise<React.ReactNode>, id: string) {
  return page({ params: Promise.resolve({ id }) }).then((node) => renderToStaticMarkup(node));
}

/** Short paragraphs, no walls (the "answer at a glance" rule, staff-side). */
function expectNoProseWall(html: string, where: string) {
  const prose = measureProse(html);
  expect(prose.longest.words, `${where}: longest paragraph — “${prose.longest.text}”`).toBeLessThanOrEqual(30);
  expect(prose.listItems.longestWords, `${where}: longest list item`).toBeLessThanOrEqual(30);
  expect(prose.paragraphWords, `${where}: paragraph prose total`).toBeLessThanOrEqual(150);
  assertNoParagraphNesting(html, where);
}

beforeEach(() => {
  sessionHolder.current = null;
});

describe("the Ownership screen", () => {
  it("answers with the owner, the people and the papers in the first card", async () => {
    signInAs(["property:read"]);
    const html = await render(OwnershipPage, A003);

    expect(html).toContain("<h1>Ownership</h1>");
    // The owner as the lot record names them, and the buyer as the application does.
    expect(html).toContain("Roberto Santos");
    expect(html).toContain("Roberto D. Santos");
    expect(html).toContain("Sold · Apr 1, 2026");
    // Co-owners are not invented; the gap is stated.
    expect(html).toContain("None recorded — the platform holds one owner name per lot");
    // Authorised family comes from the application's own beneficiaries.
    expect(html).toContain("Luz Santos · Spouse · age 52");
    // The right of interment prints the client's own clause and its revision.
    expect(html).toContain("No interment shall be made unless the entire amount is fully paid.");
    expect(html).toContain("lot-purchase-2026");
    expect(html).toContain("Not included");
    // Papers: the recorded application + the repository's deed row.
    expect(html).toContain("Purchase application and agreement");
    expect(html).toContain("Lot Purchase Agreement");
    expect(html).toContain("DOC-2026-00006");
    // The one-line gap notice.
    expect(html).toContain("No ownership projection exists yet");
    // The right-of-interment card quotes the operative rule, not the whole clause.
    expect(html).not.toContain("exceptionally allowed");
  });

  it("leaves an ownerless lot ownerless and points at the reservation", async () => {
    signInAs(["property:read"]);
    const html = await render(OwnershipPage, A001);
    expect(html).toContain("No owner is recorded");
    expect(html).toContain("Not yet acquired");
    expect(html).toContain("No papers are recorded for this lot");
    expect(html).not.toContain("unavailable in live mode");
  });

  it("carries the tab row with aria-current and a way back to the lot", async () => {
    signInAs(["property:read"]);
    const html = await render(OwnershipPage, A003);
    expect(html).toContain('aria-label="Lot records"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(`href="/staff/property/${A003}/transfers"`);
    expect(html).toContain(`href="/staff/property/${A003}/interments"`);
    expect(html).toContain(`href="/staff/property/${A003}/exhumations"`);
    expect(html).toContain(`href="/staff/property/${A003}"`);
    expect(html).toContain("Back to lot");
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    expectNoProseWall(html, "ownership");
  });

  it("keeps the property area's gate, with the graceful forbidden state", async () => {
    signInAs(["cases:read"]);
    const html = await render(OwnershipPage, A003);
    expect(html).toContain("You don’t have access to this area");
    expect(html).toContain("property:read");
  });

  it("answers an unknown lot with the honest not-found state", async () => {
    signInAs(["property:read"]);
    const html = await render(OwnershipPage, "00000000-0000-4000-8000-00000000dead");
    expect(html).toContain("We couldn&#x27;t find that lot record.");
  });
});

describe("the Transfers screen", () => {
  it("answers with the request's state, the people and the next step", async () => {
    signInAs(["property:read"]);
    const html = await render(TransfersPage, A003);

    expect(html).toContain("<h1>Transfers</h1>");
    expect(html).toContain("The request in progress");
    expect(html).toContain("Verified");
    expect(html).toContain("Roberto Santos");
    expect(html).toContain("Luz Santos");
    expect(html).toContain("Spouse — named on the purchase application");
    expect(html).toContain("2 of 4 steps recorded.");
    // The next move is named, not left to the reader.
    expect(html).toContain("Next step");
    expect(html).toContain("Approved");
    expect(html).toContain("Waits on the office&#x27;s written consent");
    // The one-line gap notice names the deferred workflow and the status-only freeze.
    expect(html).toContain("No transfer workflow exists yet");
    expect(html).toContain("for_transfer as a status only");
  });

  it("records the request's history with dates, not a bare badge", async () => {
    signInAs(["property:read"]);
    const html = await render(TransfersPage, A003);

    // All four clerk words, in order, with the days the office wrote down.
    for (const word of ["Submitted", "Verified", "Approved", "Completed"]) {
      expect(html).toContain(word);
    }
    expect(html).toContain("Sep 2, 2026");
    expect(html).toContain("Sep 5, 2026");
    expect(html).toContain("No date recorded");
    // What verification still needs, and the office's own fee / requirement notes.
    expect(html).toContain("What verification still needs");
    expect(html).toContain("The office&#x27;s written consent (purchase agreement, transfer clause)");
    expect(html).toContain("The office’s fee / requirement notes");
    expect(html).toContain("The transfer fee follows the office&#x27;s schedule; no amount is recorded on this screen.");
  });

  it("shows a just-submitted request as submitted, with its missing papers", async () => {
    signInAs(["property:read"]);
    const html = await render(TransfersPage, A002);
    expect(html).toContain("Submitted");
    expect(html).toContain("Alyanna Santos");
    expect(html).toContain("A photocopy of Alyanna Santos&#x27;s ID");
    expect(html).toContain("Payment standing — the lot is reserved, not yet fully paid");
  });

  it("keeps the tab row, the way back and the reading budget", async () => {
    signInAs(["property:read"]);
    const html = await render(TransfersPage, A003);
    expect(html).toContain(`aria-current="page" href="/staff/property/${A003}/transfers"`);
    expect(html).toContain("Back to lot");
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    expectNoProseWall(html, "transfers");
  });

  it("is honest when no request has ever been made", async () => {
    signInAs(["property:read"]);
    const html = await render(TransfersPage, A001);
    expect(html).toContain("No transfer request is recorded for this lot");
    expect(html).toContain("written request from the present owner");
  });

  it("keeps the property area's gate", async () => {
    signInAs(["cases:read"]);
    const html = await render(TransfersPage, A003);
    expect(html).toContain("You don’t have access to this area");
    expect(html).toContain("property:read");
  });
});

describe("the Interments screen", () => {
  it("records who, when, the lot and the service for an opened ground", async () => {
    signInAs(["property:read", "cases:read", "documents:read"]);
    const html = await render(IntermentsPage, C001);

    expect(html).toContain("<h1>Interments</h1>");
    expect(html).toContain("Antonio Reyes");
    expect(html).toContain("Ground opened");
    expect(html).toContain("Aug 18, 2026");
    expect(html).toContain("C-001 · Section C");
    expect(html).toContain("CASE-2026-0003");
    expect(html).toContain("Interment Service");
    expect(html).toContain("Burial permit");
    expect(html).toContain("DOC-2026-00003");
    expect(html).toContain(`href="/staff/cases/00000000-0000-4000-8000-000000000C03"`);
    expect(html).toContain("Every check is recorded: 4 of 4");
    // The deferred workflow is named once.
    expect(html).toContain("Interment workflows are deferred in lot-events-v1");
  });

  it("runs the checks before the ground is opened, and stops when one fails", async () => {
    signInAs(["property:read", "cases:read", "documents:read"]);
    const html = await render(IntermentsPage, C004);

    expect(html).toContain("Rosario Gonzales");
    expect(html).toContain("Not opened");
    expect(html).toContain("reserved for Ana Gonzales, not sold");
    expect(html).toContain("Deceased identity");
    expect(html).toContain("Ownership");
    expect(html).toContain("Payment standing");
    expect(html).toContain("Permits");
    expect(html).toContain("Needs attention");
    expect(html).toContain("The ground stays closed: Ownership");
    expect(html).toContain("Interment authorization");
    expect(html).toContain("Open checks");
    expect(html).not.toContain("Every check is recorded");
  });

  it("reads across the lot's other records — the open transfer shows up in a check", async () => {
    signInAs(["property:read", "cases:read"]);
    const html = await render(IntermentsPage, A003);
    expect(html).toContain("Pedro Santos");
    expect(html).toContain("Not opened");
    expect(html).toContain("A transfer request to Luz Santos is being verified");
    expect(html).toContain("No day set — the checks below come first");
  });

  it("keeps the tab row, the way back and the reading budget", async () => {
    signInAs(["property:read", "cases:read", "documents:read"]);
    const html = await render(IntermentsPage, C001);
    expect(html).toContain(`aria-current="page" href="/staff/property/${C001}/interments"`);
    expect(html).toContain("Back to lot");
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    expectNoProseWall(html, "interments");
  });

  it("is honest when the ground has never been opened here", async () => {
    signInAs(["property:read"]);
    const html = await render(IntermentsPage, A001);
    expect(html).toContain("No interment is recorded for this lot");
  });

  it("keeps the property area's gate", async () => {
    signInAs(["cases:read"]);
    const html = await render(IntermentsPage, C001);
    expect(html).toContain("You don’t have access to this area");
    expect(html).toContain("property:read");
  });
});

describe("the Exhumations screen", () => {
  it("answers with the request, its state and the next requirement", async () => {
    signInAs(["property:read"]);
    const html = await render(ExhumationsPage, C001);

    expect(html).toContain("<h1>Exhumations</h1>");
    expect(html).toContain("The request — Antonio Reyes");
    expect(html).toContain("Requirements open");
    expect(html).toContain("1 of 6 steps recorded");
    expect(html).toContain("Danilo Reyes · Sep 5, 2026");
    expect(html).toContain("moved to a place nearer their home");
    expect(html).toContain("Loyola Gardens");
    expect(html).toContain("Next requirement");
    expect(html).toContain("The lot holder&#x27;s consent");
    expect(html).toContain("his written consent is not yet on file");
    // The gap is named once.
    expect(html).toContain("No exhumation workflow exists yet");
  });

  it("communicates gravity: the ground is not opened while a step is missing", async () => {
    signInAs(["property:read"]);
    const html = await render(ExhumationsPage, C001);

    expect(html).toContain("Nothing is moved while a requirement is open");
    expect(html).toContain("A missing step stops the work.");
    // Every requirement is listed, in order, with what it still needs.
    for (const requirement of [
      "The request and the reason",
      "The lot holder&#x27;s consent",
      "The permit to exhume",
      "The receiving place says yes",
      "The day and the team",
      "The record of the work",
    ]) {
      expect(html).toContain(requirement);
    }
    expect(html).toContain("Every requirement, in order");
    // The record of what was done is shown — and it says nothing has happened.
    expect(html).toContain("The record of what was done");
    expect(html).toContain("Nothing has been done — the grave has not been touched.");
    expect(html).toContain("Recorded only when the work is complete");
  });

  it("keeps the tab row, the way back and the reading budget", async () => {
    signInAs(["property:read"]);
    const html = await render(ExhumationsPage, C001);
    expect(html).toContain(`aria-current="page" href="/staff/property/${C001}/exhumations"`);
    expect(html).toContain("Back to lot");
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    expectNoProseWall(html, "exhumations");
  });

  it("says so when this lot has never seen an exhumation", async () => {
    signInAs(["property:read"]);
    const html = await render(ExhumationsPage, A001);
    expect(html).toContain("No exhumation has been recorded for this lot");
    expect(html).toContain("An exhumation is not a move");
    expect(html).toContain("Nothing is moved while a requirement is open");
  });

  it("keeps the property area's gate", async () => {
    signInAs(["cases:read"]);
    const html = await render(ExhumationsPage, C001);
    expect(html).toContain("You don’t have access to this area");
    expect(html).toContain("property:read");
  });
});

describe("the lot detail page's entry points", () => {
  it("lists all four lot records with their one-line states", async () => {
    signInAs(["property:read"]);
    const html = await render(LotDetailPage, A003);
    expect(html).toContain("Lot records");
    expect(html).toContain(`href="/staff/property/${A003}/ownership"`);
    expect(html).toContain(`href="/staff/property/${A003}/transfers"`);
    expect(html).toContain(`href="/staff/property/${A003}/interments"`);
    expect(html).toContain(`href="/staff/property/${A003}/exhumations"`);
    expect(html).toContain("1 request");
    expect(html).toContain("1 record");
    // The entry rows never claim a workflow ran.
    expect(html).toContain("lot-events-v1 defers those workflows");
  });

  it("says so honestly when a lot has no records yet", async () => {
    signInAs(["property:read"]);
    const html = await render(LotDetailPage, A001);
    expect(html).toContain("No owner recorded");
    expect(html).toContain("No request recorded");
    expect(html).toContain("No interment recorded");
  });

  it("links a reserved lot's application and the four record screens", async () => {
    signInAs(["property:read"]);
    const html = await render(LotDetailPage, A002);
    expect(html).toContain("Marites Santos");
    expect(html).toContain("1 request");
    expect(html).toContain("Submitted");
    expect(html).toContain(`href="/staff/property/${A002}/ownership"`);
  });

  it("keeps the lot detail page a single-h1 page", async () => {
    signInAs(["property:read"]);
    const html = await render(LotDetailPage, C001);
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
  });
});
