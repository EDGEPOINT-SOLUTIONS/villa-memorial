import { describe, expect, it, vi } from "vitest";
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

vi.mock("next/navigation", () => ({
  usePathname: () => "/client/dashboard",
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
  return { ...actual, getFamilySnapshot: async () => snapshot as unknown as FamilySnapshot };
});

const { default: FamilyLayout } = await import("@/app/(family)/client/layout");
const { default: AgentLayout } = await import("@/app/(agent)/agent/layout");

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
