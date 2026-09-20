import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { measureProse, textOf, wordsOf } from "@/tests/helpers/prose";

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
 * /immediate-assistance, /facilities, /gallery and the digital-memorial
 * search/find/detail screens (F-04) — plus the agent portal's
 * lead record (F-09); each page joined in the PR that added it (a room page is
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
const { default: ImmediateAssistancePage } = await import(
  "@/app/(public)/immediate-assistance/page"
);
const { default: FacilitiesPage } = await import("@/app/(public)/facilities/page");
const { default: GalleryPage } = await import("@/app/(public)/gallery/page");
const { default: MemorialSearchPage } = await import("@/app/(public)/memorials/page");
const { default: FindMyLovedOnePage } = await import("@/app/(public)/memorials/find/page");
const { default: MemorialPage } = await import("@/app/(public)/memorials/[id]/page");
const { default: LeadDetailPage } = await import("@/app/(agent)/agent/prospects/[id]/page");
const { default: CopilotPage } = await import("@/app/(staff)/staff/copilot/page");
const { default: UsersPage } = await import("@/app/(staff)/staff/users/page");
const { default: WorkflowsPage } = await import("@/app/(staff)/staff/workflows/page");
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
};

const PAGES: ReadonlyArray<BudgetPage> = [
  {
    name: "/services",
    render: async () =>
      renderToStaticMarkup(createElement(CartProvider, null, await ServicesPage())),
    openingLead: /<p class="sv-hero__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/builder",
    render: async () => renderToStaticMarkup(await BuilderPage()),
    openingLead: /<p class="sb-hero__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/plans",
    render: async () =>
      renderToStaticMarkup(
        createElement(
          CartProvider,
          null,
          await PlansPage(),
        ),
      ),
    openingLead: /<p class="hero-premium__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/immediate-assistance",
    render: async () => renderToStaticMarkup(await ImmediateAssistancePage()),
    openingLead: /<p class="ia-hero__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/facilities",
    // The rooms page has no cart action (its next step is the 24/7 call), so it
    // renders without the cart context.
    render: async () => renderToStaticMarkup(await FacilitiesPage()),
    openingLead: /<p class="hero-premium__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/gallery",
    render: async () =>
      renderToStaticMarkup(createElement(CartProvider, null, await GalleryPage())),
    openingLead: /<p class="gal-hero__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/memorials (search)",
    render: async () =>
      renderToStaticMarkup(
        await MemorialSearchPage({ searchParams: Promise.resolve({}) }),
      ),
    openingLead: /<p class="hero-premium__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/memorials/find (find my loved one)",
    render: async () => renderToStaticMarkup(await FindMyLovedOnePage()),
    openingLead: /<p class="hero-premium__lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/memorials/[id] (not available)",
    render: async () =>
      renderToStaticMarkup(await MemorialPage({ params: Promise.resolve({ id: "not-published" }) })),
    openingLead: /<p class="hero-premium__lead">([\s\S]*?)<\/p>/,
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
    name: "/staff/copilot (AI Copilot)",
    render: async () =>
      renderToStaticMarkup(await CopilotPage({ searchParams: Promise.resolve({}) })),
    openingLead: /<p class="copilot-lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/staff/users (Users & roles)",
    render: async () => renderToStaticMarkup(await UsersPage()),
    openingLead: /<p class="text-md">([\s\S]*?)<\/p>/,
  },
  {
    name: "/staff/workflows",
    render: async () => renderToStaticMarkup(await WorkflowsPage()),
    openingLead: /<p class="text-md">([\s\S]*?)<\/p>/,
  },
  {
    name: "/staff/settings (Tenant settings)",
    render: async () => renderToStaticMarkup(await SettingsPage()),
    openingLead: /<p class="text-md">([\s\S]*?)<\/p>/,
  },
  // The three designed Operations screens joined the same PR that built them: an
  // operations answer is read at a glance too (tables and lists lead; the one lead
  // sentence is on the page).
  {
    name: "/staff/dispatch (vehicle dispatch)",
    render: async () =>
      renderToStaticMarkup(await DispatchPage({ searchParams: Promise.resolve({}) })),
    openingLead: /<p class="ops-lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/staff/work-orders",
    render: async () =>
      renderToStaticMarkup(await WorkOrdersPage({ searchParams: Promise.resolve({}) })),
    openingLead: /<p class="ops-lead">([\s\S]*?)<\/p>/,
  },
  {
    name: "/staff/notifications",
    render: async () => renderToStaticMarkup(await NotificationsPage()),
    openingLead: /<p class="ops-lead">([\s\S]*?)<\/p>/,
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
        // The lead sits in the hero; the primary action is the hero's first link.
        const hero = html.slice(0, html.indexOf("</section>"));
        expect(hero, `${page.name}: no button anchor in the hero`).toMatch(
          /<a\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>/,
        );
      });
    });
  }
});
