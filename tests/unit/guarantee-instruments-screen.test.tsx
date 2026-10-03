import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/operations/guarantee-instruments.json", async () => ({
  default: (await import("../fixtures/operations-guarantee-demo.json")).default,
}));
vi.mock("@/lib/fixtures/operations/cases.json", async () => ({
  default: (await import("../fixtures/operations-cases-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * The guarantee-instrument tracker's screens (F-18 / FORMS_PLAN gap 5).
 *
 *  - the case page carries the COMPACT card (state + overdue at a glance, a link through)
 *    without disturbing the case's own sections;
 *  - the tracker route is one h1, renders the derived three-day deadline, the office's
 *    states, the recorded amounts (an em dash when the contract left one blank) and the
 *    supporting-document checklist;
 *  - an empty case gets the honest empty state, never blank pieces;
 *  - `cases:read` gates both, and nothing here writes.
 *
 * The clock is pinned per test — the screens read `businessToday()`, and the fixtures are
 * fixed calendar dates, so the suite must not drift with the wall clock.
 */

const clock = vi.hoisted(() => ({ today: "2026-09-18" }));

vi.mock("@/lib/contracts/payment-capture", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/contracts/payment-capture")>();
  return { ...actual, businessToday: () => clock.today };
});

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
}));

const { default: CaseDetailPage } = await import("@/app/(staff)/staff/cases/[id]/page");
const { default: InstrumentsPage } = await import(
  "@/app/(staff)/staff/cases/[id]/instruments/page"
);
const { GuaranteeInstrumentsCard, GuaranteeInstrumentsTracker } = await import(
  "@/components/guarantee-instruments"
);
const { formatMinorUnits } = await import("@/lib/money");

/** CASE-2026-0001 — the rich recording: one overdue LGU claim against a 2026-08-28 contract. */
const OVERDUE_CASE_ID = "00000000-0000-4000-8000-000000000C01";
/** CASE-2026-0002 — no tracker record at all: the empty case. */
const EMPTY_CASE_ID = "00000000-0000-4000-8000-000000000C02";

function setSession(scopes: string[]) {
  sessionHolder.current = {
    userId: "00000000-0000-4000-8000-000000000012",
    tenantId: "00000000-0000-4000-8000-000000000001",
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

beforeEach(() => {
  clock.today = "2026-09-18";
  setSession(["cases:read"]);
});

afterEach(() => {
  sessionHolder.current = null;
});

describe("the case page's compact card", () => {
  it("answers at a glance: the states, the overdue flag and the way through", async () => {
    const html = renderToStaticMarkup(
      await CaseDetailPage({ params: Promise.resolve({ id: OVERDUE_CASE_ID }) }),
    );
    expect(html).toContain("Guarantee instruments");
    expect(html).toContain("1 overdue");
    expect(html).toContain("LGU guarantee — coffin");
    expect(html).toContain("Not yet filed");
    expect(html).toContain("Overdue");
    expect(html).toContain("Awaiting agency");
    expect(html).toContain("Confirmed");
    expect(html).toContain("Passed 18 days ago");
    expect(html).toContain(`/staff/cases/${OVERDUE_CASE_ID}/instruments`);
    // The one honesty line, once: there is no sub-ledger behind the tracker.
    expect(html).toContain("stay with finance");
    expect(html).toContain("sub-ledger");
    // …and the case's own information is still there — the card does not displace it.
    expect(html).toContain("Case details");
    expect(html).toContain("Intake");
    expect(html).toContain("Service contract (paper form)");
  });

  it("renders the honest empty state for a case with no recorded instruments", async () => {
    const html = renderToStaticMarkup(
      await CaseDetailPage({ params: Promise.resolve({ id: EMPTY_CASE_ID }) }),
    );
    expect(html).toContain("No guarantee instruments are recorded for CASE-2026-0002");
    expect(html).toContain(`/staff/cases/${EMPTY_CASE_ID}/service-contract`);
    expect(html).not.toContain("Overdue");
  });
});

describe("the tracker route", () => {
  it("renders one h1, the derived deadline and every recorded instrument", async () => {
    const html = renderToStaticMarkup(
      await InstrumentsPage({ params: Promise.resolve({ id: OVERDUE_CASE_ID }) }),
    );
    // One h1 on the route (the paper-hero's title), never a second one.
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(html).toContain("Guarantee instruments");
    // The deadline is DERIVED from the recorded contract date (2026-08-28 + 3 days).
    expect(html).toContain("Aug 31, 2026");
    expect(html).toContain("File by Aug 31, 2026");
    expect(html).toContain("Passed 18 days ago");
    expect(html).toContain("Overdue");
    // Which instrument, who from, and the amount exactly as recorded.
    expect(html).toContain("Claimed from");
    expect(html).toContain("Isabela City LGU — local burial assistance");
    expect(html).toContain(formatMinorUnits(2_500_000));
    // A blank amount stays blank — an em dash, never a zero or a guess.
    expect(html).toContain("— not on the recorded contract");
    // Recorded steps and the contract's own reference blank.
    expect(html).toContain("Filed Aug 29, 2026");
    expect(html).toContain("Agency response Sep 5, 2026");
    expect(html).toContain("34-5678901-2");
    // What it waits on: the checklist, each paper's own state, and what is still needed.
    expect(html).toContain("Barangay certificate of indigency");
    expect(html).toContain("Still needed");
    expect(html).toContain("Still needed: Barangay certificate of indigency");
    expect(html).toContain("Nothing outstanding.");
    // The one honesty line.
    expect(html).toContain("Tracking the paperwork only");
    expect(html).toContain("sub-ledger");
  });

  it("reads an imminent deadline as imminent, not overdue", async () => {
    clock.today = "2026-08-30";
    const html = renderToStaticMarkup(
      await InstrumentsPage({ params: Promise.resolve({ id: OVERDUE_CASE_ID }) }),
    );
    expect(html).toContain("1 day left");
    expect(html).not.toContain("Overdue");
    expect(html).not.toContain("1 overdue");
  });

  it("renders the empty state for a case with nothing recorded", async () => {
    const html = renderToStaticMarkup(
      await InstrumentsPage({ params: Promise.resolve({ id: EMPTY_CASE_ID }) }),
    );
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    expect(html).toContain("No guarantee instruments are recorded for CASE-2026-0002");
    expect(html).not.toContain("Instruments on the contract");
  });
});

describe("the tracker's honest non-record states", () => {
  it("says live tracking is not wired instead of showing demo rows", () => {
    const card = renderToStaticMarkup(
      <GuaranteeInstrumentsCard
        caseId="case-1"
        caseNumber="CASE-2026-0001"
        contractDate="2026-08-28"
        today="2026-09-18"
        read={{ state: "not_wired" }}
      />,
    );
    expect(card).toContain("live guarantee-instrument tracking is not wired");
    expect(card).not.toContain("LGU guarantee — coffin");

    const tracker = renderToStaticMarkup(
      <GuaranteeInstrumentsTracker
        caseId="case-1"
        caseNumber="CASE-2026-0001"
        deceasedName="Pedro Santos"
        contractDate="2026-08-28"
        today="2026-09-18"
        read={{ state: "not_wired" }}
      />,
    );
    expect(tracker).toContain("Live tracking is not wired yet");
    expect(tracker).toContain(
      "live guarantee-instrument tracking is not wired: no contract names a guarantee-instrument record",
    );
    expect(tracker).not.toContain("Instruments on the contract");
  });

  it("keeps an unreadable record a calm state, not a crash", () => {
    const tracker = renderToStaticMarkup(
      <GuaranteeInstrumentsTracker
        caseId="case-1"
        caseNumber="CASE-2026-0001"
        deceasedName="Pedro Santos"
        contractDate={null}
        today="2026-09-18"
        read={{ state: "unavailable" }}
      />,
    );
    expect(tracker).toContain("The instrument record could not be read");
    expect(tracker).not.toContain("Instruments on the contract");
  });
});

describe("the tracker is gated on cases:read", () => {
  it("renders the graceful forbidden state on both screens without the scope", async () => {
    setSession(["orders:read"]);
    const card = renderToStaticMarkup(
      await CaseDetailPage({ params: Promise.resolve({ id: OVERDUE_CASE_ID }) }),
    );
    expect(card).toContain("permissions this screen needs");
    expect(card).not.toContain("LGU guarantee — coffin");

    const tracker = renderToStaticMarkup(
      await InstrumentsPage({ params: Promise.resolve({ id: OVERDUE_CASE_ID }) }),
    );
    expect(tracker).toContain("permissions this screen needs");
    expect(tracker).not.toContain("Instruments on the contract");
  });

  it("does not offer any write control — the tracker only reads", async () => {
    const html = renderToStaticMarkup(
      await InstrumentsPage({ params: Promise.resolve({ id: OVERDUE_CASE_ID }) }),
    );
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("Save");
  });
});
