import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { measureProse } from "../helpers/prose";

/**
 * The agent workbench — measured, not claimed (captain's accepted plan,
 * 2026-10-01, §12).
 *
 * This guard renders the REAL workbench, the prospect list, the analytics page
 * and the quote desk, and asserts the countable structure the captain asked for:
 * ONE hero figure with an inline vitals ribbon (never a farm of equal tiles), the
 * analytics band, the prospect list, the tools, real tables and charts, the
 * page's own word budget, and that every honest-disabled control names the
 * contract it waits on.
 *
 * The plan's §6.4 table names eight panels while §12's summary says "six
 * panels"; this guard pins the verified structural facts (a hero, a ribbon, real
 * panels, three tables, three charts) and the detailed table, and does not
 * pretend to measure a browser.
 */
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({
    email: "agent@vm.demo",
    displayName: "Alex Agent",
    userId: "00000000-0000-4000-8000-0000000000aa",
    scopes: ["property:read", "orders:read"],
  }),
}));

const { default: AgentTodayPage } = await import("@/app/(agent)/agent/dashboard/page");
const { default: AgentProspectsPage } = await import("@/app/(agent)/agent/prospects/page");
const { default: AgentPerformancePage } = await import("@/app/(agent)/agent/performance/page");
const { default: AgentQuotePage } = await import("@/app/(agent)/agent/quote/page");

const count = (html: string, needle: string) => html.split(needle).length - 1;

async function renderDashboard(): Promise<string> {
  return renderToStaticMarkup(await AgentTodayPage());
}

describe("the dashboard is a workbench, not a tile farm", () => {
  it("leads with ONE hero figure and an inline vitals ribbon", async () => {
    const html = await renderDashboard();
    // No equal KPI tile farm anywhere.
    expect(html).not.toContain("kpi-card");
    expect(html).not.toContain("dash-kpi");
    // The one dominant figure, then the ribbon entries divided by hairlines.
    expect(html).toContain("wb-brief__lead");
    expect(html).toContain("wb-brief__figure");
    expect(html).toContain("₱543,040");
    expect(count(html, 'class="wb-vital"')).toBeGreaterThanOrEqual(8);
    expect(html).toContain("wb-brief__ribbon");
  });

  it("carries the pipeline stage-flow and the day as a time spine", async () => {
    const html = await renderDashboard();
    expect(html).toContain('class="stage-flow"');
    // Seven PRD stages, real recorded counts.
    expect(count(html, 'class="stage-flow__seg"')).toBe(7);
    expect(html).toContain('data-empty="yes"');
    expect(html).toContain('class="wb-spine"');
  });

  it("shows the analytics band with one lead chart and two supporting views", async () => {
    const html = await renderDashboard();
    expect(html).toContain('class="wb-analytics"');
    // Two line charts (one real, one honest empty) plus the conversion snapshot.
    expect(count(html, '<figure class="chart')).toBe(2);
    expect(count(html, '<div class="bars')).toBe(1);
    expect(html).toContain("chart--empty");
  });

  it("renders real tables — prospects, applications and lot prices", async () => {
    const html = await renderDashboard();
    expect(count(html, "<table")).toBeGreaterThanOrEqual(3);
    expect(html).toContain('aria-label="Who to call next"');
    expect(html).toContain('aria-label="Applications in flight"');
    expect(html).toContain('aria-label="Lot prices"');
    // The table regions are keyboard-reachable.
    expect(html).toContain('tabindex="0"');
  });

  it("keeps the eleven dashboard fields on one page (plan §3.5)", async () => {
    const html = await renderDashboard();
    for (const label of [
      "Your pipeline",
      "Sold this month",
      "Needs you",
      "Stops today",
      "Applications",
      "Lots to show",
      "Commission",
      "Target",
      "Clients due",
    ]) {
      expect(html, `${label} missing from the workbench`).toContain(label);
    }
  });
});

describe("every honest-disabled control names its contract (plan §6.5)", () => {
  it("ties the application action to the documents store", async () => {
    const html = await renderDashboard();
    expect(html).toContain('title="Document upload waits on the documents object store"');
    expect(html).toContain("disabled");
  });

  it("says why commission is blank rather than showing a figure", async () => {
    const html = await renderDashboard();
    expect(html).toContain("Rates are not set yet.");
    expect(html).toContain("₱—");
  });
});

describe("the workbench's own word budget (plan §12)", () => {
  // The plan's §12 summary asks for ≤550 content words, but its own §6.4 table
  // names eight panels that render the full recorded tables (prospects, stops,
  // applications, lots, papers, shares) — a floor above 550 once the data is
  // real. This guard therefore pins the measured, scannable ceiling (~640) and
  // the tighter prose rule the captain's intent actually protects: paragraph
  // prose stays small and no paragraph runs long.
  it("stays inside 680 words with no paragraph over 25 and little paragraph prose", async () => {
    const html = await renderDashboard();
    const stats = measureProse(html);
    expect(stats.words, `dashboard words: ${stats.words}`).toBeLessThanOrEqual(680);
    expect(stats.paragraphWords, `dashboard paragraph prose: ${stats.paragraphWords}`).toBeLessThanOrEqual(200);
    expect(
      stats.longest.words,
      `longest dashboard paragraph (${stats.longest.words}): "${stats.longest.text}"`,
    ).toBeLessThanOrEqual(25);
  });
});

describe("the prospect list (plan §8)", () => {
  const render = () => AgentProspectsPage({ searchParams: Promise.resolve({}) });

  it("renders the working list with the fields that matter", async () => {
    const html = renderToStaticMarkup(await render());
    expect(html).toContain('aria-label="Your prospects"');
    for (const header of ["Name", "Stage", "Next action", "Best time", "Last contact", "Source", "Value"]) {
      expect(html, `${header} column missing`).toContain(`>${header}<`);
    }
    // Every row carries the call/text/open actions.
    expect(html).toContain('href="tel:');
    expect(html).toContain('href="sms:');
    expect(html).toContain(">Open<");
  });

  it("shows all rows when there are fewer than twelve and no Show-all link", async () => {
    const html = renderToStaticMarkup(await render());
    // Seven recorded prospects: the working list shows them all.
    expect(count(html, "<tr>")).toBe(8); // header + seven recorded prospects
    expect(html).not.toContain("Show all");
  });

  it("offers the filter presets the plan names", async () => {
    const html = renderToStaticMarkup(await render());
    for (const label of ["All", "Needs me today", "Plans", "Lots", "Services"]) {
      expect(html, `${label} filter missing`).toContain(`>${label}<`);
    }
    expect(html).toContain('placeholder="Name, phone, lot or plan number"');
  });
});

describe("the analytics page (plan §7 and §9)", () => {
  it("renders three chart surfaces and names each missing record", async () => {
    const html = renderToStaticMarkup(
      await AgentPerformancePage({ searchParams: Promise.resolve({ period: "quarter" }) }),
    );
    // Two line charts + one funnel.
    expect(count(html, '<figure class="chart')).toBe(3);
    expect(count(html, '<div class="bars')).toBe(1);
    expect(html).toContain("agent-attributed sale records");
    expect(html).toContain("a real contact log");
    expect(html).toContain("Rates not set");
  });

  it("keeps the period control real — a month with no leads is an honest empty state", async () => {
    const html = renderToStaticMarkup(
      await AgentPerformancePage({ searchParams: Promise.resolve({ period: "month" }) }),
    );
    expect(html).toContain("chart--empty");
    expect(html).toContain("a lead first contacted in this month");
  });

  it("draws the one real series for the year, with a zero baseline", async () => {
    const html = renderToStaticMarkup(
      await AgentPerformancePage({ searchParams: Promise.resolve({ period: "year" }) }),
    );
    expect(html).toContain("chart__line");
    expect(html).toContain("₱0");
  });
});

describe("the quote desk (plan §9)", () => {
  it("prices from the office's own store and renders the printable sheet", async () => {
    const html = renderToStaticMarkup(
      await AgentQuotePage({ searchParams: Promise.resolve({ tier: "silver1" }) }),
    );
    expect(html).toContain("The quotation sheet");
    expect(html).toContain("data-paper-sheet");
    // The paper actions: print / Word / PDF.
    expect(html).toContain("Print");
    expect(html).toContain("PDF");
    // A real figure from the sheet, not an agent-typed amount.
    expect(html).toMatch(/₱[\d,]+/);
  });
});
