import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { measureProse } from "@/tests/helpers/prose";
import { CASE_STAGES } from "@/lib/operations/case-board";
import type { Session } from "@/lib/auth/types";

/**
 * The staff Operations board (`/staff/ops`), rendered as the real page over the recorded
 * operations fixture. What this pins:
 *  · the board is the page's answer — one lane per frozen stage (empty ones say so),
 *    the case cards with the recorded name/family/age, and the summary counts;
 *  · the urgent is the recorded rule: a guarantee paper past the contract's three-day
 *    term flags the card (CASE-2026-0001 carries an unfiled instrument and a contract
 *    date); the board never invents a stage-staleness threshold;
 *  · the case screen's two writes work here — a stage move and a task tick re-read the
 *    SAME durable store, so the card renders in its new lane / with its new count;
 *  · a read-only session sees the board and no controls, and a session without
 *    `cases:read` gets the graceful forbidden state;
 *  · an empty board says so plainly;
 *  · the page stays inside the reading budget (short paragraphs only).
 *
 * "Today" is pinned (2026-09-18) so the three-day filing clock reads the same on every
 * machine; the write tests point OPERATIONS_STORE_PATH at a throwaway file.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
  usePathname: () => "/staff/ops",
}));

vi.mock("@/lib/schedule-board", () => ({ parkToday: () => "2026-09-18" }));

const casesHolder = vi.hoisted(() => ({ current: null as unknown[] | null }));
vi.mock("@/lib/api-client/operations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client/operations")>();
  return {
    ...actual,
    listCases: async () =>
      casesHolder.current === null ? actual.listCases() : (casesHolder.current as never),
  };
});

const { default: OpsPage } = await import("@/app/(staff)/staff/ops/page");
const { getCase, setCaseStage, setCaseTaskStatus } = await import(
  "@/lib/api-client/operations"
);

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const INQUIRY_CASE_ID = "00000000-0000-4000-8000-000000000C06";
const INQUIRY_CASE_NUMBER = "CASE-2026-0006";

let dir: string;

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

async function render(): Promise<string> {
  return renderToStaticMarkup(await OpsPage());
}

/** The markup of ONE lane, so a card's lane membership can be asserted. */
function lane(html: string, stage: string): string {
  const start = html.indexOf(`data-stage="${stage}"`);
  expect(start, `lane ${stage} is rendered`).toBeGreaterThan(-1);
  const next = CASE_STAGES.map((s) => html.indexOf(`data-stage="${s}"`, start + 1)).filter(
    (index) => index > start,
  );
  const end = next.length > 0 ? Math.min(...next) : html.length;
  return html.slice(start, end);
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-ops-board-page-"));
  process.env.OPERATIONS_STORE_PATH = path.join(dir, "cases.json");
  casesHolder.current = null;
  delete cookieJar.values.im_at;
  delete cookieJar.values.im_u;
  sessionHolder.current = null;
});

afterEach(async () => {
  delete process.env.OPERATIONS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("the board is the page's answer", () => {
  it("renders one lane per frozen stage, with the recorded cases", async () => {
    signInAs(["cases:read", "cases:write"]);
    const html = await render();

    // One h1 (the page header), then a lane heading per stage.
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    for (const stage of CASE_STAGES) {
      expect(lane(html, stage), `stage ${stage} has a lane`).toContain(">");
    }
    expect(lane(html, "inquiry")).toContain("CASE-2026-0006");
    expect(lane(html, "inquiry")).toContain("Isabel Torres");
    expect(lane(html, "preparation")).toContain("CASE-2026-0004");
    expect(lane(html, "completed")).toContain("CASE-2026-0003");
    // The fixture records no interment case: the lane is present and says so.
    expect(lane(html, "interment")).toContain("No cases");
  });

  it("summarises the board in counts and labels", async () => {
    signInAs(["cases:read"]);
    const html = await render();

    expect(html).toContain("In service");
    expect(html).toContain("Papers overdue");
    expect(html).toContain("Awaiting intake");
    expect(html).toContain("Longest wait");
    // The recorded fixture: 6 in service, 1 completed, 1 overdue paper (0001's
    // unfiled LGU instrument, contract date 2026-08-28, three-day term).
    expect(html).toContain("1 guarantee paper overdue");
    expect(html).toContain("22 days");
  });

  it("states its basis instead of inventing a staleness threshold", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).toContain("no stage-staleness threshold is agreed");
    expect(html).toContain("Age — days since each case");
    expect(html).not.toContain("overdue stage");
  });

  it("keeps the page inside the reading budget", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    const stats = measureProse(html);
    expect(
      stats.longest.words,
      `longest paragraph is ${stats.longest.words} words: ${stats.longest.text}`,
    ).toBeLessThanOrEqual(30);
    expect(stats.paragraphWords).toBeLessThanOrEqual(140);
  });

  it("links to the case list and the schedule, and every card to its case", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).toContain('href="/staff/cases"');
    expect(html).toContain('href="/staff/schedule"');
    expect(html).toContain(`href="/staff/cases/${INQUIRY_CASE_ID}"`);
  });
});

describe("the board moves the work through the case screen's own writes", () => {
  it("renders the card in its new lane after a stage move", async () => {
    signInAs(["cases:read", "cases:write"]);
    expect(lane(await render(), "inquiry")).toContain("CASE-2026-0006");

    const moved = await setCaseStage(INQUIRY_CASE_NUMBER, "preparation");
    expect(moved.stage).toBe("preparation");

    const html = await render();
    expect(lane(html, "preparation")).toContain("CASE-2026-0006");
    expect(lane(html, "inquiry")).not.toContain("CASE-2026-0006");
    // The stage's task template was appended by the same write the case screen uses.
    expect(lane(html, "preparation")).toContain("Confirm embalming completion");
  });

  it("shows a ticked task's new count after a task write", async () => {
    signInAs(["cases:read", "cases:write"]);
    const kase = await getCase(INQUIRY_CASE_ID);
    expect(lane(await render(), "inquiry")).toContain("0/2 tasks done");

    await setCaseTaskStatus(kase.case_number, kase.tasks[0].id, "done");

    expect(lane(await render(), "inquiry")).toContain("1/2 tasks done");
  });

  it("offers the write controls to a writer and explains their absence otherwise", async () => {
    signInAs(["cases:read", "cases:write"]);
    const writerHtml = await render();
    expect(writerHtml).toContain('aria-label="Move CASE-2026-0006 to another stage"');
    expect(writerHtml).toContain('aria-label="Mark Initial family consultation done"');
    // The confirmation is the deliberate second step — never open on load.
    expect(writerHtml).not.toContain('role="dialog"');

    signInAs(["cases:read"]);
    const readerHtml = await render();
    expect(readerHtml).not.toContain("<select");
    expect(readerHtml).not.toContain("Mark Initial family consultation done");
    expect(readerHtml).toContain("Ticking a task or moving a case needs <code>cases:write</code>");
    // The work is still visible read-only.
    expect(lane(readerHtml, "inquiry")).toContain("CASE-2026-0006");
  });

  it("renders the graceful forbidden state without cases:read", async () => {
    signInAs(["orders:read"]);
    const html = await render();
    expect(html).toContain("permissions this screen needs");
    expect(html).not.toContain('data-stage="inquiry"');
  });
});

describe("the empty board is honest", () => {
  it("says so plainly when no case is recorded", async () => {
    signInAs(["cases:read", "cases:write"]);
    casesHolder.current = [];
    const html = await render();

    expect(html).toContain("No cases on the board");
    expect(html).toContain("Cases appear here as the office records them.");
    expect(html).not.toContain("data-stage=");
    expect(html).not.toContain("<select");
  });

  it("keeps every lane when the board has cases, empty ones included", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    for (const stage of CASE_STAGES) {
      expect(lane(html, stage).length, `lane ${stage}`).toBeGreaterThan(0);
    }
  });
});
