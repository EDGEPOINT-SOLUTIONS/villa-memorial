import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
import { assertNoParagraphNesting } from "@/tests/helpers/paragraph-nesting";

/**
 * Users & roles (`/staff/users`, S30), rendered as the real page over the
 * recorded access-control fixture. What this pins (captain, 2026-10-02: "we
 * should be able to check checkboxes for permissions"):
 *
 *  · each recorded role carries its frozen permission set as REAL checkboxes,
 *    grouped by module, with the boxes of the recorded scopes TICKED;
 *  · every account's own permission view uses the same checkbox groups,
 *    read-only (a person's scopes come from their role);
 *  · the honest state is on the page: user provisioning is still missing, and
 *    the missing invite API is named — but the role editor CAN now save;
 *  · the durable guard — a session without `identity:users:manage` gets the
 *    graceful forbidden state;
 *  · house rules: one h1, no skipped heading level, no nested paragraphs.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

const { default: UsersPage } = await import("@/app/(staff)/staff/users/page");

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function signIn(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

async function render(): Promise<string> {
  return renderToStaticMarkup(await UsersPage());
}

beforeEach(() => {
  sessionHolder.current = null;
});

describe("the permission checkboxes, answered at a glance", () => {
  it("is forbidden without the provisioning scope", async () => {
    signIn(["cases:read"]);
    const html = await render();
    expect(html).toContain("have access to this area");
    expect(html).not.toContain("Ada Admin");
  });

  it("lists the recorded accounts with their role and door", async () => {
    signIn(["identity:users:manage"]);
    const html = await render();
    for (const text of [
      "Ada Admin",
      "admin@vm.demo",
      "Sam Staff",
      "staff@vm.demo",
      "Alex Agent",
      "agent@vm.demo",
      "Cory Customer",
      "customer@vm.demo",
      "Administrator",
      "Sales agent",
      "Customer / family",
      "Admin portal",
      "Agent portal",
      "Family portal",
      "Seeded sign-in",
    ]) {
      expect(html, `missing ${text}`).toContain(text);
    }
  });

  it("renders one checkbox per frozen permission per role, grouped by module", async () => {
    signIn(["identity:users:manage"]);
    const html = await render();
    // A real checkbox, one for every role and every frozen scope.
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Identity &amp; access");
    expect(html).toContain("Catalog &amp; orders");
    expect(html).toContain("Cases &amp; operations");
    // The plain-words grant AND the frozen token ride the same box.
    expect(html).toContain("Add people and give them a role");
    expect(html).toContain("identity:users:manage");
    expect(html).toContain("See funeral cases, stages and tasks");
    expect(html).toContain("cases:read");
    expect(html).toContain("Read the record of who changed what");
    expect(html).toContain("audit:events:read");
  });

  it("ticks the recorded scopes and leaves the rest unticked", async () => {
    signIn(["identity:users:manage"]);
    const html = await render();
    // The administrator's own permissions are ticked (seed state); the agent
    // role does not carry the audit scope.
    const adminAudit = /id="role-administrator-audit-events-read"[^>]*checked/;
    const agentAudit = /id="role-agent-audit-events-read"[^>]*checked/;
    expect(html).toMatch(adminAudit);
    expect(html).not.toMatch(agentAudit);
    expect(html).toContain("Save permissions");
  });

  it("applies the same checkbox view to a person's own scopes, read-only", async () => {
    signIn(["identity:users:manage"]);
    const html = await render();
    // The person's grid is disabled — permissions come from the role.
    const userAdmin = /id="user-00000000-0000-4000-8000-000000000011-cases-read"[^>]*disabled/;
    expect(html).toMatch(userAdmin);
    expect(html).toContain("A person&#x27;s permissions come from their role");
  });

  it("names the missing provisioning and invite APIs", async () => {
    signIn(["identity:users:manage"]);
    const html = await render();
    expect(html).toContain("User provisioning is not wired");
    expect(html).toContain(
      "identity-access signs people in, but it has no API to list, invite or assign users.",
    );
    expect(html).toContain("No invitation can be sent from this screen");
    // The role editor IS a real save; only the invite form does not exist.
    expect(html).toContain("/staff/users/new");
  });

  it("states that sign-in gates are unchanged", async () => {
    signIn(["identity:users:manage"]);
    const html = await render();
    expect(html).toContain("Sign-in gates keep using the identity provider");
  });
});

describe("house rules", () => {
  it("keeps one h1 and never skips a heading level", async () => {
    signIn(["identity:users:manage"]);
    const html = await render();
    expect((html.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(
        levels[i] - levels[i - 1],
        `heading ${levels[i]} follows ${levels[i - 1]}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("never nests a paragraph inside another", async () => {
    signIn(["identity:users:manage"]);
    assertNoParagraphNesting(await render(), "/staff/users");
  });
});
