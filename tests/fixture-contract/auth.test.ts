import { describe, expect, it } from "vitest";
import personas from "@/lib/fixtures/auth/personas.json";
import { fixturePersonaHints, login, refresh } from "@/lib/api-client/fixture-auth";
import { ApiError } from "@/lib/api-client/api-error";
import { parseAccessTokenClaims } from "@/lib/auth/session";

/**
 * Fixture↔contract tests: recorded fixtures must keep matching the REAL
 * identity-access login response envelope (auth_controller.rb) and the frozen
 * jwt-claims-v1 shape. If either upstream changes shape, this test fails and
 * the fixture must be updated in the same PR chain — never hand-edited silent.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("auth fixtures mirror the live login contract", () => {
  it("personas match identity-access seeds (emails + tenant)", () => {
    const emails = personas.personas.map((p) => p.email);
    expect(emails).toEqual([
      "admin@vm.demo",
      "staff@vm.demo",
      "agent@vm.demo",
      "customer@vm.demo",
    ]);
    for (const p of personas.personas) {
      expect(p.user_id).toMatch(UUID_RE);
      expect(Array.isArray(p.scopes)).toBe(true);
    }
    // VM demo tenant from seeds.rb
    expect(personas.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("login returns the exact response envelope of POST /api/v1/auth/login", async () => {
    const result = await login("staff@vm.demo", personas.password);
    expect(Object.keys(result).sort()).toEqual([
      "accessToken",
      "expiresIn",
      "refreshToken",
      "user",
    ]);
    expect(Object.keys(result.user).sort()).toEqual([
      "display_name",
      "email",
      "id",
      "tenant_id",
    ]); // User#as_safe_json slice
    expect(result.expiresIn).toBe(900);
  });

  it("fixture tokens carry valid jwt-claims-v1 structure (unsigned by design)", async () => {
    const { accessToken } = await login("admin@vm.demo", personas.password);
    const claims = parseAccessTokenClaims(accessToken);
    expect(claims).not.toBeNull();
    expect(claims!.sub).toMatch(UUID_RE);
    expect(claims!.tenant_id).toBe(personas.tenant_id);
    expect(claims!.scopes).toContain("identity:users:manage");
    expect(accessToken.endsWith(".fixture-not-signed")).toBe(true);
  });

  it("rejects bad credentials with the uniform error shape semantics", async () => {
    // Regression: both clients MUST throw the SAME shared ApiError class,
    // otherwise BFF instanceof checks miss fixture-mode failures.
    await expect(login("staff@vm.demo", "wrong")).rejects.toBeInstanceOf(ApiError);
    await expect(login("staff@vm.demo", "wrong")).rejects.toMatchObject({
      status: 401,
      message: "invalid credentials", // exact string from auth_controller.rb
    });
    await expect(login("nobody@vm.demo", personas.password)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("refresh rotates within the persona family; unknown tokens rejected", async () => {
    const first = await login("agent@vm.demo", personas.password);
    const rotated = await refresh(first.refreshToken);
    expect(rotated.user.email).toBe("agent@vm.demo");
    await expect(refresh("bogus")).rejects.toMatchObject({ status: 401 });
  });

  it("hint list exposes no passwords or scopes", () => {
    for (const hint of fixturePersonaHints()) {
      expect(Object.keys(hint).sort()).toEqual(["display_name", "email"]);
    }
  });
});
