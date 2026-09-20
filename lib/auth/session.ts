/**
 * Session primitives for the BFF (server-side only).
 *
 * Rules (web/AGENTS.md):
 * - Access/refresh tokens live ONLY in httpOnly cookies managed by BFF routes.
 * - JWT payloads are parsed DEFENSIVELY: unknown shape → logged-out, not a crash.
 * - The BFF does not verify signatures — the edge gateway and services do that.
 *   Here we only validate structure to decide what the UI may render.
 */
import type { Session } from "@/lib/auth/types";

export const ACCESS_COOKIE = "im_at";
export const REFRESH_COOKIE = "im_rt";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function base64UrlDecode(segment: string): unknown {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json);
}

export type JwtClaims = {
  sub: string;
  tenant_id: string;
  scopes: string[];
  iat: number;
  exp: number;
  /**
   * Optional v2 role/portal claims (PROPOSED — see lib/auth/destination.ts).
   * The frozen jwt-claims-v1 carries neither, so both are absent today. They are
   * read only when they are non-empty strings; anything else is ignored.
   */
  role?: string;
  portal?: string;
};

/**
 * Structurally parse and validate an access token's claims per
 * docs/08-delivery/contracts/jwt-claims-v1.md. Returns null for anything
 * unexpected (wrong shape, missing tenant claim, bad scopes) — callers must
 * treat null as logged-out.
 */
export function parseAccessTokenClaims(token: string | undefined): JwtClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let payload: unknown;
  try {
    payload = base64UrlDecode(parts[1]);
  } catch {
    return null;
  }

  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;

  if (typeof p.sub !== "string" || !UUID_RE.test(p.sub)) return null;
  if (typeof p.tenant_id !== "string" || p.tenant_id.length === 0) return null;
  if (
    !Array.isArray(p.scopes) ||
    p.scopes.some((s) => typeof s !== "string" || s.length === 0)
  ) {
    return null;
  }
  if (typeof p.iat !== "number" || typeof p.exp !== "number") return null;
  if (p.exp <= p.iat) return null;

  return {
    sub: p.sub,
    tenant_id: p.tenant_id,
    scopes: p.scopes as string[],
    iat: p.iat,
    exp: p.exp,
    // Optional v2 claims: present only when the issuer sends a non-empty string.
    // Absent keys are omitted entirely so an older token parses exactly as before.
    ...(typeof p.role === "string" && p.role.trim() !== "" ? { role: p.role } : {}),
    ...(typeof p.portal === "string" && p.portal.trim() !== "" ? { portal: p.portal } : {}),
  };
}

/** The optional v2 portal claim from a token, or undefined. Tolerant — never throws. */
export function portalClaimFromToken(token: string | undefined): string | undefined {
  return parseAccessTokenClaims(token)?.portal;
}

export function isExpired(claims: JwtClaims, nowSec = Math.floor(Date.now() / 1000), skewSec = 5): boolean {
  return claims.exp - skewSec <= nowSec;
}

/** Build the UI-facing session view from cookies. Null = logged out. */
export function buildSession(
  accessToken: string | undefined,
  user: unknown,
): Session | null {
  const claims = parseAccessTokenClaims(accessToken);
  if (!claims) return null;
  if (isExpired(claims)) return null;
  if (typeof user !== "object" || user === null) return null;

  const u = user as Record<string, unknown>;
  if (typeof u.email !== "string" || typeof u.display_name !== "string") return null;

  return {
    userId: claims.sub,
    tenantId: claims.tenant_id,
    scopes: claims.scopes,
    email: u.email,
    displayName: u.display_name,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
    // Carry the optional v2 claims through when present; omitted otherwise, so a
    // session built from a v1 token is byte-shape unchanged.
    ...(claims.role ? { role: claims.role } : {}),
    ...(claims.portal ? { portal: claims.portal } : {}),
  };
}
