import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertNoParagraphNesting } from "../helpers/paragraph-nesting";

/**
 * The amortization view on the REAL family pages (captain, 2026-10-02): the
 * recorded plan schedule on Payments and the plan page, the recorded six-year
 * lot amortization on the lot page, the money-line link on the dashboard, and
 * the honest “not recorded” state when a record carries none.
 *
 * Only the router, the session guard and the link element are stubbed; the pages
 * themselves are the real server components reading the recorded fixtures.
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
  usePathname: () => "/client/payments",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "customer@vm.demo", scopes: [] }),
}));

type PageComponent = (props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) => Promise<React.ReactElement>;

const { default: PaymentsPage } = await import("@/app/(family)/client/payments/page");
const { default: PlanPage } = await import("@/app/(family)/client/plans/page");
const { default: LotPage } = await import("@/app/(family)/client/property/page");
const { default: HomePage } = await import("@/app/(family)/client/dashboard/page");
const { PlanAmortizationPanel, LotAmortizationPanel } = await import(
  "@/components/family/family-amortization"
);

async function render(page: PageComponent): Promise<string> {
  return renderToStaticMarkup(await page({}));
}

describe("the plan schedule on Payments and Your plan", () => {
  it.each([
    ["Payments", PaymentsPage],
    ["Your plan", PlanPage],
  ])("%s shows the recorded schedule at a glance", async (_name, Page) => {
    const html = await render(Page);
    expect(html).toContain("Your schedule");
    expect(html).toContain("Payment mode");
    expect(html).toContain("Monthly");
    expect(html).toContain("Term");
    expect(html).toContain("5 years");
    expect(html).toContain("Next payment");
    expect(html).toContain("₱12,000");
    expect(html).toContain("Remaining balance");
    expect(html).toContain("₱22,000");
    expect(html).toContain("Remaining periods");
    expect(html).toContain("Next due");
    expect(html).toContain("27 September 2026");
    // period · amount · status · remaining, one row per recorded period.
    expect(html).toContain("Period 1 of 4");
    expect(html).toContain("Period 4 of 4");
    expect(html).toContain('data-label="Remaining"');
    assertNoParagraphNesting(html, String(_name));
  });
});

describe("the lot's recorded six-year amortization", () => {
  it("shows the sheet's family, both printed columns and the term", async () => {
    const html = await render(LotPage);
    expect(html).toContain("This lot’s recorded schedule");
    expect(html).toContain("Prime Lots");
    expect(html).toContain("Regular monthly");
    expect(html).toContain("₱1,920");
    expect(html).toContain("Senior monthly");
    expect(html).toContain("₱1,688");
    expect(html).toContain("Selling price");
    expect(html).toContain("₱128,000");
    expect(html).toContain("6 years (72 months)");
    expect(html).toContain("PRICE LIST FOR 2026");
    assertNoParagraphNesting(html, "Your lot");
  });
});

describe("the dashboard money line", () => {
  it("links to the full schedule", async () => {
    const html = renderToStaticMarkup(
      await HomePage({ searchParams: Promise.resolve({ person: "ernesto-dela-cruz" }) }),
    );
    expect(html).toContain("See your full schedule →");
    expect(html).toContain('href="/client/payments#amortization"');
  });
});

describe("the honest missing-record state", () => {
  it("says a plan schedule is not recorded and reaches the office", () => {
    const html = renderToStaticMarkup(createElement(PlanAmortizationPanel, { plan: null }));
    expect(html).toContain("Your payment schedule isn’t recorded here yet.");
    expect(html).toContain('href="tel:+639176178489"');
    assertNoParagraphNesting(html, "missing plan schedule");
  });

  it("says a lot amortization is not recorded and reaches the office", () => {
    const html = renderToStaticMarkup(
      createElement(LotAmortizationPanel, { amortization: null }),
    );
    expect(html).toContain("The recorded lot amortization isn’t on this page yet.");
    expect(html).toContain('href="tel:+639176178489"');
    assertNoParagraphNesting(html, "missing lot amortization");
  });
});

// Test-only demo seed: the product fixtures start clean (captain, 2026-10-02).
// This suite exercises the recorded plan/lot records through a test-only copy, so
// the real pages keep their content-bearing contract tests without restoring demo
// data. The pages read the snapshot (plan schedule) and the workspace (lot record).
vi.mock("@/lib/fixtures/family/snapshot.json", async () => ({
  default: (await import("../fixtures/family-snapshot-demo.json")).default,
}));
vi.mock("@/lib/fixtures/family/workspace.json", async () => ({
  default: (await import("../fixtures/family-workspace-demo.json")).default,
}));
