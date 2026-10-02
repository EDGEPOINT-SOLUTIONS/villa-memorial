import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";
import { measureProse, textOf, wordsOf } from "@/tests/helpers/prose";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}


/**
 * The reading budget (captain, 2026-09-18 — client review: "too wordy; it
 * should be understandable at a glance").
 *
 * The rule these pages must keep:
 *  · a page opens with one plain sentence (≤ 12 words) + one primary action;
 *  · no paragraph over 30 words;
 *  · paragraph prose under 300 words per page — everything else is a number,
 *    a label, a table cell, a chip or a short list item;
 *  · list items stay short too, so prose cannot move into a list.
 *
 * Scope: the public content pages that joined this guard — /services, /plans,
 * /facilities and the digital-memorial search/find/detail screens (F-04) — plus
 * the agent portal's lead record (F-09); each page joined in the PR that added it (a room page is
 * read at a glance; the lead record must answer the person, the state and the
 * next step in the first screenful). All are executed as the real page
 * components (the same render harness the other page tests use). The home
 * page's copy lives in the
 * staff-editable LandingPage document (content, not code), so it is measured in
 * the PR record, not gated here; a future page adds itself to PAGES in the same
 * PR that compresses it.
 *
 * The failure message names the offending page and its count on purpose: the
 * check is the guardrail that stops the wordiness creeping back.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/",
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "agent@vm.demo", scopes: [] }),
}));

// The staff Copilot page joined this guard in the PR that built it (a copilot answer must
// be read at a glance too). Its session is server-side, so the gate is stubbed here the
// way the staff page tests stub it — the framing is what this suite measures.
const staffSession = {
  userId: "00000000-0000-4000-8000-000000000012",
  tenantId: "00000000-0000-4000-8000-000000000001",
  scopes: [
    "cases:read",
    "scheduling:read",
    "property:read",
    "identity:users:manage",
    "tenancy:tenants:manage",
    "catalog:write",
  ],
  email: "sam.staff@vm.demo",
  displayName: "Sam Staff",
  expiresAt: new Date(Date.now() + 900_000).toISOString(),
};
vi.mock("@/lib/auth/guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/guard")>();
  return { ...actual, requireSessionOrRedirect: async () => staffSession };
});

const { default: ServicesPage } = await import("@/app/(public)/services/page");
const { default: BuilderPage } = await import("@/app/(public)/builder/page");
const { default: PlansPage } = await import("@/app/(public)/plans/page");
const { default: PriceListPage } = await import("@/app/(public)/price-list/page");
const { default: CasketDetailPage } = await import("@/app/(public)/products/[sku]/page");
const { default: FacilitiesPage } = await import("@/app/(public)/facilities/page");
const { default: PublicMapPage } = await import("@/app/(public)/map/page");
const { default: ContactPage } = await import("@/app/(public)/contact/page");
const { default: MemorialSearchPage } = await import("@/app/(public)/memorials/page");
const { default: FindMyLovedOnePage } = await import("@/app/(public)/memorials/find/page");
const { default: MemorialPage } = await import("@/app/(public)/memorials/[id]/page");
const { default: LeadDetailPage } = await import("@/app/(agent)/agent/prospects/[id]/page");
const { default: AgentSalesPage } = await import("@/app/(agent)/agent/sales/page");
const { default: AgentApplicationsPage } = await import("@/app/(agent)/agent/applications/page");
const { default: AgentClientsPage } = await import("@/app/(agent)/agent/clients/page");
const { default: AgentMarketingPage } = await import("@/app/(agent)/agent/marketing/page");
const { default: CopilotPage } = await import("@/app/(staff)/staff/copilot/page");
const { default: UsersPage } = await import("@/app/(staff)/staff/users/page");
const { default: SettingsPage } = await import("@/app/(staff)/staff/settings/page");
const { default: DispatchPage } = await import("@/app/(staff)/staff/dispatch/page");
const { default: WorkOrdersPage } = await import("@/app/(staff)/staff/work-orders/page");
const { default: NotificationsPage } = await import(
  "@/app/(staff)/staff/notifications/page"
);

const BUDGET = {
  /** Paragraph prose per page (words inside <p> elements). */
  paragraphWords: 300,
  /** Longest single paragraph. */
  longestParagraph: 30,
  /** Longest single <li> — a "short list item", never a paragraph in disguise. */
  longestListItem: 30,
  /** The page's opening sentence (the "answer at a glance" line). */
  openingSentence: 12,
} as const;

type BudgetPage = {
  name: string;
  /** The real page component, wrapped in the cart context its buttons need. */
  render: () => Promise<string>;
  /** The page's opening lead paragraph (the one-line answer). */
  openingLead: RegExp;
  /**
   * An action beside the opening sentence. Defaults to a `.btn` anchor (a
   * hero's link); a page opened by its own form passes a `.btn` button.
   */
  openingAction?: RegExp;
};

const PAGES: ReadonlyArray<BudgetPage> = [
  {
    name: "/services",
    render: async () =>
      renderToStaticMarkup(withBaskets( await ServicesPage())),
    // The opening band was stripped (captain, 2026-10-02); the first band head
    // below it (embalming) carries the page's opening line.
    openingLead: /<p class="sv-band__lead">([\s\S]*?)<\/p>/,
    openingAction: /<(?:a|button)\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>/,
  },
  {
    name: "/builder",
    render: async () => renderToStaticMarkup(await BuilderPage()),
    openingLead: /<p class="sb-band__lead">([\s\S]*?)<\/p>/,
    // No gateway band any more (captain, 2026-10-02): the workbench's first
    // action is the rate choice.
    openingAction: /<input\b[^>]*type="radio"/,
  },
  {
    name: "/plans",
    render: async () =>
      renderToStaticMarkup(
        withBaskets(
          await PlansPage(),
        ),
      ),
    openingLead: /<p class="public-hero__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/price-list",
    render: async () =>
      renderToStaticMarkup(withBaskets( await PriceListPage())),
    openingLead: /<p class="public-hero__lead">([\s\S]*?)<\/p>/,
  },
  {
    // The Amazon-structure PDP (P3): the gallery leads, the buy box answers at a
    // glance (name · variant selector · live price · one CTA) and the editable
    // content lives below the fold.
    name: "/products/[sku] (casket detail)",
    render: async () =>
      renderToStaticMarkup(
        withBaskets(
          await CasketDetailPage({ params: Promise.resolve({ sku: "CSK-LUMINA" }) }),
        ),
      ),
    openingLead: /<p class="pdp-buy__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/facilities",
    // The rooms page's next step is an Add-to-Quote chapel line (office, inbox
    // 047), so it needs the baskets like every other commerce surface.
    render: async () => renderToStaticMarkup(withBaskets( await FacilitiesPage())),
    // The opening band was stripped (captain, 2026-10-02); the rooms head below
    // it carries the page's opening line.
    openingLead: /<p class="home-band-head__lead">([\s\S]*?)<\/p>/,
    openingAction: /<(?:a|button)\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>/,
  },
  {
    // The park page opens on the home's gateway (captain 2026-09-30): one
    // short lead + the Map / Lots actions; the map band adds labels and
    // figures, not prose.
    name: "/map (Villa Memorial Park)",
    render: async () =>
      renderToStaticMarkup(
        await PublicMapPage({ searchParams: Promise.resolve({}) }),
      ),
    openingLead: /<p class="public-hero__lead">([\s\S]*?)<\/p>/,
  },
  {
    // The reach line (captain's Lavish plan, 2026-09-30): the services gateway
    // with the gold call, then the form, the published lines and the visit.
    name: "/contact (reach us)",
    render: async () =>
      renderToStaticMarkup(withBaskets( await ContactPage({ searchParams: Promise.resolve({}) }) )),
    // The gateway band was stripped (captain, 2026-10-02): the form's own band
    // head opens the page and the form's submit is the action.
    openingLead: /<p class="home-band-head__lead">([\s\S]*?)<\/p>/,
    openingAction: /<button\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>/,
  },
  {
    // Captain 2026-09-30: the SEARCH is the first element, with the privacy
    // explainer beside it — so the opening sentence is the explainer's lead and
    // the action is the form's own submit button.
    name: "/memorials (search)",
    render: async () =>
      renderToStaticMarkup(
        await MemorialSearchPage({ searchParams: Promise.resolve({}) }),
      ),
    openingLead: /<p class="section-head__lead">([\s\S]*?)<\/p>/,
    openingAction: /<button\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>/,
  },
  {
    name: "/memorials/find (find my loved one)",
    render: async () => renderToStaticMarkup(await FindMyLovedOnePage()),
    openingLead: /<p class="public-hero__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/memorials/[id] (not available)",
    render: async () =>
      renderToStaticMarkup(await MemorialPage({ params: Promise.resolve({ id: "not-published" }) })),
    openingLead: /<p class="public-hero__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/agent/prospects/[id] (lead record)",
    render: async () =>
      renderToStaticMarkup(
        await LeadDetailPage({ params: Promise.resolve({ id: "prospect-cecilia" }) }),
      ),
    openingLead: /<p class="ag-hero__lead">([\s\S]*?)<\/p>/,
  },
  {
    // The money page is a statement table now (approved agent plan §15 PR 4):
    // the facts are table cells, so the prose budget is what the words explain.
    name: "/agent/sales (statement)",
    render: async () => renderToStaticMarkup(await AgentSalesPage()),
    openingLead: /<p class="wb-head__lead">([\s\S]*?)<\/p>/,
  },
  {
    // The remaining-screen pass (2026-10-02): applications and clients are tables
    // too, so they join the guard in the PR that compresses them. The opening
    // action is the header button when the page has one, the header link otherwise.
    name: "/agent/applications (table)",
    render: async () => renderToStaticMarkup(await AgentApplicationsPage()),
    openingLead: /<p class="wb-head__lead">([\s\S]*?)<\/p>/,
    openingAction: /<(?:a|button)\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>/,
  },
  {
    name: "/agent/clients (table)",
    render: async () => renderToStaticMarkup(await AgentClientsPage({ searchParams: Promise.resolve({}) })),
    openingLead: /<p class="wb-head__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/agent/marketing (materials grid)",
    render: async () => renderToStaticMarkup(await AgentMarketingPage()),
    openingLead: /<p class="wb-head__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/staff/copilot (AI Copilot)",
    render: async () =>
      renderToStaticMarkup(await CopilotPage({ searchParams: Promise.resolve({}) })),
    openingLead: /<p class="copilot-lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/staff/users (Users & roles)",
    render: async () => renderToStaticMarkup(await UsersPage()),
    openingLead: /<p class="page-header__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/staff/settings (Park configuration)",
    render: async () => renderToStaticMarkup(await SettingsPage()),
    openingLead: /<p class="page-header__lead">([\s\S]*?)<\/p>/,
  },
  // The three designed Operations screens joined the same PR that built them: an
  // operations answer is read at a glance too (tables and lists lead; the one lead
  // sentence is on the page).
  {
    name: "/staff/dispatch (vehicle dispatch)",
    render: async () =>
      renderToStaticMarkup(await DispatchPage({ searchParams: Promise.resolve({}) })),
    openingLead: /<p class="page-header__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/staff/work-orders",
    render: async () =>
      renderToStaticMarkup(await WorkOrdersPage({ searchParams: Promise.resolve({}) })),
    openingLead: /<p class="page-header__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/staff/notifications",
    render: async () => renderToStaticMarkup(await NotificationsPage()),
    openingLead: /<p class="page-header__lead">([\s\S]*?)<\/p>/,
  },
];

function budgetFailures(name: string, stats: ReturnType<typeof measureProse>): string[] {
  const failures: string[] = [];
  if (stats.paragraphWords > BUDGET.paragraphWords) {
    failures.push(
      `${name}: paragraph prose is ${stats.paragraphWords} words (budget ${BUDGET.paragraphWords}). ` +
        "Move facts into a table, a price block, a numbered step or a labelled list item.",
    );
  }
  if (stats.longest.words > BUDGET.longestParagraph) {
    failures.push(
      `${name}: longest paragraph is ${stats.longest.words} words (limit ${BUDGET.longestParagraph}): ` +
        `"${stats.longest.text}"`,
    );
  }
  if (stats.listItems.longestWords > BUDGET.longestListItem) {
    failures.push(
      `${name}: longest list item is ${stats.listItems.longestWords} words (limit ${BUDGET.longestListItem}): ` +
        `"${stats.listItems.text}"`,
    );
  }
  return failures;
}

describe("the public pages keep the reading budget", () => {
  for (const page of PAGES) {
    describe(page.name, () => {
      let html = "";
      let stats: ReturnType<typeof measureProse>;

      it("renders within the budget (paragraph words, longest paragraph, list items)", async () => {
        html = await page.render();
        stats = measureProse(html);
        const failures = budgetFailures(page.name, stats);
        expect(failures.join("\n"), failures.join("\n")).toEqual("");
      });

      it("opens with one plain sentence (≤ 12 words)", () => {
        const match = html.match(page.openingLead);
        expect(match, `${page.name}: no opening lead paragraph (${page.openingLead})`).toBeTruthy();
        const sentence = textOf(match![1]);
        expect(
          wordsOf(sentence),
          `${page.name}: the opening sentence is ${wordsOf(sentence)} words (limit ${BUDGET.openingSentence}): "${sentence}"`,
        ).toBeLessThanOrEqual(BUDGET.openingSentence);
      });

      it("keeps an action beside the opening sentence", () => {
        // The lead sits in the opening band; the primary action is its first
        // link (hero pages) or the form's own submit (the memorial search).
        // A page opened by a form slices to the form's end so the submit is in
        // view; every other page slices to its opening section.
        const endForm = html.indexOf("</form>");
        const endSection = html.indexOf("</section>");
        const end = endForm >= 0 ? endForm : endSection;
        const hero = html.slice(0, end);
        expect(hero, `${page.name}: no button action in the opening`).toMatch(
          page.openingAction ?? /<a\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>/,
        );
      });
    });
  }
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
