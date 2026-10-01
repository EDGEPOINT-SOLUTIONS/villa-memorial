import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * The agent's own account screen (the counterpart of the family's "Your
 * details"). The identity is the OFFICE'S OWN AGENT RECORD — name, email and
 * office number — not the session and not an invented branch or phone. The
 * picture is the initials disc (there is no recorded agent picture), and the
 * change path is the office line read from lib/family/contact.ts.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/portal-guard", () => ({
  requirePortalSessionOrRedirect: async () => sessionHolder.current,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/agent/profile",
  useRouter: () => ({ replace: () => undefined, push: () => undefined }),
}));

const { default: AgentProfilePage } = await import("@/app/(agent)/agent/profile/page");

async function render(): Promise<string> {
  return renderToStaticMarkup(await AgentProfilePage());
}

describe("the agent profile", () => {
  it("names the agent from the office record, not the session", async () => {
    // The session says one thing; the office's agent record is the source.
    sessionHolder.current = {
      userId: "00000000-0000-4000-8000-000000000013",
      tenantId: "00000000-0000-4000-8000-000000000001",
      scopes: ["property:read"],
      email: "session@vm.demo",
      displayName: "Elena Villanueva",
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    };
    const html = await render();

    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    expect(html).toContain("Alex Agent");
    expect(html).toContain("agent@vm.demo");
    expect(html).not.toContain("Elena Villanueva");
  });

  it("shows only what the record holds — the office number, no invented fields", async () => {
    sessionHolder.current = {
      userId: "00000000-0000-4000-8000-000000000013",
      tenantId: "00000000-0000-4000-8000-000000000001",
      scopes: ["property:read"],
      email: "agent@vm.demo",
      displayName: "Alex Agent",
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    };
    const html = await render();

    expect(html).toContain("0917 617 8489");
    // Fields the record does not hold are never printed.
    expect(html).not.toMatch(/branch|licen[cs]e/i);
  });

  it("falls back to an honest initials disc — never a borrowed photograph", async () => {
    sessionHolder.current = {
      userId: "00000000-0000-4000-8000-000000000013",
      tenantId: "00000000-0000-4000-8000-000000000001",
      scopes: ["property:read"],
      email: "agent@vm.demo",
      displayName: "Alex Agent",
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    };
    const html = await render();

    expect(html).toContain('class="avatar"');
    expect(html).toContain('class="avatar__initials"');
    expect(html).toContain(">AA<");
    // No <img> anywhere: the page never borrows a client's or anyone's picture.
    expect(html).not.toContain("<img");
  });

  it("renders on the workbench grammar, not a bespoke hero", async () => {
    sessionHolder.current = {
      userId: "00000000-0000-4000-8000-000000000013",
      tenantId: "00000000-0000-4000-8000-000000000001",
      scopes: ["property:read"],
      email: "agent@vm.demo",
      displayName: "Alex Agent",
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    };
    const html = await render();

    // The dense workbench scope and its shells, so the page title is 25.6px and
    // the material is the agent portal's — never a one-off layout.
    expect(html).toContain('class="workbench wb-profile"');
    expect(html).toContain('class="wb-head__title"');
    expect(html).toContain("wb-panel");
    expect(html).toContain("wb-tools");
  });

  it("keeps the four working shortcuts", async () => {
    sessionHolder.current = {
      userId: "00000000-0000-4000-8000-000000000013",
      tenantId: "00000000-0000-4000-8000-000000000001",
      scopes: ["property:read"],
      email: "agent@vm.demo",
      displayName: "Alex Agent",
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    };
    const html = await render();

    for (const href of [
      "/agent/prospects",
      "/agent/appointments",
      "/agent/lots",
      "/agent/marketing",
    ]) {
      expect(html, `${href} missing from the profile shortcuts`).toContain(href);
    }
  });

  it("points every change at the office line", async () => {
    sessionHolder.current = {
      userId: "00000000-0000-4000-8000-000000000013",
      tenantId: "00000000-0000-4000-8000-000000000001",
      scopes: ["property:read"],
      email: "agent@vm.demo",
      displayName: "Alex Agent",
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    };
    const html = await render();

    expect(html).toContain("the office updates your record");
    expect(html).toContain('href="tel:+639176178489"');
    expect(html).toContain("0917 617 8489");
  });
});
