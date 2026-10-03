import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/operations/cases.json", async () => ({
  default: (await import("../fixtures/operations-cases-demo.json")).default,
}));
vi.mock("@/lib/fixtures/operations/preparation-records.json", async () => ({
  default: (await import("../fixtures/operations-preparation-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The preparation record screen (`/staff/cases/[id]/preparation`), rendered over the
 * recorded fixture. What this pins:
 *  · the first screenful answers state + who + when before any table;
 *  · the four steps appear in the order the work happens, each with its own state;
 *  · a case with no record gets one honest line and the case's own task lines —
 *    never an invented embalmer, time or checklist value;
 *  · a case whose intake is missing says so instead of inventing an identity;
 *  · the case number, its stage and the way back to the case are always present;
 *  · the gate is `cases:read` (a session without it sees the designed forbidden state);
 *  · one h1.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const { default: PreparationPage } = await import(
  "@/app/(staff)/staff/cases/[id]/preparation/page"
);
const { default: CaseDetailPage } = await import("@/app/(staff)/staff/cases/[id]/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const CASE_1 = "00000000-0000-4000-8000-000000000C01"; // Pedro Santos, completed record
const CASE_2 = "00000000-0000-4000-8000-000000000C02"; // Lourdes Cruz, no record
const CASE_4 = "00000000-0000-4000-8000-000000000C04"; // Rosario Gonzales, in progress
const CASE_5 = "00000000-0000-4000-8000-000000000C05"; // Fernando Aquino, record, no intake

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

async function render(id: string): Promise<string> {
  return renderToStaticMarkup(await PreparationPage({ params: Promise.resolve({ id }) }));
}

/** The markup a reader sees before the steps table starts. */
function firstScreen(html: string): string {
  return html.slice(0, html.indexOf("<h3>Preparation record</h3>"));
}

beforeEach(() => {
  sessionHolder.current = null;
});

describe("the preparation record leads with who, when and where it stands", () => {
  it("answers state, embalmer, assistant and time in the first screenful", async () => {
    signInAs(["cases:read"]);
    const html = await render(CASE_1);
    const first = firstScreen(html);

    expect(first).toContain("CASE-2026-0001");
    expect(first).toContain("Pedro Santos");
    expect(first).toContain("Completed");
    expect(first).toContain("Ricardo Bautista");
    expect(first).toContain("Miguel Torres");
    expect(first).toContain("27 Aug 2026 · 8:40 PM – 9:30 PM");
    // The steps table comes after the summary, never instead of it.
    expect(html.indexOf("case-summary")).toBeLessThan(
      html.indexOf("<h3>Preparation record</h3>"),
    );
  });

  it("keeps the case number, stage and the way back to the case on the page", async () => {
    signInAs(["cases:read"]);
    const html = await render(CASE_1);

    expect(html).toContain(`/staff/cases/${CASE_1}`);
    expect(html).toContain("Viewing");
    expect(html).toContain("Back to case");
  });

  it("shows the four steps in work order, each with its own state and time", async () => {
    signInAs(["cases:read"]);
    const html = await render(CASE_1);

    const order = ["<strong>Embalming</strong>", "<strong>Dressing</strong>", "<strong>Cosmetics</strong>", "<strong>Casketing</strong>"];
    const positions = order.map((label) => html.indexOf(label));
    expect(positions.every((position) => position > -1)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));

    expect(html).toContain("27 Aug 2026 · 8:55 PM");
    expect(html).toContain("27 Aug 2026 · 9:10 PM");
    expect(html).toContain("27 Aug 2026 · 9:20 PM");
    expect(html).toContain("27 Aug 2026 · 9:30 PM");
    expect(html).toContain("barong"); // the record's own note
  });

  it("marks an unfinished record honestly: started, in progress, later steps scheduled", async () => {
    signInAs(["cases:read"]);
    const html = await render(CASE_4);

    expect(html).toContain("Started 27 Aug 2026 · 4:15 PM");
    expect(html).toContain("In progress");
    expect(html).toContain("Scheduled");
    expect(html).toContain("Rosario Gonzales");
    // No completion time is claimed for work that is not finished.
    expect(html).not.toContain("9:30 PM");
  });

  it("renders exactly one h1", async () => {
    signInAs(["cases:read"]);
    const html = await render(CASE_1);
    expect([...html.matchAll(/<h1/g)].length).toBe(1);
  });
});

describe("a case without a record gets honest states, not invented ones", () => {
  it("says the record does not exist and shows what the office records today", async () => {
    signInAs(["cases:read"]);
    const html = await render(CASE_2);

    expect(html).toContain("No preparation record is on file for this case.");
    expect(html).toContain("No record");
    expect(html).toContain("What the case records today");
    expect(html).toContain("Prepare preparation room");
    expect(html).toContain("Lourdes Cruz");
    // No invented embalmer, assistant or work time on a case with no record.
    expect(html).not.toContain("Ricardo Bautista");
    expect(html).not.toContain("Miguel Torres");
  });

  it("says when the case has no intake instead of inventing an identity", async () => {
    signInAs(["cases:read"]);
    const html = await render(CASE_5);

    expect(html).toContain("Fernando Aquino");
    expect(html).toContain("The case records no intake yet");
    expect(html).toContain("the case records no place of death");
  });

  it("copies the case's own intake facts for a case that has them", async () => {
    signInAs(["cases:read"]);
    const html = await render(CASE_1);

    expect(html).toContain("Date of death");
    expect(html).toContain("27 Aug 2026");
    expect(html).toContain("11 Mar 1948");
    expect(html).toContain("male");
    expect(html).toContain("married");
  });
});

describe("the screen is gated and read-only", () => {
  it("renders the designed forbidden state without cases:read", async () => {
    signInAs(["orders:read"]);
    const html = await render(CASE_1);

    expect(html).toContain("You don");
    expect(html).toContain("cases:read");
    expect(html).not.toContain("Ricardo Bautista");
    expect(html).not.toContain("case-summary");
  });

  it("says plainly that nothing on the screen can be changed", async () => {
    signInAs(["cases:read"]);
    const html = await render(CASE_1);
    expect(html).toContain("Read-only record");
    expect(html).toContain("no service carries preparation writes yet");
  });

  it("answers a missing case with the case-not-found state", async () => {
    signInAs(["cases:read"]);
    const html = await render("00000000-0000-4000-8000-00000000dead");

    expect(html).toContain("Preparation record");
    expect(html).toContain("We couldn");
  });
});

describe("the case screen links to the preparation record", () => {
  it("carries the entry card and the route to the record", async () => {
    signInAs(["cases:read"]);
    const html = renderToStaticMarkup(
      await CaseDetailPage({ params: Promise.resolve({ id: CASE_1 }) }),
    );

    expect(html).toContain("Embalming &amp; preparation");
    expect(html).toContain("Open the preparation record");
    expect(html).toContain(`href="/staff/cases/${CASE_1}/preparation"`);
  });
});
