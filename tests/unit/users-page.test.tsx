import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "@/lib/auth/types";
import { assertNoParagraphNesting } from "@/tests/helpers/paragraph-nesting";

/**
 * Users & roles (`/staff/users`, S30), rendered as the real page over the
 * recorded access-control fixture. What this pins:
 *
 *  · the permission model is legible — the four recorded roles, every
 *    permission in plain words, the raw frozen scope token beside it, and who
 *    holds each role;
 *  · the honest state is on the page: the missing provisioning API in one
 *    line, and NO form that cannot submit;
 *  · the durable guard — a session without `identity:users:manage` gets the
 *    graceful forbidden state;
 *  · house rules: one h1, no skipped heading level, no nested paragraphs,
 *    tokens/classes only.
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

describe("the permission model, answered at a glance", () => {
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
      "Staff portal",
      "Agent portal",
      "Family portal",
      "Seeded sign-in",
    ]) {
      expect(html, `missing ${text}`).toContain(text);
    }
  });

  it("prints every permission in plain words and keeps the frozen token", async () => {
    signIn(["identity:users:manage"]);
    const html = await render();
    expect(html).toContain("Add people and give them a role");
    expect(html).toContain("See funeral cases, stages and tasks");
    expect(html).toContain("Read the record of who changed what");
    // The raw token is the frozen vocabulary, printed beside the plain words.
    expect(html).toContain("identity:users:manage");
    expect(html).toContain("cases:read");
  });

  it("names the missing provisioning API and offers no form", async () => {
    signIn(["identity:users:manage"]);
    const html = await render();
    expect(html).toContain("User provisioning is not wired");
    expect(html).toContain(
      "identity-access signs people in, but it has no API to list, invite or assign roles.",
    );
    expect(html).toContain("No invitation can be sent from this screen");
    expect(html).not.toContain("<form");
    expect(html).not.toMatch(/<button\b/);
  });

  it("shows the invite path the office will use", async () => {
    signIn(["identity:users:manage"]);
    const html = await render();
    for (const step of ["Add the person", "Give them a role", "Send the invitation"]) {
      expect(html, `missing invite step ${step}`).toContain(step);
    }
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
