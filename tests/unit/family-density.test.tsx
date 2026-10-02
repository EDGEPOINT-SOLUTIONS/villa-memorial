import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { measureProse } from "@/tests/helpers/prose";

/**
 * The family command centre — measured, not claimed (plan §12).
 *
 * This guard renders the REAL dashboard and asserts the countable structure the
 * captain asked for (KPIs, panels, tables), the dense type scope, the colour
 * system's role tokens, tabular figures for money and dates, the page's own word
 * budget, and the Papers popup's states — including that a paper's PDF comes
 * from the guarded family route and never a public media path.
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
    userId: "00000000-0000-4000-8000-0000000000aa",
    scopes: [],
  }),
}));

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const { default: HomePage } = await import("@/app/(family)/client/dashboard/page");
const { familyPaperPopupItems } = await import("@/lib/family/family-documents");
const { PapersDialog } = await import("@/components/family/papers-dialog");
const { getFamilySnapshot } = await import("@/lib/api-client/family");

async function renderHome(): Promise<string> {
  return renderToStaticMarkup(
    await HomePage({ searchParams: Promise.resolve({ person: "ernesto-dela-cruz" }) }),
  );
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

describe("the dashboard's countable structure", () => {
  it("renders the KPI row, the panels and the tables the plan sets", async () => {
    const html = await renderHome();
    const kpis = count(html, 'class="card kpi-card dash-kpi"');
    const panels = count(html, 'class="dash-panel ');
    const tables = count(html, "<table");
    expect(kpis, "the KPI row shows six tiles").toBe(6);
    expect(panels, "the dashboard shows its panels").toBeGreaterThanOrEqual(6);
    expect(tables, "the dashboard carries real tables").toBeGreaterThanOrEqual(3);
  });

  it("gives every panel a colour-role label and one heading", async () => {
    const html = await renderHome();
    const panels = count(html, 'class="dash-panel ');
    const labels = count(html, 'class="dash-panel__label"');
    const titles = count(html, 'class="dash-panel__title"');
    expect(labels).toBe(panels);
    expect(titles).toBe(panels);
    // Every panel declares exactly one role modifier.
    const roles = count(html, "dash-panel--");
    expect(roles).toBe(panels);
  });

  it("keeps the office number one tap away", async () => {
    const html = await renderHome();
    expect(html).toContain('href="tel:+639176178489"');
  });
});

describe("the dense type scope and the colour system", () => {
  const css = read("styles/components.css");

  it("steps the family scale down to the base ladder inside .dash", () => {
    const start = css.search(/^\.dash \{/m);
    const end = css.search(/^\[data-fv-reading~="large"\] \.dash \{/m);
    expect(start, ".dash rule exists").toBeGreaterThan(-1);
    expect(end, "the magnifier rule exists").toBeGreaterThan(start);
    const block = css.slice(start, end);
    for (const [token, value] of [
      ["--text-xs", "12px"],
      ["--text-sm", "13px"],
      ["--text-md", "1.0625rem"],
      ["--text-lg", "1.25rem"],
      ["--text-xl", "1.5rem"],
    ]) {
      expect(block, `${token} in .dash`).toContain(`${token}: ${value};`);
    }
    expect(block).toContain("--text-page-title: var(--text-2xl);");
    expect(block).toContain("--text-section-title: var(--text-xl);");
    expect(block).toContain("--text-card-title: var(--text-lg);");
  });

  it("keeps the magnifier winning inside the dense scope", () => {
    const idx = css.search(/^\[data-fv-reading~="large"\] \.dash \{/m);
    expect(idx).toBeGreaterThan(-1);
    const block = css.slice(idx, idx + 400);
    expect(block).toContain("--text-md: 1.25rem;");
    expect(block).toContain("--text-xl: 2rem;");
  });

  it("gives money and dates tabular figures", () => {
    const idx = css.indexOf(".dash {");
    expect(css.slice(idx, idx + 400)).toContain("font-variant-numeric: tabular-nums;");
    const table = css.indexOf(".dash-table {");
    expect(css.slice(table, table + 200)).toContain("font-variant-numeric: tabular-nums;");
  });

  it("labels every dashboard data cell (so a table restacks with its labels)", async () => {
    const html = await renderHome();
    // The money and visit tables carry a label per non-row-header cell.
    expect(html).toContain('data-label="Amount"');
    expect(html).toContain('data-label="State"');
    expect(html).toContain('data-label="Held in the name of"');
  });

  it("pairs every role wash with a named ramp token and every label with an -ink/secondary token", () => {
    const roleWashes: Array<[string, string]> = [
      [".dash-panel--needs .dash-panel__head", "var(--color-status-warning-bg)"],
      [".dash-panel--money .dash-panel__head", "var(--gold-wash-soft)"],
      [".dash-panel--arrangement .dash-panel__head", "var(--sky-50)"],
      [".dash-panel--settled .dash-panel__head", "var(--color-status-success-bg)"],
      [".dash-panel--place .dash-panel__head", "var(--color-bg-subtle)"],
    ];
    for (const [selector, wash] of roleWashes) {
      const idx = css.indexOf(`${selector} {`);
      expect(idx, `${selector} exists`).toBeGreaterThan(-1);
      expect(css.slice(idx, idx + 200), selector).toContain(wash);
    }
    // Every role label resolves to an ink/secondary token, never an arbitrary value.
    for (const selector of [
      ".dash-panel--needs .dash-panel__label",
      ".dash-panel--money .dash-panel__label",
      ".dash-panel--arrangement .dash-panel__label",
      ".dash-panel--settled .dash-panel__label",
      ".dash-panel--place .dash-panel__label",
    ]) {
      const idx = css.indexOf(`${selector} {`);
      expect(idx, `${selector} exists`).toBeGreaterThan(-1);
      expect(css.slice(idx, idx + 200), selector).toMatch(
        /color: var\(--(?:color-status-[a-z]+-ink|color-text-accent|color-text-secondary|sky-800|color-text-muted|color-figure)\);/,
      );
    }
  });
});

describe("the dashboard's own word budget (plan §12)", () => {
  it("stays inside 120 words of paragraph prose with no paragraph over 22 words", async () => {
    const html = await renderHome();
    const stats = measureProse(html.replace(/<details\b[\s\S]*?<\/details>/gi, " "));
    expect(stats.paragraphWords, `dashboard paragraph prose: ${stats.paragraphWords}`).toBeLessThanOrEqual(120);
    expect(
      stats.longest.words,
      `longest dashboard paragraph (${stats.longest.words}): "${stats.longest.text}"`,
    ).toBeLessThanOrEqual(22);
  });
});

describe("the Papers popup's states", () => {
  it("gives a complete receipt a private PDF route, never a public path", async () => {
    const snapshot = await getFamilySnapshot();
    const items = familyPaperPopupItems(snapshot!.recent_documents);
    const receipt = items.find((item) => item.typeLabel === "Receipt");
    expect(receipt, "the recorded receipt is listed").toBeTruthy();
    expect(receipt!.paper, "the receipt can be rendered").toBeTruthy();
    expect(receipt!.paper!.pdfHref).toMatch(/^\/api\/family\/papers\/receipt\//);
    expect(JSON.stringify(items)).not.toMatch(/\/api\/media\/|\/media\//);
  });

  it("renders the list, the sheet and the PDF / download / print actions", async () => {
    const snapshot = await getFamilySnapshot();
    const items = familyPaperPopupItems(snapshot!.recent_documents);
    const receipt = items.find((item) => item.typeLabel === "Receipt")!;
    const html = renderToStaticMarkup(
      createElement(PapersDialog, {
        open: true,
        onClose: () => {},
        items,
        initialKey: receipt.key,
      }),
    );
    expect(html).toContain("Your papers");
    expect(html).toContain("Official receipt");
    expect(html).toContain("Open PDF");
    expect(html).toContain("Download");
    expect(html).toContain("Print");
    expect(html).toContain("data-paper-sheet");
    expect(html).toContain(receipt.paper!.pdfHref);
  });

  it("keeps the honest state and the request path when there is no copy to open", async () => {
    const items = familyPaperPopupItems([
      { title: "Death certificate", status: "pending_review", kind: "other" },
    ]);
    const html = renderToStaticMarkup(
      createElement(PapersDialog, { open: true, onClose: () => {}, items }),
    );
    expect(html).toContain("Death certificate");
    expect(html).toContain("Ask for a copy");
    expect(html).not.toContain("data-paper-sheet");
  });

  it("designs the empty state for a family with no papers", async () => {
    const html = renderToStaticMarkup(
      createElement(PapersDialog, { open: true, onClose: () => {}, items: [] }),
    );
    expect(html).toContain("No papers yet");
    expect(html).toContain("0917 617 8489");
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
