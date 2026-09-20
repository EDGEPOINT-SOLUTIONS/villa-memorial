import { describe, expect, it } from "vitest";
import { buildSession, parseAccessTokenClaims, portalClaimFromToken } from "@/lib/auth/session";
import {
  portalForSession,
  portalFromClaim,
  portalFromScopes,
  portalHomeFor,
  portalHomeForClaims,
  portalHomeForSession,
} from "@/lib/auth/destination";

/**
 * The optional v2 role/portal claim seam (platform-contract pre-wire, P5).
 *
 * The frozen jwt-claims-v1 carries no role/portal claim, so a v1 token must parse
 * exactly as before and the portal must still be inferred from scopes. When the
 * identity service starts issuing `portal` (or a portal-shaped `role`), the claim is
 * preferred — defensively: an unknown value is ignored, and a claim can never widen
 * access, only restore the scope-based fallback.
 */

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

const BASE = {
  sub: "00000000-0000-4000-8000-000000000012",
  tenant_id: "00000000-0000-4000-8000-000000000001",
  scopes: ["orders:read"],
  iat: NOW,
  exp: NOW + 900,
};

describe("parseAccessTokenClaims — optional v2 claims", () => {
  it("parses a v1 token byte-shape unchanged (no extra keys)", () => {
    expect(parseAccessTokenClaims(makeToken(BASE))).toEqual(BASE);
  });

  it("carries a portal and a role claim when the issuer sends them", () => {
    const withClaim = { ...BASE, portal: "family", role: "customer" };
    expect(parseAccessTokenClaims(makeToken(withClaim))).toEqual(withClaim);
  });

  it("ignores a non-string or empty claim instead of crashing", () => {
    expect(parseAccessTokenClaims(makeToken({ ...BASE, portal: 7 }))).toEqual(BASE);
    expect(parseAccessTokenClaims(makeToken({ ...BASE, portal: "  " }))).toEqual(BASE);
    expect(parseAccessTokenClaims(makeToken({ ...BASE, role: { name: "x" } }))).toEqual(BASE);
  });

  it("portalClaimFromToken reads only a valid token's portal", () => {
    expect(portalClaimFromToken(makeToken({ ...BASE, portal: "agent" }))).toBe("agent");
    expect(portalClaimFromToken(makeToken(BASE))).toBeUndefined();
    expect(portalClaimFromToken("garbage")).toBeUndefined();
  });
});

describe("buildSession — claim pass-through", () => {
  const user = { email: "a@b.demo", display_name: "A B" };

  it("omits the claims for a v1 token", () => {
    const session = buildSession(makeToken(BASE), user)!;
    expect(session).not.toHaveProperty("portal");
    expect(session).not.toHaveProperty("role");
  });

  it("passes the claims through when present", () => {
    const session = buildSession(makeToken({ ...BASE, portal: "agent", role: "sales" }), user)!;
    expect(session.portal).toBe("agent");
    expect(session.role).toBe("sales");
  });
});

describe("destination — claim first, scopes fallback", () => {
  it("maps only unambiguous portal words", () => {
    expect(portalFromClaim("staff")).toBe("staff");
    expect(portalFromClaim("Admin")).toBe("staff");
    expect(portalFromClaim("agent")).toBe("agent");
    expect(portalFromClaim("customer")).toBe("family");
    expect(portalFromClaim("sales_agent")).toBeNull();
    expect(portalFromClaim("")).toBeNull();
    expect(portalFromClaim(undefined)).toBeNull();
  });

  it("infers the v1 portal from scopes unchanged", () => {
    expect(portalFromScopes(["billing:read"])).toBe("staff");
    expect(portalFromScopes(["orders:read"])).toBe("agent");
    expect(portalFromScopes(["catalog:read"])).toBe("family");
  });

  it("prefers portal, then a portal-shaped role, then scopes", () => {
    expect(portalForSession({ scopes: ["billing:read"], portal: "family" })).toBe("family");
    expect(portalForSession({ scopes: ["billing:read"], role: "agent" })).toBe("agent");
    expect(portalForSession({ scopes: ["billing:read"] })).toBe("staff");
    expect(portalForSession({ scopes: ["orders:read"], portal: "not-a-portal" })).toBe("agent");
  });

  it("routes home through the claim when present", () => {
    expect(portalHomeForClaims(["billing:read"], "family")).toBe("/client/dashboard");
    expect(portalHomeForClaims(["catalog:read"], undefined)).toBe("/client/dashboard");
    expect(portalHomeForClaims(["catalog:read"], "staff")).toBe("/staff/dashboard");
    expect(portalHomeForSession({ scopes: ["orders:read"], portal: "agent" })).toBe(
      "/agent/dashboard",
    );
    // The v1 scope-only helper is unchanged.
    expect(portalHomeFor(["billing:read"])).toBe("/staff/dashboard");
    expect(portalHomeFor(["catalog:read"])).toBe("/client/dashboard");
  });
});
