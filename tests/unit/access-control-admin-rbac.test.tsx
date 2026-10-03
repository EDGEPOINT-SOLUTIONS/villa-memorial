import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  loadRoleAccessState,
  saveRoleScopes,
  accessControlStorePath,
} from "@/lib/api-client/access-control";
import type { Session } from "@/lib/auth/types";

/**
 * RBAC gating for the Users & roles permission write:
 *  - POST /api/access-control/roles needs `identity:users:manage` and answers
 *    401/403 before touching the store; it reads the scope from the session
 *    cookie, never the body;
 *  - /staff/users renders the checkbox editor with the scope and the graceful
 *    ForbiddenState without it;
 *  - THE GATE MODEL IS UNCHANGED: a saved role edit changes the role RECORD and
 *    never a running session's scopes. Removing every scope from a role does not
 *    lock out a session that was issued the scope, and granting a scope to a role
 *    does not open the page to a session that was not.
 */

const cookieJar = vi.hoisted(() => ({ values: {} as Record<string, string> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieJar.values ? { name, value: cookieJar.values[name] } : undefined,
  }),
}));

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const route = await import("@/app/api/access-control/roles/route");
const { default: UsersPage } = await import("@/app/(staff)/staff/users/page");

const dir = mkdtempSync(path.join(os.tmpdir(), "villa-access-control-rbac-"));
process.env.ACCESS_CONTROL_STORE_PATH = path.join(dir, "access-control.json");

afterAll(() => {
  delete process.env.ACCESS_CONTROL_STORE_PATH;
  rmSync(dir, { recursive: true, force: true });
});

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function accessToken(scopes: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: "none", kid: "fixture" })}.${b64url({
    sub: USER_ID,
    tenant_id: TENANT_ID,
    scopes,
    iat: now,
    exp: now + 900,
  })}.fixture-not-signed`;
}

function signInAs(scopes: string[], displayName = "Sam Staff") {
  cookieJar.values.im_at = accessToken(scopes);
  cookieJar.values.im_u = Buffer.from(
    JSON.stringify({
      id: USER_ID,
      tenant_id: TENANT_ID,
      email: "sam.staff@vm.demo",
      display_name: displayName,
    }),
    "utf8",
  ).toString("base64");
}

function setSession(scopes: string[]) {
  sessionHolder.current = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    email: "sam.staff@vm.demo",
    displayName: "Sam Staff",
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

function post(body: unknown): Promise<Response> {
  return Promise.resolve(
    route.POST(
      new Request("http://localhost/api/access-control/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    ),
  );
}

beforeEach(() => {
  cookieJar.values = {};
  sessionHolder.current = null;
  rmSync(accessControlStorePath(), { force: true });
});

describe("/api/access-control/roles RBAC", () => {
  it("answers 401 without a session", async () => {
    const res = await post({ roles: [] });
    expect(res.status).toBe(401);
  });

  it("403s a session without identity:users:manage", async () => {
    signInAs(["catalog:read", "catalog:write"]);
    const res = await post({ roles: [{ key: "agent", scopes: ["catalog:read"] }] });
    expect(res.status).toBe(403);
    // Nothing was written.
    expect((await loadRoleAccessState()).updated_at).toBeNull();
  });

  it("refuses an invented scope with 422 and changes nothing", async () => {
    signInAs(["identity:users:manage"]);
    const res = await post({ roles: [{ key: "agent", scopes: ["made:up"] }] });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toMatch(/not one of the frozen/);
    expect((await loadRoleAccessState()).updated_at).toBeNull();
  });

  it("saves a valid set with identity:users:manage and the store serves it", async () => {
    signInAs(["identity:users:manage"]);
    const res = await post({ roles: [{ key: "agent", scopes: ["catalog:read", "cases:read"] }] });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      updated_by: string;
      roles: Array<{ key: string; scopes: string[] }>;
    };
    expect(body.ok).toBe(true);
    expect(body.updated_by).toBe("Sam Staff");
    const agent = await loadRoleAccessState().then(
      (state) => state.roles.find((role) => role.key === "agent")!,
    );
    expect(agent.scopes).toEqual(["catalog:read", "cases:read"]);
  });
});

describe("the gate model is unchanged by a saved role edit", () => {
  it("emptying a role does not lock out a session that holds its scopes", async () => {
    // Erase every administrator scope in the RECORD...
    await saveRoleScopes([{ key: "administrator", scopes: [] }], "Ada Admin");
    // ...and the admin session's issued scope still opens the page, because the
    // gate reads the session, not the record (rbac-scopes-v1 rule 1).
    setSession(["identity:users:manage"]);
    const html = renderToStaticMarkup(await UsersPage());
    expect(html).toContain("Roles and permissions");
    expect(html).not.toContain("have access to this area");
  });

  it("granting a role a scope does not open the page to a session without it", async () => {
    await saveRoleScopes(
      [{ key: "customer", scopes: ["catalog:read", "identity:users:manage"] }],
      "Ada Admin",
    );
    setSession(["catalog:read"]);
    const html = renderToStaticMarkup(await UsersPage());
    expect(html).toContain("have access to this area");
    expect(html).not.toContain("Save permissions");
  });
});

describe("/staff/users renders the checkbox editor or the graceful denial", () => {
  it("renders the editor with the gating scope", async () => {
    signInAs(["identity:users:manage"]);
    setSession(["identity:users:manage"]);
    const html = renderToStaticMarkup(await UsersPage());
    expect(html).toContain("Save permissions");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Sign-in gates keep using the identity provider");
  });

  it("denies a session without identity:users:manage", async () => {
    setSession(["cases:read"]);
    const html = renderToStaticMarkup(await UsersPage());
    expect(html).toContain("have access to this area");
    expect(html).not.toContain("Save permissions");
  });
});
