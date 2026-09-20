import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import accessFile from "@/lib/fixtures/auth/access-control.json";
import personasFile from "@/lib/fixtures/auth/personas.json";
import { type AccessRole, unknownRoleScopes } from "@/lib/access-control";
import {
  ACCESS_CONTROL_NOT_WIRED,
  accessControlLiveModeEnabled,
  loadAccessControlRoster,
  readAccessRoles,
} from "@/lib/api-client/access-control";
import { ApiError } from "@/lib/api-client/api-error";
import { SCOPE_VOCABULARY, SCOPE_GROUPS, isFrozenScope } from "@/lib/rbac/scope-vocabulary";

/**
 * Users & roles fixture ↔ frozen vocabulary contract.
 *
 * The screen prints the permission model, so the thing that must never drift is
 * the model itself: every role's scope list must be EXACTLY the seeded persona's
 * (`auth/personas.json` ← identity-access seeds), and every token must be one of
 * the twenty-three frozen in `rbac-scopes-v1`. The role records are app-authored
 * (no role API exists) — these checks are what makes them a recording instead of
 * an invention.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CONTRACT = path.join(ROOT, "docs", "08-delivery", "contracts", "rbac-scopes-v1.md");
const SCOPE_TOKEN_RE = /^[a-z][a-z-]*(?::[a-z][a-z-]*)+$/;

function frozenVocabulary(): Set<string> {
  const md = readFileSync(CONTRACT, "utf8");
  const section = md.split("## Frozen vocabulary")[1]?.split("## Rules")[0] ?? "";
  return new Set(
    [...section.matchAll(/`([^`]+)`/g)]
      .map((match) => match[1].trim())
      .filter((token) => SCOPE_TOKEN_RE.test(token)),
  );
}

const personasByEmail = new Map(personasFile.personas.map((persona) => [persona.email, persona]));

describe("the scope vocabulary covers the frozen contract exactly", () => {
  it("names every frozen scope and no other", () => {
    const contract = frozenVocabulary();
    const printed = SCOPE_VOCABULARY.map((entry) => entry.scope);
    expect([...printed].sort()).toEqual([...contract].sort());
    expect(contract.size).toBeGreaterThanOrEqual(23);
  });

  it("gives every scope a plain-words grant and groups every scope once", () => {
    for (const entry of SCOPE_VOCABULARY) {
      expect(entry.grant.trim().length, `${entry.scope} has no grant`).toBeGreaterThan(0);
    }
    const grouped = SCOPE_GROUPS.flatMap((group) => group.entries.map((entry) => entry.scope));
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(isFrozenScope("identity:users:manage")).toBe(true);
    expect(isFrozenScope("made:up")).toBe(false);
  });
});

describe("the recorded roles are the seeded personas, restated", () => {
  it("every role's scope list is EXACTLY its persona's, in the same order", () => {
    const roles = accessFile.roles as AccessRole[];
    for (const role of roles) {
      expect(role.holder_emails.length).toBeGreaterThan(0);
      for (const email of role.holder_emails) {
        const persona = personasByEmail.get(email);
        expect(persona, `${role.key} holds unknown persona ${email}`).toBeTruthy();
        expect(role.scopes, `${role.key} ≠ ${email}`).toEqual(persona!.scopes);
      }
    }
  });

  it("holds every seeded persona exactly once", () => {
    const held = accessFile.roles.flatMap((role) => role.holder_emails);
    expect(held.sort()).toEqual(personasFile.personas.map((persona) => persona.email).sort());
    expect(new Set(held).size).toBe(held.length);
  });

  it("carries no scope outside the frozen vocabulary", () => {
    for (const role of accessFile.roles as AccessRole[]) {
      expect(unknownRoleScopes(role), `${role.key} carries an invented scope`).toEqual([]);
    }
  });

  it("refuses a role carrying an invented scope (the reader is the gate)", () => {
    expect(() =>
      readAccessRoles({
        roles: [
          {
            key: "made_up",
            label: "Made up",
            detail: "Not a real role.",
            holder_emails: ["someone@example.com"],
            scopes: ["made:up"],
          },
        ],
      }),
    ).toThrowError(ApiError);
  });

  it("never claims a live mode", () => {
    expect(accessControlLiveModeEnabled()).toBe(false);
    expect(ACCESS_CONTROL_NOT_WIRED.length).toBeGreaterThan(0);
  });
});

describe("the composed roster", () => {
  it("joins the four seeded accounts to their roles and doors", async () => {
    const { roles, accounts } = await loadAccessControlRoster();
    expect(roles.map((role) => role.key)).toEqual(["administrator", "staff", "agent", "customer"]);
    expect(accounts.map((account) => account.email)).toEqual([
      "admin@vm.demo",
      "staff@vm.demo",
      "agent@vm.demo",
      "customer@vm.demo",
    ]);

    const byEmail = new Map(accounts.map((account) => [account.email, account]));
    expect(byEmail.get("admin@vm.demo")!.role.key).toBe("administrator");
    expect(byEmail.get("admin@vm.demo")!.portal_label).toBe("Admin portal");
    expect(byEmail.get("agent@vm.demo")!.portal_label).toBe("Agent portal");
    expect(byEmail.get("customer@vm.demo")!.portal_label).toBe("Family portal");
  });

  it("keeps the administrator at the top of the ladder", async () => {
    const { roles } = await loadAccessControlRoster();
    const admin = roles.find((role) => role.key === "administrator")!;
    expect(admin.scopes.length).toBe(SCOPE_VOCABULARY.length);
    expect(admin.scopes).toEqual(SCOPE_VOCABULARY.map((entry) => entry.scope));
  });
});
