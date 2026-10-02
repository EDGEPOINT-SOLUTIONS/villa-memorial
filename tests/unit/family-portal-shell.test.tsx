import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import snapshot from "@/lib/fixtures/family/snapshot.json";
import type { FamilySnapshot } from "@/lib/api-client/family";

/**
 * The one-house-style contract: the family portal and the agent portal render
 * the SAME chrome (PortalFrame — sidebar, grouped rail, phone tabs), differing
 * only in their own destinations, words and data. Rendering both layouts in one
 * test makes a divergence impossible to ship quietly.
 */
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

const navState = vi.hoisted(() => ({ pathname: "/client/dashboard" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navState.pathname,
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "im_u"
        ? {
            name,
            value: Buffer.from(JSON.stringify({ email: "customer@vm.demo" }), "utf8").toString(
              "base64",
            ),
          }
        : undefined,
  }),
}));

vi.mock("@/lib/api-client/family", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client/family")>();
  const lovedOnes = (snapshot as unknown as { loved_ones: Array<Record<string, unknown>> }).loved_ones;
  const first = lovedOnes[0];
  const selected = {
    ...snapshot,
    loved_one: { name: first.name, life_dates: first.life_dates },
    plan_summary: first.plan_summary,
    balance: first.balance,
    balance_cents: first.balance_cents,
    payment_schedule: first.payment_schedule,
    recent_documents: first.recent_documents,
    person_id: first.id,
    household: lovedOnes.map((one) => ({ id: one.id, name: one.name, life_dates: one.life_dates })),
  };
  return { ...actual, getFamilySnapshot: async () => selected as unknown as FamilySnapshot };
});

const { default: FamilyLayout } = await import("@/app/(family)/client/layout");
const { default: AgentLayout } = await import("@/app/(agent)/agent/layout");

beforeEach(() => {
  navState.pathname = "/client/dashboard";
});

/** The hrefs the rail and the phone tabs mark as the current place. */
function activeHrefs(html: string): string[] {
  // The PortalSwitch (bottom of the sidebar) also marks the active *portal*, so the
  // match is scoped to the navigation blocks themselves.
  const segments = [
    html.slice(html.indexOf('class="portal-nav"'), html.indexOf('class="portal-sidebar__foot"')),
    html.slice(html.indexOf('class="portal-tabbar"'), html.indexOf('class="portal-drawer"')),
  ];
  const hrefs: string[] = [];
  for (const segment of segments) {
    for (const match of segment.matchAll(/<a[^>]*href="([^"]+)"[^>]*aria-current="page"/g)) {
      hrefs.push(match[1]);
    }
  }
  return hrefs;
}

describe("the family portal chrome is the agent portal chrome", () => {
  it("renders the same PortalFrame on both portals", async () => {
    const family = renderToStaticMarkup(await FamilyLayout({ children: createElement("p", null, "family") }));
    const agent = renderToStaticMarkup(await AgentLayout({ children: createElement("p", null, "agent") }));

    for (const html of [family, agent]) {
      expect(html).toContain('class="portal-frame"');
      expect(html).toContain('class="portal-sidebar"');
      expect(html).toContain('class="portal-nav"');
      expect(html).toContain('class="portal-tabbar"');
    }
    expect(family).toContain('data-portal="family"');
    expect(agent).toContain('data-portal="agent"');
  });

  it("keeps the family's own reading scope and phone Call button", async () => {
    const html = renderToStaticMarkup(await FamilyLayout({ children: createElement("p", null, "body") }));
    expect(html).toContain('class="fv-body"');
    expect(html).toContain('class="ag-page"');
    expect(html).toContain('class="portal-topbar__call"');
    expect(html).toContain("Dela Cruz family");
    expect(html).toContain("0917 617 8489");
  });

  it("shows the account owner's name and initials at the top right (D11)", async () => {
    const html = renderToStaticMarkup(await FamilyLayout({ children: createElement("p", null, "body") }));
    expect(html).toContain('class="portal-content__head"');
    expect(html).toContain('class="account-chip account-chip--desktop"');
    expect(html).toContain("Cory Customer");
    expect(html).toContain(">CC<");
    expect(html).toContain('aria-haspopup="menu"');
  });

  it("offers the persisted, keyboard-operable rail toggle (D4)", async () => {
    const html = renderToStaticMarkup(await FamilyLayout({ children: createElement("p", null, "body") }));
    expect(html).toContain('class="rail-toggle"');
    expect(html).toContain('aria-controls="portal-nav"');
    expect(html).toContain('id="portal-nav"');
    // The rail choice is applied before first paint, family chrome only.
    expect(html).toContain("fv-rail");
  });

  it("opts the agent portal into the shared chrome — account chip and rail toggle (plan PR3)", async () => {
    const html = renderToStaticMarkup(await AgentLayout({ children: createElement("p", null, "body") }));
    expect(html).toContain('class="account-chip account-chip--desktop"');
    expect(html).toContain('class="rail-toggle"');
    expect(html).toContain("fv-rail");
    // The chip carries the agent's identity from the office's agent record
    // (the mock cookie has no display name), so the frame reads like the family's.
    expect(html).toContain("Alex Agent");
    expect(html).toContain(">AA<");
    // The old account line is replaced by the shared account block (plan §7.6).
    expect(html).not.toContain('class="portal-sidebar__user"');
  });

  it("puts the family's own destinations in the shared rail", async () => {
    const html = renderToStaticMarkup(await FamilyLayout({ children: createElement("p", null, "body") }));
    for (const label of [
      "Home",
      "The funeral",
      "Papers",
      "Payments",
      "Your plan",
      "Privacy Center",
      "Your details",
    ]) {
      expect(html, `${label} missing from the family rail`).toContain(`>${label}</span>`);
    }
  });
});

describe("the rail follows the section, not the exact URL", () => {
  it("keeps Papers active while one receipt's own page is open", async () => {
    navState.pathname = "/client/documents/receipts/OR-2026-00412";
    const html = renderToStaticMarkup(await FamilyLayout({ children: createElement("p", null, "body") }));
    expect(new Set(activeHrefs(html))).toEqual(new Set(["/client/documents"]));
  });

  it("keeps the agent rail's section active on a client detail page too (same shared frame)", async () => {
    navState.pathname = "/agent/clients/00000000-0000-4000-8000-000000000001";
    const html = renderToStaticMarkup(await AgentLayout({ children: createElement("p", null, "body") }));
    expect(new Set(activeHrefs(html))).toEqual(new Set(["/agent/clients"]));
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
