import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { measureProse } from "../helpers/prose";
import { FAMILY_HELP } from "@/lib/family/contact";

/**
 * /agent/sales — the statement as a table (approved plan §5.5/§15 PR 4).
 *
 * The plan's verdict on the page this replaces: 484 content words, "the
 * wordiest screen in the portal, and the wrong shape for a money page". This
 * guard pins the table the plan asked for (line · basis · credited · state ·
 * amount), the three recorded statement lines and their states, the honest
 * blanks (₱—, named once, never a zero), the compact legends, and the reading
 * budget the rebuild is measured against.
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
  requirePortalSessionOrRedirect: async () => ({ email: "agent@vm.demo", scopes: [] }),
}));

const { default: AgentSalesPage } = await import("@/app/(agent)/agent/sales/page");

async function renderSales(): Promise<string> {
  return renderToStaticMarkup(await AgentSalesPage());
}

describe("/agent/sales — the statement table", () => {
  it("renders the five statement columns the plan names", async () => {
    const html = await renderSales();
    expect(html).toContain('class="table wb-table"');
    for (const header of ["Line", "Basis", "Credited", "State", "Amount"]) {
      expect(html, `${header} column missing`).toContain(`>${header}</th>`);
    }
  });

  it("carries every recorded statement line", async () => {
    const html = await renderSales();
    expect(html).toContain("Villa Memorial Plan · Silver 1 · Liwayway Cruz");
    expect(html).toContain("Funeral package · Reyes family");
    expect(html).toContain("Cancelled service · floral add-on for Reyes");
  });

  it("carries each recorded state, the reversal on its own line", async () => {
    const html = await renderSales();
    expect(html).toContain("Pending approval");
    expect(html).toContain("Approved — scheduled for the 30 Sep cycle");
    expect(html).toContain("Reversed with the order");
  });

  it("leaves every amount blank and names the reason once", async () => {
    const html = await renderSales();
    // Every amount cell is the blank marker — never a zero or an invented figure.
    const amounts = [...html.matchAll(/data-label="Amount">([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    expect(amounts.length).toBe(3);
    for (const cell of amounts) expect(cell).toContain("₱—");
    expect(html).not.toContain("₱0");
    // The reason is stated once, crisply, and never as a per-row repeat.
    expect((html.match(/Rates are not configured/g) ?? []).length).toBe(1);
  });

  it("shows the four states and the seven bases as the supporting legend", async () => {
    const html = await renderSales();
    for (const state of ["Pending approval", "Approved", "Scheduled", "Paid", "Reversed"]) {
      expect(html, `state ${state} missing from the legend`).toContain(state);
    }
    for (const base of [
      "Fixed %",
      "Fixed ₱",
      "Tiered",
      "Volume",
      "Milestone",
      "Split",
      "Multi-agent",
    ]) {
      expect(html, `base ${base} missing from the legend`).toContain(base);
    }
  });

  it("keeps the honest next step on the office's own number", async () => {
    const html = await renderSales();
    expect(html).toContain("Ask the office");
    expect(html).toContain(FAMILY_HELP.phone);
    expect(html).toContain(`href="${FAMILY_HELP.phoneHref}"`);
  });

  it("offers no control that pretends rates can be set here", async () => {
    const html = await renderSales();
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("ag-money-grid");
  });

  it("keeps one h1, a keyboard-reachable table region, and the prose budget", async () => {
    const html = await renderSales();
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="region"');

    const stats = measureProse(html);
    expect(
      stats.paragraphWords,
      `paragraph prose is ${stats.paragraphWords} words (target ≤ 150): ${JSON.stringify(stats)}`,
    ).toBeLessThanOrEqual(150);
    expect(stats.longest.words, stats.longest.text).toBeLessThanOrEqual(30);
    expect(stats.listItems.longestWords, stats.listItems.text).toBeLessThanOrEqual(30);
  });
});
