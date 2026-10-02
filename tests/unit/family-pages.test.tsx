import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { assertNoParagraphNesting } from "../helpers/paragraph-nesting";

/**
 * The shared-house contract, pinned on the REAL family pages.
 *
 * Every family screen must render exactly one `<h1>` (the one fact) inside the
 * shared hero the agent portal uses, one primary action before the first
 * content section, the office number one tap away, and no old `fp-*`/family-only
 * presentation classes. The pages are the real server components; only the
 * router, the session guard and the link element are stubbed so they can render
 * outside a request.
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
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({
    email: "customer@vm.demo",
    scopes: [],
  }),
}));

type PageComponent = (props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) => Promise<React.ReactElement>;

const { default: HomePage } = await import("@/app/(family)/client/dashboard/page");
const { default: FuneralPage } = await import("@/app/(family)/client/cases/page");
const { default: PaymentsPage } = await import("@/app/(family)/client/payments/page");
const { default: PapersPage } = await import("@/app/(family)/client/documents/page");
const { default: RememberingPage } = await import("@/app/(family)/client/memorials/page");
const { default: HelpPage } = await import("@/app/(family)/client/support/page");
const { default: DetailsPage } = await import("@/app/(family)/client/profile/page");
const { default: PlanPage } = await import("@/app/(family)/client/plans/page");
const { default: LotPage } = await import("@/app/(family)/client/property/page");
const { default: VisitPage } = await import("@/app/(family)/client/appointments/page");
const { default: RequestsPage } = await import("@/app/(family)/client/requests/page");
const { default: NoticesPage } = await import("@/app/(family)/client/notifications/page");
const { default: PrivacyPage } = await import("@/app/(family)/client/privacy/page");
const { default: FamilyDashboardPage } = await import("@/app/(family)/client/family/page");

const PAGES: Array<{ name: string; Page: PageComponent; headline: string }> = [
  { name: "Home", Page: HomePage, headline: "look after" },
  { name: "The funeral", Page: FuneralPage, headline: "as our office recorded it" },
  { name: "Payments", Page: PaymentsPage, headline: "Here’s how to pay" },
  { name: "Papers", Page: PapersPage, headline: "papers are ready" },
  { name: "Remembering", Page: RememberingPage, headline: "You decide who is remembered." },
  { name: "Help", Page: HelpPage, headline: "Call us." },
  { name: "Your details", Page: DetailsPage, headline: "details are correct" },
  { name: "Your plan", Page: PlanPage, headline: "is active" },
  { name: "Your lot", Page: LotPage, headline: "is your family’s place at the park" },
  { name: "Ask for a visit", Page: VisitPage, headline: "we will set a day" },
  { name: "Requests", Page: RequestsPage, headline: "with us right now" },
  // The recorded plan has a due-soon instalment, so the page leads with its in-system
  // payment reminder; the honest empty state is pinned in family-calm-state instead.
  { name: "What we tell you about", Page: NoticesPage, headline: "payment reminder" },
  { name: "Privacy Center", Page: PrivacyPage, headline: "shared unless you say so" },
  { name: "Your family", Page: FamilyDashboardPage, headline: "everything your family holds" },
];

async function render(page: PageComponent): Promise<string> {
  return renderToStaticMarkup(await page({}));
}

describe.each(PAGES)("$name — understood at a glance", ({ name, Page, headline }) => {
  it("renders one dominant headline inside the shared hero", async () => {
    const html = await render(Page);
    const headings = html.match(/<h1[^>]*>(.*?)<\/h1>/g) ?? [];
    expect(headings, `${name} must have exactly one h1`).toHaveLength(1);
    expect(headings[0]).toContain(headline);
    expect(html, `${name} must use the shared hero`).toContain('class="ag-hero"');
  });

  it("puts one primary action before any supporting section", async () => {
    const html = await render(Page);
    const primary = html.indexOf('class="btn btn--primary');
    const firstSection = html.indexOf('class="ag-sec');
    expect(primary, `${name} needs a primary action`).toBeGreaterThan(-1);
    if (firstSection > -1) {
      expect(primary, `${name}'s action must lead, not trail`).toBeLessThan(firstSection);
    }
  });

  it("uses the shared portal grammar for its sections", async () => {
    const html = await render(Page);
    // Every page keeps the shared hero; a page with no supporting content ends
    // at the one shared gap disclosure instead of inventing a section.
    expect(html, `${name} must use the shared hero`).toContain('class="ag-hero"');
    expect(
      html.includes('class="ag-sec"') ||
        html.includes('class="dash-panel') ||
        html.includes('class="fv-gap"'),
      `${name} must use the shared section grammar or the shared gap disclosure`,
    ).toBe(true);
  });

  it("keeps the office number one tap away", async () => {
    const html = await render(Page);
    expect(html).toContain('href="tel:+639176178489"');
  });

  it("carries no old fp-* presentation class and no parallel family shell", async () => {
    const html = await render(Page);
    expect(html).not.toMatch(/class="[^"]*\bfp-/);
    expect(html).not.toContain("fv-topbar");
    expect(html).not.toContain("fv-answer");
  });

  // The captain's console error: the note rendered a `<p>` inside its own `<p>`,
  // so the browser split the tags and hydration regenerated the tree. Every page
  // here ends in a note; none of them may repeat that nesting.
  it("keeps every paragraph out of a paragraph (hydration safety)", async () => {
    const html = await render(Page);
    assertNoParagraphNesting(html, name);
  });
});

describe("the pages that end in a calm honesty note", () => {
  // Every page whose service (or part of it) is not switched on says so in one calm
  // note — the record-backed screens included, since each still waits on a contract.
  const PLANNED = PAGES.filter((page) =>
    [
      "The funeral",
      "Remembering",
      "Your lot",
      "Ask for a visit",
      "Requests",
      "What we tell you about",
      "Privacy Center",
    ].includes(page.name),
  );

  it.each(PLANNED)("$name says so in the one shared gap disclosure", async ({ Page }) => {
    const html = await render(Page);
    expect(html).toContain("What this page can’t show yet");
    expect(html).not.toContain("About this page");
    expect(html).not.toContain("alert");
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
