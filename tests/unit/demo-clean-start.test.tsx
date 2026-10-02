import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * The clean start (captain, 2026-10-02), pinned on the REAL pages.
 *
 * The agent and family demo records are removed, so every screen whose subject is
 * one of them must render its honest empty state and the ONE action that starts
 * the workflow — never a blank panel, a crash or a fabricated row. This suite
 * deliberately does NOT mock the data clients: it renders the shipped clean
 * fixtures.
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
  usePathname: () => "/",
  useRouter: () => ({ replace: () => {}, push: () => {}, refresh: () => {} }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "demo@vm.demo", scopes: [] }),
}));

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type PageComponent = (props: PageProps) => Promise<React.ReactElement>;

const { default: AgentDashboardPage } = await import("@/app/(agent)/agent/dashboard/page");
const { default: AgentProspectsPage } = await import("@/app/(agent)/agent/prospects/page");
const { default: AgentClientsPage } = await import("@/app/(agent)/agent/clients/page");

const { default: FamilyDashboardPage } = await import("@/app/(family)/client/dashboard/page");
const { default: FamilyPlansPage } = await import("@/app/(family)/client/plans/page");
const { default: FamilyPaymentsPage } = await import("@/app/(family)/client/payments/page");
const { default: FamilyDocumentsPage } = await import("@/app/(family)/client/documents/page");
const { default: FamilyMemorialsPage } = await import("@/app/(family)/client/memorials/page");
const { default: FamilyRequestsPage } = await import("@/app/(family)/client/requests/page");
const { default: FamilyAppointmentsPage } = await import(
  "@/app/(family)/client/appointments/page"
);
const { default: FamilyCasesPage } = await import("@/app/(family)/client/cases/page");
const { default: FamilyPropertyPage } = await import("@/app/(family)/client/property/page");
const { default: FamilyNotificationsPage } = await import(
  "@/app/(family)/client/notifications/page"
);

async function render(page: PageComponent, props: Partial<PageProps> = {}): Promise<string> {
  return renderToStaticMarkup(await page({ ...props, searchParams: Promise.resolve({}) }));
}

describe("the agent portal starts clean", () => {
  it("the dashboard says nothing needs you and offers New lead", async () => {
    const html = await render(AgentDashboardPage);
    expect(html).toContain("Nothing needs you today.");
    expect(html).toContain('href="/agent/new"');
  });

  it("the pipeline is empty and names the capture action", async () => {
    const html = await render(AgentProspectsPage);
    expect(html).toContain("Your pipeline.");
    expect(html).toContain("capture the first lead");
    expect(html).toContain('href="/agent/new"');
  });

  it("the client book is empty and points at the pipeline", async () => {
    const html = await render(AgentClientsPage);
    expect(html).toContain("No clients yet.");
    expect(html).toContain('href="/agent/prospects"');
  });
});

const FAMILY_PAGES: Array<{ name: string; Page: PageComponent; headline: string }> = [
  { name: "Home", Page: FamilyDashboardPage, headline: "Nobody is on your account yet." },
  { name: "Your plan", Page: FamilyPlansPage, headline: "No plan is on your account yet." },
  { name: "Payments", Page: FamilyPaymentsPage, headline: "No payments are on your account yet." },
  { name: "Papers", Page: FamilyDocumentsPage, headline: "No papers are on your account yet." },
  { name: "Remembering", Page: FamilyMemorialsPage, headline: "Nobody is on your account yet." },
  { name: "Requests", Page: FamilyRequestsPage, headline: "Nobody is on your account yet." },
  { name: "Ask for a visit", Page: FamilyAppointmentsPage, headline: "Nobody is on your account yet." },
  { name: "The funeral", Page: FamilyCasesPage, headline: "Nobody is on your account yet." },
  { name: "Your lot", Page: FamilyPropertyPage, headline: "Nobody is on your account yet." },
  { name: "What we tell you about", Page: FamilyNotificationsPage, headline: "Nobody is on your account yet." },
];

describe.each(FAMILY_PAGES)("$name starts clean", ({ Page, headline }) => {
  it("renders the honest empty state with the Add-a-loved-one action", async () => {
    const html = await render(Page);
    expect(html).toContain(headline);
    expect(html).toContain("Add a loved one");
  });
});
