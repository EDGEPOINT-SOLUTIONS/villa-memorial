import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * The three rebuilt agent screens carry their empty states (repo AGENTS.md: every
 * async screen has an error/empty/loading state before merge; the approved plan
 * §4 names each one). The fixture is never empty, so this guard stubs the reads
 * to the empty record and asserts the calm state with its way forward — not a
 * blank panel and not a fabricated row.
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

vi.mock("@/lib/api-client/agent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client/agent")>();
  return {
    ...actual,
    listAgentApplications: async () => [],
    listAgentClients: async () => [],
    listAgentMaterials: async () => [],
  };
});

const { default: AgentApplicationsPage } = await import("@/app/(agent)/agent/applications/page");
const { default: AgentClientsPage } = await import("@/app/(agent)/agent/clients/page");
const { default: AgentMarketingPage } = await import("@/app/(agent)/agent/marketing/page");

describe("the rebuilt agent screens' empty states", () => {
  it("says there are no applications in flight", async () => {
    const html = renderToStaticMarkup(await AgentApplicationsPage());
    expect(html).toContain("No applications in flight.");
    expect(html).toContain("wb-empty");
    // The heading still answers honestly.
    expect(html).toContain("0 in flight");
  });

  it("offers the pipeline when the client book is empty", async () => {
    const html = renderToStaticMarkup(await AgentClientsPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("No clients yet.");
    expect(html).toContain('href="/agent/prospects"');
  });

  it("says no material is published yet", async () => {
    const html = renderToStaticMarkup(await AgentMarketingPage());
    expect(html).toContain("No material is published yet.");
    expect(html).toContain("wb-empty");
  });
});
