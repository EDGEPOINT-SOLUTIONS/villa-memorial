import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseCss, readStyle, selectors, type CssRule } from "../helpers/css-rules";

/**
 * The agent portal's LIST surfaces answer on hover and keyboard focus
 * (captain, 2026-10-01: "boxes when hover should have a distinct hover effect
 * so they know that it is clickable").
 *
 * The dashboard got the affordance first (`tests/unit/dashboard-hover.test.tsx`,
 * `docs/08-delivery/dashboard-hover-design/`), and `/agent/clients` and
 * `/agent/applications` took it with the workbench rebuild
 * (`tests/unit/agent-screens-hover.test.tsx`). This gate closes the last screen
 * of the pair — `/agent/prospects` — and re-pins the ONE grammar both halves
 * answer by, so the portal cannot grow two hover rules. It holds two claims:
 *
 *   1. THE MARKUP — every box the two pages make clickable (a prospects row, a
 *      client row, a view or filter pill) carries the `.wb-clickable` modifier,
 *      and the still blocks around them (the panels, the header band, the search
 *      form, the note, the empty state, the board's drop cards) do not. No false
 *      affordance.
 *   2. THE RULE — the modifier answers on `:hover` AND on the keyboard with the
 *      dashboard's approved sky control wash, never a lift or a shadow; neither
 *      half is parked in a pointer media query; and no outline is re-declared,
 *      because the ring stays the one global `:focus-visible` in
 *      styles/base.css.
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
  }: { href?: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => ({ email: "agent@vm.demo", scopes: [] }),
}));

const { default: AgentProspectsPage } = await import("@/app/(agent)/agent/prospects/page");
const { default: AgentClientsPage } = await import("@/app/(agent)/agent/clients/page");

const CSS: CssRule[] = parseCss(readStyle("styles/components.css"));
const rulesWith = (selector: string) => CSS.filter((rule) => selectors(rule).includes(selector));
const ruleWith = (selector: string) => CSS.find((rule) => selectors(rule).includes(selector));
/** Compare the declarations, not the indentation: a rule that carries two
 *  selectors on separate lines reads differently but means the same thing. */
const declarations = (body: string) =>
  body
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("; ");

const renderProspects = async () =>
  renderToStaticMarkup(await AgentProspectsPage({ searchParams: Promise.resolve({}) }));
const renderClients = async () =>
  renderToStaticMarkup(await AgentClientsPage({ searchParams: Promise.resolve({}) }));

describe("every clickable box on the two list screens carries the affordance", () => {
  it("gives every prospects row the modifier, never the header row", async () => {
    const html = await renderProspects();

    // Each row links (the name) and carries its actions (Call / Text / Open), so
    // each row answers. The row is never itself an anchor.
    const rows = html.match(/<tr[^>]*>/g) ?? [];
    const bodyRows = rows.filter((r) => r.includes("wb-clickable"));
    expect(bodyRows.length, "no prospects row takes the affordance").toBeGreaterThan(0);
    expect(bodyRows.length, "a still header row took the affordance").toBe(rows.length - 1);
    expect(html).not.toMatch(/<a[^>]*class="wb-clickable/);
  });

  it("gives every view and filter pill on both screens the modifier", async () => {
    for (const html of [await renderProspects(), await renderClients()]) {
      const pills = html.match(/<a[^>]*class="ag-filter[^"]*"/g) ?? [];
      expect(pills.length, "no filter pills rendered").toBeGreaterThan(0);
      for (const pill of pills) expect(pill, "a pill does not answer").toMatch(/wb-clickable/);
    }
  });

  it("gives every client row the modifier too, so the pair reads as one rule", async () => {
    const html = await renderClients();

    const rows = html.match(/<tr[^>]*>/g) ?? [];
    const bodyRows = rows.filter((r) => r.includes("wb-clickable"));
    expect(bodyRows.length, "no client row takes the affordance").toBeGreaterThan(0);
    expect(bodyRows.length, "a still header row took the affordance").toBe(rows.length - 1);
  });
});

describe("a still block on those screens paints no affordance", () => {
  it("leaves the panels, the header, the search, the note and the empty state quiet", async () => {
    for (const html of [await renderProspects(), await renderClients()]) {
      // The workbench header and panels are containers, not links.
      expect(html).not.toMatch(/<header[^>]*class="[^"]*wb-clickable/);
      expect(html).not.toMatch(/<section[^>]*class="[^"]*wb-clickable/);
      // The search form and its own inputs are controls, not boxes.
      expect(html).not.toMatch(/<form[^>]*class="[^"]*wb-clickable/);
      // The honest note and the empty state carry no action of their own.
      expect(html).not.toMatch(/class="[^"]*wb-empty[^"]*wb-clickable/);
      expect(html).not.toMatch(/class="[^"]*wb-foot[^"]*wb-clickable/);
    }
  });

  it("keeps the affordance out of the base rules the other portals share", () => {
    // `.ag-work` is shared markup — the family portal's PortalRow renders it —
    // and the generic `.table tbody tr:hover td` wash is the product's, not the
    // agent portal's. The affordance is a modifier, so neither may grow a hover.
    const baseWork = ruleWith(".ag-work");
    expect(baseWork, "the base .ag-work rule exists").toBeDefined();
    expect(baseWork!.body).not.toMatch(/wb-clickable/);
    expect(
      CSS.find((rule) => selectors(rule).includes("tr.wb-clickable")),
      "the affordance is pasted onto the shared table row base",
    ).toBeUndefined();
  });

  it("leaves the still boxes the earlier guards name alone", () => {
    for (const cls of ["wb-panel", "wb-money", "stage-flow__seg"]) {
      for (const rule of rulesWith(`.${cls}`)) {
        expect(rule.body, `.${cls} grew the clickable affordance`).not.toMatch(/wb-clickable/);
      }
    }
  });
});

describe("the modifier answers on hover AND keyboard focus", () => {
  const BOX_HOVER = ".wb-clickable:not(.ag-filter):hover";
  const BOX_FOCUS = ".wb-clickable:not(.ag-filter):focus-within";
  const TR_HOVER = ".workbench .wb-table tbody tr.wb-clickable:hover";
  const TR_FOCUS = ".workbench .wb-table tbody tr.wb-clickable:focus-within";
  const PILL_HOVER = '.ag-filter.wb-clickable:hover:not([data-on="yes"])';
  const PILL_FOCUS = '.ag-filter.wb-clickable:focus-visible:not([data-on="yes"])';

  it("gives a box the dashboard's approved control wash, on both states", () => {
    const hover = ruleWith(BOX_HOVER);
    const focus = ruleWith(BOX_FOCUS);
    expect(hover, `${BOX_HOVER} has no rule`).toBeDefined();
    expect(focus, `${BOX_FOCUS} has no rule`).toBeDefined();
    // One declaration block carries both states, so the pointer treatment
    // cannot drift away from the keyboard treatment.
    expect(declarations(focus!.body)).toBe(declarations(hover!.body));
    expect(hover!.body).toMatch(/background:\s*var\(--sky-50\)/);
    expect(hover!.body).toMatch(/box-shadow:\s*inset 0 0 0 1px var\(--sky-200\)/);
  });

  it("gives a list row the same wash, on both states", () => {
    for (const selector of [TR_HOVER, TR_FOCUS]) {
      const rule = ruleWith(selector);
      expect(rule, `${selector} has no rule`).toBeDefined();
      expect(rule!.body).toMatch(/box-shadow:\s*inset 0 0 0 1px var\(--sky-200\)/);
    }
    // The collapsed-border table needs the ground on the cells too, or the
    // base `.table tbody tr:hover td` wash sits on top of the row's.
    for (const suffix of ["> td", "> th"]) {
      expect(ruleWith(`${TR_HOVER} ${suffix}`), "the row cells are not painted").toBeDefined();
      expect(ruleWith(`${TR_FOCUS} ${suffix}`), "the row cells are not painted").toBeDefined();
    }
  });

  it("steps a filter pill the way its chosen state already wears", () => {
    // The pill's selectors ride in two blocks — the shared wash with the rest of
    // the grammar, then the pill's own capsule step — so compare every focus
    // declaration against a hover declaration, never just the first hit.
    const hover = rulesWith(PILL_HOVER).map((rule) => declarations(rule.body));
    const focus = rulesWith(PILL_FOCUS).map((rule) => declarations(rule.body));
    expect(hover.length, "the filter pill has no hover rule").toBeGreaterThan(0);
    expect(focus.length, "the filter pill has no focus rule").toBe(focus.length);
    for (const declarations_ of focus) expect(hover).toContain(declarations_);
    expect(hover.join(" ")).toMatch(/background:\s*var\(--sky-50\)/);
    expect(hover.join(" ")).toMatch(/border-color:\s*var\(--sky-200\)/);
    // The chosen pill is excluded, so it never loses its selection under the
    // pointer — and on the prospects screen its chosen state IS this step.
    const chosen = ruleWith('.workbench .ag-filter[data-on="yes"]');
    expect(chosen, "the chosen chip still wears its own step").toBeDefined();
    expect(chosen!.body).toMatch(/background:\s*var\(--sky-50\)/);
  });

  it("gates nothing: the pointer half answers wherever the portal's other boxes do", () => {
    // The portal's one hover grammar is ungated everywhere — the dashboard's
    // boxes, `.kpi-card`, the product's `.table tbody tr:hover td` — and these
    // rows must not be the one surface that answers on a handset and not on a
    // desktop. Neither half may be parked inside a pointer media query.
    for (const selector of [BOX_HOVER, BOX_FOCUS, TR_HOVER, TR_FOCUS, PILL_HOVER, PILL_FOCUS]) {
      expect(ruleWith(selector)!.media, `${selector} is inside a media query`).toBeNull();
    }
    // A tap cannot leave the wash stuck either: the rows are not targets
    // themselves — no pointer cursor, no click handler — so the row leaves with
    // the link the tap followed.
    for (const rule of CSS.filter((r) => r.selector.includes("wb-clickable"))) {
      expect(rule.body, "the affordance invents a pointer cursor on a non-target").not.toMatch(
        /cursor:\s*pointer/,
      );
    }
  });
});

describe("the affordance obeys the portal's standing rules", () => {
  it("moves nothing and paints no shadow — a colour crossfade only", () => {
    for (const rule of CSS.filter((r) => r.selector.includes("wb-clickable"))) {
      expect(rule.body, "the affordance moves or lifts a box").not.toMatch(
        /transform|translate|box-shadow:\s*var\(--shadow/,
      );
    }
    const base = ruleWith(".wb-clickable");
    expect(base!.body, "the affordance does not crossfade").toMatch(/transition:/);
    // A colour-only transition is what the global reduced-motion rule can drop
    // to an instant step without taking the affordance with it.
    expect(base!.body).not.toMatch(/transform|filter|opacity/);
  });

  it("re-declares no outline and no type size of its own", () => {
    for (const rule of CSS.filter((r) => r.selector.includes("wb-clickable"))) {
      expect(rule.body, "a second focus ring").not.toMatch(/outline/);
      expect(rule.body, "the affordance restates a type size").not.toMatch(
        /font-size|line-height|letter-spacing/,
      );
    }
  });
});