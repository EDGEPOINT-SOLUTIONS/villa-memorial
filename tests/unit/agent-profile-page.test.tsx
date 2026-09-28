import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";

/**
 * The agent's own account screen (the counterpart of the family's "Your
 * details"). It names the agent from the SESSION and never invents a field the
 * office's agent record would own — name/branch/phone are "ask the office".
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

describe("the agent profile", () => {
  it("names the agent and shows the sign-in email", async () => {
    sessionHolder.current = {
      userId: "00000000-0000-4000-8000-000000000013",
      tenantId: "00000000-0000-4000-8000-000000000001",
      scopes: ["cases:read"],
      email: "agent@vm.demo",
      displayName: "Elena Villanueva",
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    };
    const html = renderToStaticMarkup(await AgentProfilePage());

    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    expect(html).toContain("Elena Villanueva");
    expect(html).toContain("agent@vm.demo");
    // The working shortcuts are real routes.
    expect(html).toContain("/agent/prospects");
    expect(html).toContain("/agent/appointments");
    // The screen says where to change the rest rather than inventing fields.
    expect(html).toContain("tell the office");
  });
});
