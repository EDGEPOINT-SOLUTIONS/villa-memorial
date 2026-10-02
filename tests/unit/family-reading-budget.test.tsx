import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { measureProse, textOf, wordsOf } from "@/tests/helpers/prose";

/**
 * The FAMILY reading budget (captain, 2026-09-21 — the president's review:
 * “too wordy… dizzy just by looking at it”; “at a glance it's very
 * understandable”).
 *
 * The family portal renders the same kit as the public storefront, but for a
 * grieving, often older reader — so it takes a TIGHTER budget than the public
 * pages (tests/unit/reading-budget.test.tsx, 300/30/30/12):
 *
 *   · paragraph prose ≤ 150 words per page;
 *   · no paragraph over 25 words;
 *   · no list item over 20 words;
 *   · the opening sentence ≤ 14 words;
 *   · ZERO “About this page.” paragraphs — every honest gap is the ONE shared
 *     `WhatThisShows` disclosure (components/family/family-ui.tsx).
 *
 * Every family screen joins the guard in the PR that compresses it; a new page
 * adds itself to PAGES in the same PR. The failure names the screen and its
 * count, so the regression explains itself.
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
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/client/dashboard",
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "customer@vm.demo", scopes: [] }),
}));

const BUDGET = {
  paragraphWords: 150,
  longestParagraph: 25,
  longestListItem: 20,
  openingSentence: 14,
} as const;

/**
 * What sits behind the tap. Progressive disclosure is the tool, so the open
 * page takes the tight budget above and the disclosed content takes a separate
 * ceiling — generous enough for the office's own record note, never a wall.
 */
const DISCLOSED_BUDGET = {
  paragraphWords: 180,
  longestParagraph: 45,
  longestListItem: 20,
} as const;

function openPage(html: string): string {
  return html.replace(/<details\b[\s\S]*?<\/details>/gi, " ");
}

function disclosedContent(html: string): string {
  return [...html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)]
    .map((match) => match[1])
    .join(" ");
}

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

// The receipt detail route is deliberately absent: no recorded receipt carries a
// number, date and amount, so it has no reachable state to measure yet.
const PAGES: Array<{ name: string; Page: PageComponent; gap?: boolean }> = [
  { name: "Home", Page: HomePage },
  { name: "The funeral", Page: FuneralPage },
  { name: "Payments", Page: PaymentsPage },
  { name: "Papers", Page: PapersPage },
  { name: "Remembering", Page: RememberingPage },
  { name: "Help", Page: HelpPage, gap: false },
  { name: "Your details", Page: DetailsPage, gap: false },
  { name: "Your plan", Page: PlanPage },
  { name: "Your lot", Page: LotPage },
  { name: "Ask for a visit", Page: VisitPage },
  { name: "Requests", Page: RequestsPage },
  { name: "What we tell you about", Page: NoticesPage },
  { name: "Privacy Center", Page: PrivacyPage },
  { name: "Your family", Page: FamilyDashboardPage },
];

async function render(page: PageComponent): Promise<string> {
  return renderToStaticMarkup(await page({}));
}

function failures(name: string, stats: ReturnType<typeof measureProse>): string[] {
  const out: string[] = [];
  if (stats.paragraphWords > BUDGET.paragraphWords) {
    out.push(
      `${name}: paragraph prose is ${stats.paragraphWords} words (budget ${BUDGET.paragraphWords}).`,
    );
  }
  if (stats.longest.words > BUDGET.longestParagraph) {
    out.push(
      `${name}: longest paragraph is ${stats.longest.words} words (limit ${BUDGET.longestParagraph}): "${stats.longest.text}"`,
    );
  }
  if (stats.listItems.longestWords > BUDGET.longestListItem) {
    out.push(
      `${name}: longest list item is ${stats.listItems.longestWords} words (limit ${BUDGET.longestListItem}): "${stats.listItems.text}"`,
    );
  }
  return out;
}

describe("the family pages keep the family reading budget", () => {
  for (const page of PAGES) {
    describe(page.name, () => {
      let html = "";
      let stats: ReturnType<typeof measureProse>;

      it("renders within the budget (paragraph words, longest paragraph, list items)", async () => {
        html = await render(page.Page);
        stats = measureProse(openPage(html));
        const failuresList = failures(page.name, stats);
        expect(failuresList.join("\n"), failuresList.join("\n")).toEqual("");
      });

      it("keeps disclosed content behind the tap within its own ceiling", async () => {
        if (!html) html = await render(page.Page);
        const disclosed = measureProse(disclosedContent(html));
        const out: string[] = [];
        if (disclosed.paragraphWords > DISCLOSED_BUDGET.paragraphWords) {
          out.push(
            `${page.name}: disclosed paragraph prose is ${disclosed.paragraphWords} words (budget ${DISCLOSED_BUDGET.paragraphWords}).`,
          );
        }
        if (disclosed.longest.words > DISCLOSED_BUDGET.longestParagraph) {
          out.push(
            `${page.name}: longest disclosed paragraph is ${disclosed.longest.words} words (limit ${DISCLOSED_BUDGET.longestParagraph}).`,
          );
        }
        if (disclosed.listItems.longestWords > DISCLOSED_BUDGET.longestListItem) {
          out.push(
            `${page.name}: longest disclosed list item is ${disclosed.listItems.longestWords} words (limit ${DISCLOSED_BUDGET.longestListItem}).`,
          );
        }
        expect(out.join("\n"), out.join("\n")).toEqual("");
      });

      it("opens with one plain sentence (≤ 14 words)", async () => {
        if (!html) html = await render(page.Page);
        const match = html.match(/<p class="ag-hero__lead">([\s\S]*?)<\/p>/);
        expect(match, `${page.name}: no hero lead paragraph`).toBeTruthy();
        const sentence = textOf(match![1]);
        expect(
          wordsOf(sentence),
          `${page.name}: the opening sentence is ${wordsOf(sentence)} words (limit ${BUDGET.openingSentence}): "${sentence}"`,
        ).toBeLessThanOrEqual(BUDGET.openingSentence);
      });

      it("carries one primary action before the first supporting section", async () => {
        if (!html) html = await render(page.Page);
        const primary = html.indexOf('class="btn btn--primary');
        const firstSection = html.indexOf('class="ag-sec');
        expect(primary, `${page.name} needs a primary action`).toBeGreaterThan(-1);
        if (firstSection > -1) {
          expect(primary, `${page.name}'s action must lead`).toBeLessThan(firstSection);
        }
      });

      it("uses the one shared gap disclosure, never an About-this-page paragraph", async () => {
        if (!html) html = await render(page.Page);
        expect(html, `${page.name} must not carry an About this page paragraph`).not.toContain(
          "About this page",
        );
        if (page.gap !== false) {
          expect(html, `${page.name} must use the shared gap disclosure`).toContain('class="fv-gap"');
        }
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
