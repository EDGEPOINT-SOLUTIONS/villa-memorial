import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseCss, readStyle, selectors } from "../helpers/css-rules";

/**
 * The dashboard's clickable boxes — the captain's 2026-10-01 note: "in
 * dashboard, boxes when hover should have a distinct hover effect so they know
 * that it is clickable."
 *
 * This guard renders the REAL workbench and pairs it with a declaration-level
 * read of the stylesheet (vitest runs in `node`, so it cannot measure a real
 * hover). It pins the two halves of the contract:
 *
 *   1. every box the page makes clickable IS a link, and every box that only
 *      carries content is NOT one — no false affordance; and
 *   2. every clickable box answers on `:hover` AND `:focus-visible` with the
 *      approved sky control wash, while the static boxes paint no hover at all.
 *
 * The stylesheet is the product's shared sheet; the assertions name the exact
 * selectors, so a class rename or a dropped focus-visible rule fails by name.
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

const CSS = parseCss(readStyle("styles/components.css"));

const count = (html: string, needle: string) => html.split(needle).length - 1;
const rulesWith = (selector: string) => CSS.filter((rule) => selectors(rule).includes(selector));
const ruleWith = (selector: string) => CSS.find((rule) => selectors(rule).includes(selector));

const render = async () => renderToStaticMarkup(await AgentTodayPage());

describe("the dashboard's clickable boxes are links", () => {
  it("makes the brief lead, every vital entry, the tools and the open actions anchors", async () => {
    const html = await render();

    // The brief band's one dominant figure links to the pipeline.
    const briefLead = html.match(/<a[^>]*class="wb-brief__lead"[^>]*>/)?.[0];
    expect(briefLead, "the brief lead is not a link").toBeDefined();
    expect(briefLead).toContain('href="/agent/prospects"');

    // Every vitals ribbon entry is a link (eight recorded + the device queue),
    // and no `.wb-vital` is rendered on a non-anchor element.
    const vitalAnchors = (html.match(/<a[^>]*class="wb-vital"/g) ?? []).length;
    expect(vitalAnchors, "no vitals ribbon links").toBeGreaterThanOrEqual(9);
    expect(count(html, 'class="wb-vital"')).toBe(vitalAnchors);

    // The tool tiles and the panel/flow open actions are links too.
    expect((html.match(/<a[^>]*class="wb-tool"/g) ?? []).length).toBe(4);
    expect(html).toMatch(/<a[^>]*class="[^"]*wb-panel__open/);
    expect((html.match(/<a[^>]*class="wb-panel__more"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect((html.match(/<a[^>]*class="wb-flow__more"/g) ?? []).length).toBe(1);
  });

  it("does not put a link class on a box that only carries content", async () => {
    const html = await render();

    // The stage-flow is a list of counts, not seven links.
    expect(count(html, 'class="stage-flow__seg"')).toBe(7);
    expect(html).not.toMatch(/<a[^>]*class="stage-flow__seg"/);

    // The panels, the analytics band and the brief band are sections.
    expect(html).not.toMatch(/<a[^>]*class="wb-panel"/);
    expect(html).not.toMatch(/<a[^>]*class="wb-analytics"/);
    expect(html).not.toMatch(/<a[^>]*class="wb-brief"/);
    expect(html).toContain('<section class="wb-analytics"');
  });
});

describe("a clickable box answers on hover AND keyboard focus", () => {
  // The boxes the page makes clickable. The panel/flow open actions are text
  // links, so they only earn the strengthened underline (asserted below).
  const BOXES = ["wb-brief__lead", "wb-vital", "wb-tool"];

  it("gives every box the same hover and focus-visible declaration block", () => {
    for (const cls of BOXES) {
      const hover = ruleWith(`.${cls}:hover`);
      const focus = ruleWith(`.${cls}:focus-visible`);
      expect(hover, `.${cls} has no :hover rule`).toBeDefined();
      expect(focus, `.${cls} has no :focus-visible rule`).toBeDefined();
      // One rule carries both states, so a hover treatment cannot drift from
      // its keyboard treatment.
      expect(focus!.body).toBe(hover!.body);
      // The approved control wash from the material model — never a raw colour.
      expect(hover!.body).toMatch(/background:\s*var\(--sky-50\)/);
      expect(hover!.body).toMatch(/var\(--sky-200\)|var\(--shadow-card-hover\)/);
    }
  });

  it("keeps the keyboard parity inside the reduced-motion contract", () => {
    // The tool tile's lift is a motion; the reduced-motion block must drop it
    // for BOTH the pointer and the keyboard rather than only the pointer.
    const reduced = CSS.find(
      (rule) =>
        rule.media !== null &&
        /prefers-reduced-motion/.test(rule.media) &&
        selectors(rule).includes(".wb-tool:focus-visible"),
    );
    expect(reduced, "the reduced-motion block still ignores :focus-visible").toBeDefined();
    expect(reduced!.body).toMatch(/box-shadow:\s*none/);
  });

  it("strengthens the panel and flow open actions rather than leaving a bare link", () => {
    for (const cls of ["wb-panel__more", "wb-flow__more"]) {
      const hover = ruleWith(`.${cls}:hover`);
      const focus = ruleWith(`.${cls}:focus-visible`);
      expect(hover, `.${cls} has no :hover rule`).toBeDefined();
      expect(focus, `.${cls} has no :focus-visible rule`).toBeDefined();
      expect(hover!.body).toMatch(/text-decoration-color:\s*var\(--sky-500\)/);
    }
  });
});

describe("a box that does not link paints no hover affordance", () => {
  // The still boxes on the page — the brief band itself, the panels, the
  // analytics band, the attention rows, the stage-flow segments. None is a
  // link, so none may answer like one.
  const STILL = ["wb-brief", "wb-panel", "wb-analytics", "stage-flow__seg", "wb-alert", "wb-money"];

  it("has no hover rule that paints an interactive ground on a still box", () => {
    for (const cls of STILL) {
      const offenders = rulesWith(`.${cls}:hover`);
      for (const rule of offenders) {
        expect(
          rule.body,
          `.${cls}:hover is a false affordance (paints a ground or cursor)`,
        ).not.toMatch(/background|box-shadow|cursor:\s*pointer/);
      }
    }
  });
});
