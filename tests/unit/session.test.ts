import { describe, expect, it } from "vitest";
import {
  buildSession,
  isExpired,
  parseAccessTokenClaims,
} from "@/lib/auth/session";

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const NOW = 1_800_000_000;

function makeToken(claims: Record<string, unknown>): string {
  return `${b64url({ alg: "RS256", kid: "k1" })}.${b64url(claims)}.sig`;
}

const VALID_CLAIMS = {
  sub: "00000000-0000-4000-8000-000000000012",
  tenant_id: "00000000-0000-4000-8000-000000000001",
  scopes: ["catalog:read", "orders:read"],
  iat: NOW,
  exp: NOW + 900,
};

describe("parseAccessTokenClaims", () => {
  it("accepts a well-formed claims payload per jwt-claims-v1", () => {
    const claims = parseAccessTokenClaims(makeToken(VALID_CLAIMS));
    expect(claims).toEqual(VALID_CLAIMS);
  });

  it("returns null for undefined / malformed tokens (logged-out, not crash)", () => {
    expect(parseAccessTokenClaims(undefined)).toBeNull();
    expect(parseAccessTokenClaims("")).toBeNull();
    expect(parseAccessTokenClaims("not-a-jwt")).toBeNull();
    expect(parseAccessTokenClaims("a.b")).toBeNull();
  });

  it("returns null for non-JSON or wrong-typed payloads", () => {
    const garbage = `hdr.${Buffer.from("{oops").toString("base64url")}.sig`;
    expect(parseAccessTokenClaims(garbage)).toBeNull();
    expect(parseAccessTokenClaims(b64url({ sub: 1 }))).toBeNull();
  });

  it("rejects missing tenant claim (fail closed)", () => {
    const withoutTenant = { ...VALID_CLAIMS } as Record<string, unknown>;
    delete withoutTenant.tenant_id;
    expect(parseAccessTokenClaims(makeToken(withoutTenant))).toBeNull();
  });

  it("rejects bad scope shapes and empty scope strings", () => {
    expect(
      parseAccessTokenClaims(makeToken({ ...VALID_CLAIMS, scopes: [1] })),
    ).toBeNull();
    expect(
      parseAccessTokenClaims(makeToken({ ...VALID_CLAIMS, scopes: [""] })),
    ).toBeNull();
    expect(
      parseAccessTokenClaims(makeToken({ ...VALID_CLAIMS, scopes: "catalog:read" })),
    ).toBeNull();
  });

  it("rejects non-uuid subject and exp <= iat", () => {
    expect(
      parseAccessTokenClaims(makeToken({ ...VALID_CLAIMS, sub: "not-a-uuid" })),
    ).toBeNull();
    expect(
      parseAccessTokenClaims(makeToken({ ...VALID_CLAIMS, exp: NOW })),
    ).toBeNull();
  });
});

describe("isExpired", () => {
  it("flags expired with small clock skew tolerance", () => {
    const claims = parseAccessTokenClaims(makeToken(VALID_CLAIMS))!;
    expect(isExpired(claims, NOW + 900)).toBe(true);
    expect(isExpired(claims, NOW + 895)).toBe(true); // exactly at skew edge
    expect(isExpired(claims, NOW + 894)).toBe(false); // one second of life left
    expect(isExpired(claims, NOW + 100)).toBe(false);
  });
});

describe("buildSession", () => {
  const user = {
    id: VALID_CLAIMS.sub,
    tenant_id: VALID_CLAIMS.tenant_id,
    email: "staff@vm.demo",
    display_name: "Sam Staff",
  };

  it("builds a session from valid token + user view", () => {
    const session = buildSession(makeToken(VALID_CLAIMS), user);
    expect(session).toMatchObject({
      userId: VALID_CLAIMS.sub,
      tenantId: VALID_CLAIMS.tenant_id,
      scopes: VALID_CLAIMS.scopes,
      email: "staff@vm.demo",
      displayName: "Sam Staff",
    });
    expect(session!.expiresAt).toBe(new Date((NOW + 900) * 1000).toISOString());
  });

  it("returns null when token is invalid or user view is corrupt", () => {
    expect(buildSession(undefined, user)).toBeNull();
    expect(buildSession("garbage", user)).toBeNull();
    expect(buildSession(makeToken(VALID_CLAIMS), null)).toBeNull();
    expect(buildSession(makeToken(VALID_CLAIMS), { email: 1 })).toBeNull();
  });
});
