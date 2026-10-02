import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseCss, readStyle, selectors, type CssRule } from "../helpers/css-rules";

/**
 * The remaining agent screens answer on hover AND on keyboard focus (captain,
 * 2026-10-02: rebuild applications, clients and marketing on the workbench
 * grammar).
 *
 * The dashboard's boxes got the affordance first
 * (`docs/08-delivery/dashboard-hover-design/`). This gate covers the second
 * half: every clickable row, card and filter pill on `/agent/applications`,
 * `/agent/clients` and `/agent/marketing` answers by the SAME one grammar.
 *
 *   1. THE MARKUP — every application row, client row, material card and filter
 *      pill carries the `.wb-clickable` modifier; the still blocks around them
 *      (the header band, the panels, the search form, the notes, the empty
 *      state) do not. No false affordance.
 *   2. THE RULE — the modifier answers on `:hover` AND on the keyboard with the
 *      dashboard's approved sky control wash, never a lift or a shadow; no
 *      second outline is declared, because the ring is the one global
 *      `:focus-visible` in styles/base.css.
 *
 * Declaration-level on purpose: vitest runs in `node`, so nothing in the suite
 * can measure a real hover. The assertions name the exact selectors, so a class
 * rename or a dropped focus rule fails by name.
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

const { default: AgentApplicationsPage } = await import("@/app/(agent)/agent/applications/page");
const { default: AgentClientsPage } = await import("@/app/(agent)/agent/clients/page");
const { default: AgentMarketingPage } = await import("@/app/(agent)/agent/marketing/page");

const CSS: CssRule[] = parseCss(readStyle("styles/components.css"));
const rulesWith = (selector: string) => CSS.filter((rule) => selectors(rule).includes(selector));
const ruleWith = (selector: string) => CSS.find((rule) => selectors(rule).includes(selector));
const declarations = (body: string) =>
  body
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("; ");

const renderApplications = async () => renderToStaticMarkup(await AgentApplicationsPage());
const renderClients = async () =>
  renderToStaticMarkup(await AgentClientsPage({ searchParams: Promise.resolve({}) }));
const renderMarketing = async () => renderToStaticMarkup(await AgentMarketingPage());

describe("every clickable box on the three screens carries the affordance", () => {
  it("gives every application and client row the modifier, never to the header row", async () => {
    for (const html of [await renderApplications(), await renderClients()]) {
      const rows = html.match(/<tr[^>]*>/g) ?? [];
      const bodyRows = rows.filter((r) => r.includes("wb-clickable"));
      expect(bodyRows.length, "no row takes the affordance").toBeGreaterThan(0);
      expect(bodyRows.length).toBe(rows.length - 1); // the one <tr> is the header
      expect(html).not.toMatch(/<a[^>]*class="wb-clickable/);
    }
  });

  it("gives every filter pill and every material card the modifier", async () => {
    const clients = await renderClients();
    const pills = clients.match(/<a[^>]*class="ag-filter[^"]*"/g) ?? [];
    expect(pills.length, "no filter pills rendered").toBeGreaterThan(0);
    for (const pill of pills) expect(pill).toMatch(/wb-clickable/);

    const marketing = await renderMarketing();
    const cards = marketing.match(/<article[^>]*class="wb-material[^"]*"/g) ?? [];
    expect(cards.length, "no material cards rendered").toBe(6);
    for (const card of cards) expect(card).toMatch(/wb-clickable/);
  });

  it("leaves the still blocks quiet — the header, panels, search and notes", async () => {
    for (const html of [await renderApplications(), await renderClients(), await renderMarketing()]) {
      expect(html).not.toMatch(/<header[^>]*class="[^"]*wb-clickable/);
      expect(html).not.toMatch(/<section[^>]*class="[^"]*wb-clickable/);
      expect(html).not.toMatch(/<form[^>]*class="[^"]*wb-clickable/);
      expect(html).not.toMatch(/class="[^"]*wb-empty[^"]*wb-clickable/);
      expect(html).not.toMatch(/class="[^"]*wb-foot[^"]*wb-clickable/);
    }
  });

  it("keeps the affordance out of the base rules the other portals share", () => {
    const baseWork = ruleWith(".ag-work");
    expect(baseWork, "the base .ag-work rule exists").toBeDefined();
    expect(baseWork!.body).not.toMatch(/wb-clickable/);
    expect(ruleWith("tr.wb-clickable")).toBeUndefined();
  });
});

describe("the modifier answers on hover AND keyboard focus", () => {
  const ROW_HOVER = ".wb-clickable:not(.ag-filter):hover";
  const ROW_FOCUS = ".wb-clickable:not(.ag-filter):focus-within";
  const TR_HOVER = ".workbench .wb-table tbody tr.wb-clickable:hover";
  const TR_FOCUS = ".workbench .wb-table tbody tr.wb-clickable:focus-within";

  it("gives a box the dashboard's approved control wash, on both states", () => {
    const hover = ruleWith(ROW_HOVER);
    const focus = ruleWith(ROW_FOCUS);
    expect(hover, `${ROW_HOVER} has no rule`).toBeDefined();
    expect(focus, `${ROW_FOCUS} has no rule`).toBeDefined();
    // One declaration block carries both states, so the hover treatment cannot
    // drift away from the keyboard treatment.
    expect(declarations(focus!.body)).toBe(declarations(hover!.body));
    expect(hover!.body).toMatch(/background:\s*var\(--sky-50\)/);
    expect(hover!.body).toMatch(/box-shadow:\s*inset 0 0 0 1px var\(--sky-200\)/);
  });

  it("gives a table row the same wash, on both states, and paints its cells", () => {
    for (const selector of [TR_HOVER, TR_FOCUS]) {
      const rule = ruleWith(selector);
      expect(rule, `${selector} has no rule`).toBeDefined();
      expect(rule!.body).toMatch(/background:\s*var\(--sky-50\)/);
      expect(rule!.body).toMatch(/box-shadow:\s*inset 0 0 0 1px var\(--sky-200\)/);
    }
    // The collapsed-border table needs the ground on the cells too, or the base
    // `.table tbody tr:hover td` wash sits on top of the row's.
    for (const suffix of ["> td", "> th"]) {
      expect(ruleWith(`${TR_HOVER} ${suffix}`), `the row cells are not painted`).toBeDefined();
      expect(ruleWith(`${TR_FOCUS} ${suffix}`), `the row cells are not painted`).toBeDefined();
    }
  });

  it("steps a filter pill the way its chosen state already wears", () => {
    const hover = ruleWith(".ag-filter.wb-clickable:hover:not([data-on=\"yes\"])");
    const focus = ruleWith(".ag-filter.wb-clickable:focus-visible:not([data-on=\"yes\"])");
    expect(hover, "the filter pill has no hover rule").toBeDefined();
    expect(focus, "the filter pill has no focus rule").toBeDefined();
    expect(declarations(focus!.body)).toBe(declarations(hover!.body));
    expect(hover!.body).toMatch(/background:\s*var\(--sky-50\)/);
    // The chosen pill is excluded, so it never loses its selection under the pointer.
    const chosen = ruleWith(".workbench .ag-filter[data-on=\"yes\"]");
    expect(chosen, "the chosen chip still wears its own step").toBeDefined();
    expect(chosen!.body).toMatch(/background:\s*var\(--sky-50\)/);
  });
});

describe("the affordance obeys the portal's standing rules", () => {
  it("moves nothing and paints no shadow — a colour crossfade only", () => {
    for (const rule of rulesWith(".wb-clickable")) {
      expect(rule.body, "the affordance moves or lifts a box").not.toMatch(
        /transform|translate|box-shadow:\s*var\(--shadow/,
      );
    }
    const base = ruleWith(".wb-clickable");
    expect(base!.body).toMatch(/transition:/);
    expect(base!.body).not.toMatch(/transform|filter|opacity/);
  });

  it("gates nothing and invents no pointer cursor on a non-target", () => {
    for (const selector of [
      ".wb-clickable:not(.ag-filter):hover",
      ".wb-clickable:not(.ag-filter):focus-within",
      ".workbench .wb-table tbody tr.wb-clickable:hover",
      ".workbench .wb-table tbody tr.wb-clickable:focus-within",
    ]) {
      expect(ruleWith(selector)!.media, `${selector} is inside a media query`).toBeNull();
    }
    for (const rule of rulesWith(".wb-clickable")) {
      expect(rule.body, "the affordance invents a pointer cursor").not.toMatch(/cursor:\s*pointer/);
      expect(rule.body, "a second focus ring").not.toMatch(/outline/);
      expect(rule.body, "the affordance restates a type size").not.toMatch(
        /font-size|line-height|letter-spacing/,
      );
    }
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
