import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  accessControlStorePath,
  loadAccessControlRoster,
  loadRoleAccessState,
  saveRoleScopes,
  type RoleScopeUpdate,
} from "@/lib/api-client/access-control";
import { ApiError } from "@/lib/api-client/api-error";
import { SCOPE_VOCABULARY } from "@/lib/rbac/scope-vocabulary";

/**
 * The durable role-permission store behind the Users & roles checkboxes.
 *
 * It folds the read-only seed (`lib/fixtures/auth/access-control.json`) with an
 * append-only `role_scopes_set` journal. What this pins:
 *  · the empty journal IS the recorded seed;
 *  · a save is durable (the next read serves it) and keeps the role's identity
 *    and every account's door;
 *  · a set outside the frozen vocabulary, a duplicate, an unknown role or a
 *    repeated role is refused (422) and changes nothing;
 *  · a save that changes nothing writes nothing;
 *  · the stored order is the frozen contract's order.
 */

const dir = mkdtempSync(path.join(os.tmpdir(), "villa-access-control-store-"));
process.env.ACCESS_CONTROL_STORE_PATH = path.join(dir, "access-control.json");

afterAll(() => {
  delete process.env.ACCESS_CONTROL_STORE_PATH;
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  rmSync(accessControlStorePath(), { force: true });
});

async function scopesOf(key: string): Promise<string[]> {
  const { roles } = await loadRoleAccessState();
  return roles.find((role) => role.key === key)!.scopes;
}

async function expectRefused(updates: RoleScopeUpdate[], message: RegExp) {
  await expect(saveRoleScopes(updates, "Sam Staff")).rejects.toMatchObject({
    status: 422,
  });
  await expect(saveRoleScopes(updates, "Sam Staff")).rejects.toThrowError(message);
}

describe("the empty journal is the recorded seed", () => {
  it("folds to the four roles and no save stamp", async () => {
    const { roles, updated_at, updated_by } = await loadRoleAccessState();
    expect(roles.map((role) => role.key)).toEqual([
      "administrator",
      "staff",
      "agent",
      "customer",
    ]);
    expect(roles.find((role) => role.key === "administrator")!.scopes).toEqual(
      SCOPE_VOCABULARY.map((entry) => entry.scope),
    );
    expect(updated_at).toBeNull();
    expect(updated_by).toBeNull();
  });
});

describe("a permission set is saved durably", () => {
  it("adds a permission and serves it on the next read", async () => {
    const before = await scopesOf("agent");
    const state = await saveRoleScopes(
      [{ key: "agent", scopes: [...before, "cases:read"] }],
      "Sam Staff",
    );
    expect(state.updated_by).toBe("Sam Staff");
    expect(state.updated_at).toEqual(expect.any(String));
    expect(await scopesOf("agent")).toContain("cases:read");
    // An untouched role is unchanged.
    expect(await scopesOf("customer")).toEqual(["tenancy:modules:read", "catalog:read"]);
  });

  it("removes a permission", async () => {
    const before = await scopesOf("agent");
    await saveRoleScopes(
      [{ key: "agent", scopes: before.filter((scope) => scope !== "property:read") }],
      "Sam Staff",
    );
    expect(await scopesOf("agent")).not.toContain("property:read");
  });

  it("records the set in the frozen contract's order", async () => {
    await saveRoleScopes(
      [{ key: "agent", scopes: ["property:read", "orders:write", "catalog:read"] }],
      "Sam Staff",
    );
    expect(await scopesOf("agent")).toEqual(["catalog:read", "orders:write", "property:read"]);
  });

  it("writes nothing when the set is unchanged", async () => {
    const before = await scopesOf("agent");
    const first = await saveRoleScopes([{ key: "agent", scopes: before }], "Ada Admin");
    // A no-op save does not stamp a new time or actor.
    const second = await saveRoleScopes([{ key: "agent", scopes: before }], "Sam Staff");
    expect(second.updated_at).toBe(first.updated_at);
    expect(second.updated_by).toBe(first.updated_by);
  });
});

describe("a set outside the frozen vocabulary is refused", () => {
  it("refuses an invented scope and changes nothing", async () => {
    await expectRefused([{ key: "agent", scopes: ["made:up"] }], /not one of the frozen/);
    expect(await scopesOf("agent")).not.toContain("made:up");
  });

  it("refuses a duplicated scope", async () => {
    await expectRefused(
      [{ key: "agent", scopes: ["catalog:read", "catalog:read"] }],
      /ticked twice/,
    );
  });

  it("refuses an unknown role", async () => {
    await expectRefused([{ key: "made_up", scopes: ["catalog:read"] }], /unknown role/);
  });

  it("refuses the same role twice in one save", async () => {
    await expectRefused(
      [
        { key: "agent", scopes: ["catalog:read"] },
        { key: "agent", scopes: ["orders:read"] },
      ],
      /listed twice/,
    );
  });

  it("refuses a roles payload that is not a list", async () => {
    await expect(saveRoleScopes({ agent: ["catalog:read"] }, "Sam Staff")).rejects.toMatchObject({
      status: 422,
    });
  });
});

describe("the roster shows the saved record", () => {
  it("puts the edited scopes on the account's role and keeps its door", async () => {
    await saveRoleScopes([{ key: "agent", scopes: ["catalog:read"] }], "Sam Staff");
    const { accounts, updated_by } = await loadAccessControlRoster();
    const agent = accounts.find((account) => account.email === "agent@vm.demo")!;
    expect(agent.role.scopes).toEqual(["catalog:read"]);
    // The door is a recorded property, not a function of the editable set.
    expect(agent.portal_label).toBe("Agent portal");
    expect(updated_by).toBe("Sam Staff");
  });
});

describe("a corrupt journal fails loudly", () => {
  it("throws when an event carries an invented scope", async () => {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      accessControlStorePath(),
      JSON.stringify({
        version: 1,
        events: [
          {
            kind: "role_scopes_set",
            at: "2026-10-03T00:00:00.000Z",
            role_key: "agent",
            scopes: ["made:up"],
            actor: null,
          },
        ],
      }),
    );
    await expect(loadRoleAccessState()).rejects.toBeInstanceOf(ApiError);
  });
});
