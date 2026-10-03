import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { COPILOT_GOVERNANCE, COPILOT_NOT_CONNECTED, COPILOT_OWNER } from "@/lib/copilot";
import { decodeEntities } from "@/tests/helpers/prose";
import type { Session } from "@/lib/auth/types";
import type { Booking } from "@/lib/api-client/scheduling";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/operations/cases.json", async () => ({
  default: (await import("../fixtures/operations-cases-demo.json")).default,
}));
vi.mock("@/lib/fixtures/operations/guarantee-instruments.json", async () => ({
  default: (await import("../fixtures/operations-guarantee-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The AI Copilot screen (`/staff/copilot`), rendered as the real page over the recorded
 * fixtures. What this pins:
 *
 *  · the surface the captain asked for is really there: the four questions, a
 *    data-backed answer with its record trail, and the governance boundary as a block a
 *    reader meets before any answer — never a footnote;
 *  · the honest state is on every rendering: no model connected, nothing generated;
 *  · SAFETY BY CONSTRUCTION, checked on the markup rather than promised in a comment:
 *    no free-text control anywhere, the one form is a GET back to this same route, no
 *    output carries an amount, and the page offers the reader no way to send anything;
 *  · permission-awareness: no `cases:read` is the graceful forbidden state; a reader
 *    without `scheduling:read` gets the calendar named as missing, and a reader with it
 *    gets the recorded day — the three states are never blurred;
 *  · house rules: one h1, no skipped heading level, every action reachable by keyboard
 *    (links and a native form), tokens/classes only.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
  usePathname: () => "/staff/copilot",
}));

// The park's day is pinned so every age in the answer reads the same on every machine.
vi.mock("@/lib/schedule-board", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/schedule-board")>();
  return { ...actual, parkToday: () => "2026-09-19" };
});

const bookingsHolder = vi.hoisted(() => ({ current: null as Booking[] | null }));
vi.mock("@/lib/api-client/scheduling", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client/scheduling")>();
  return {
    ...actual,
    listBookings: async () =>
      bookingsHolder.current === null ? actual.listBookings() : bookingsHolder.current,
  };
});

const { default: CopilotPage } = await import("@/app/(staff)/staff/copilot/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ONE_ID = "00000000-0000-4000-8000-000000000C01";
const CASE_ONE_NUMBER = "CASE-2026-0001";

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

async function render(
  searchParams: { ask?: string; case?: string } = {},
): Promise<string> {
  return renderToStaticMarkup(await CopilotPage({ searchParams: Promise.resolve(searchParams) }));
}

beforeEach(() => {
  sessionHolder.current = null;
  bookingsHolder.current = null;
});

describe("the surface the PRD names, built honestly", () => {
  it("leads with one h1 and never skips a heading level", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i] - levels[i - 1], `heading ${levels[i]} follows ${levels[i - 1]}`).toBeLessThanOrEqual(1);
    }
  });

  it("shows the four questions this office actually asks", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    for (const question of [
      "What needs doing today?",
      "What is waiting on a family?",
      "Which cases have not moved?",
      "What is this case&#x27;s next step?",
    ]) {
      expect(html, `missing prompt: ${question}`).toContain(question);
    }
    expect(html).toContain('href="/staff/copilot?ask=waiting"');
    expect(html).toContain('aria-current="true"');
  });

  it("answers the default question from the recorded cases, with their records", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).toContain("6 cases have recorded work open today.");
    expect(html).toContain("2 of 4 recorded tasks open");
    expect(html).toContain("1 guarantee paper past the contract&#x27;s 3-day term");
    // The trail is a real staff route, not a dead end.
    expect(html).toContain(`href="/staff/cases/${CASE_ONE_ID}"`);
    expect(html).toContain(`href="/staff/cases/${CASE_ONE_ID}/instruments"`);
    // The urgent row leads: the one case whose recorded paper is past the contract term.
    expect(html.indexOf("guarantee paper past the contract")).toBeLessThan(
      html.indexOf("2 of 4 recorded tasks open"),
    );
  });

  it("answers a chosen question and keeps the other answers off the page", async () => {
    signInAs(["cases:read"]);
    const html = await render({ ask: "not-moved" });
    expect(html).toContain("6 cases have not moved — the longest wait is 23 days.");
    expect(html).toContain("No recorded change for 23 days");
    expect(html).not.toContain("recorded tasks open");
  });

  it("puts the governance boundary on the screen, above the answers", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    // Compare on decoded text so React's entity escaping (apostrophes) cannot mask a
    // missing line.
    const text = decodeEntities(html);
    expect(text).toContain("The governance boundary");
    for (const point of COPILOT_GOVERNANCE) {
      expect(text, `governance point ${point.key} is missing`).toContain(point.title);
      expect(text, `governance detail ${point.key} is missing`).toContain(point.detail);
    }
    expect(text).toContain(COPILOT_OWNER[0]);
    expect(text).toContain(COPILOT_OWNER[1]);
    // "part of the deliverable, not a footnote": it is rendered BEFORE the first answer.
    expect(html.indexOf("The governance boundary")).toBeLessThan(
      html.indexOf("6 cases have recorded work open today."),
    );
  });

  it("states the disconnected reality on every rendering", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).toContain(COPILOT_NOT_CONNECTED);
    expect(html).toContain("No model is connected to this screen.");
    expect(html).toContain("No text here was generated.");
  });
});

describe("safety by construction, checked on the markup", () => {
  it("offers no free-text control and nothing that sends data away", async () => {
    signInAs(["cases:read"]);
    for (const params of [{}, { ask: "next-step" }, { ask: "waiting" }]) {
      const html = await render(params);
      expect(html, JSON.stringify(params)).not.toMatch(/<textarea/i);
      expect(html, JSON.stringify(params)).not.toMatch(/<input[^>]*type="text"/i);
      expect(html, JSON.stringify(params)).not.toMatch(/<input[^>]*type="search"/i);
      expect(html, JSON.stringify(params)).not.toMatch(/<input[^>]*type="email"/i);
      // The only form is a GET back to this screen — no POST, no external action.
      const forms = [...html.matchAll(/<form[^>]*>/g)].map((m) => m[0]);
      for (const form of forms) {
        expect(form).toContain('method="get"');
        expect(form).toContain('action="/staff/copilot"');
      }
      // The only inputs are the hidden prompt the picker carries.
      for (const input of [...html.matchAll(/<input[^>]*>/g)].map((m) => m[0])) {
        expect(input).toContain('type="hidden"');
      }
    }
  });

  it("lets a case be chosen from the records never typed", async () => {
    signInAs(["cases:read"]);
    const html = await render({ ask: "next-step" });
    expect(html).toContain('<select');
    expect(html).toContain(`value="${CASE_ONE_ID}"`);
    expect(html).toContain(`${CASE_ONE_NUMBER} · Pedro Santos`);
    expect(html).toContain("Pick a case to read its recorded next step.");
  });

  it("reads one case's next step once the choice is made", async () => {
    signInAs(["cases:read"]);
    const html = await render({ ask: "next-step", case: CASE_ONE_NUMBER });
    expect(html).toContain("Next recorded task: Coordinate family arrival.");
    expect(html).toContain("Coordinator: Elena Villanueva");
    expect(html).toContain("Viewing · Waiting 23d");
  });

  it("never prints an amount a record did not carry", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).not.toContain("₱");
  });

  it("tells 'not read' apart from 'nothing on today'", async () => {
    signInAs(["cases:read"]);
    const withoutSchedule = await render();
    expect(withoutSchedule).toContain(
      "The chapel calendar is not read without the scheduling:read scope.",
    );

    signInAs(["cases:read", "scheduling:read"]);
    const withSchedule = await render();
    expect(withSchedule).not.toContain(
      "The chapel calendar is not read without the scheduling:read scope.",
    );
    expect(withSchedule).toContain("The chapel calendar records nothing for today.");
  });

  it("shows the recorded day's bookings when the calendar is readable", async () => {
    signInAs(["cases:read", "scheduling:read"]);
    bookingsHolder.current = [
      {
        id: "b1",
        resource_id: "r1",
        resource_name: "Chapel A",
        case_number: CASE_ONE_NUMBER,
        title: "Wake — Day 3",
        starts_at: "2026-09-19T09:00:00Z",
        ends_at: "2026-09-19T17:00:00Z",
        status: "confirmed",
        conflicting: false,
      },
    ];
    const html = await render();
    expect(html).toContain("Chapel A");
    expect(html).toContain("Wake — Day 3");
    expect(html).not.toContain("The chapel calendar records nothing for today.");
  });
});

describe("permissions", () => {
  it("shows the graceful forbidden state without cases:read", async () => {
    signInAs(["catalog:read"]);
    const html = await render();
    expect(html).toContain("You don");
    expect(html).toContain("cases:read");
    expect(html).not.toContain("The governance boundary");
  });

  it("gates on cases:read exactly, with no scope the vocabulary does not name", async () => {
    signInAs(["cases:read"]);
    const html = await render();
    expect(html).not.toContain("You don");
    expect(html).toContain("The governance boundary");
  });
});
