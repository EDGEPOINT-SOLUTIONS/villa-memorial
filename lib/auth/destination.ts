/**
 * Portal destination rules — server-side ONLY.
 *
 * The frozen jwt-claims-v1 carries permission scopes but no role/portal claim, so
 * today the app infers the right surface from scopes. That is a PRESENTATION
 * convenience (which door to open first), never authorization — every surface still
 * gates its own content by scope at the boundary.
 *
 * A v2 role/portal claim is PROPOSED (platform-contracts plan C0a). This module is
 * the seam: when the identity service issues `portal` (or `role`) the claim is
 * preferred, and when it does not the scope rules below are used unchanged. The
 * claim is read defensively — an unknown word is ignored rather than trusted, so a
 * bad claim can never widen access, only restore the scope-based fallback.
 */

const STAFF_SCOPES = [
  "identity:roles:read",
  "identity:users:manage",
  "tenancy:tenants:manage",
  "audit:events:read",
  "catalog:write",
  "billing:read",
  "billing:write",
  "accounting:read",
  "accounting:post",
  "cases:read",
  "cases:write",
  "scheduling:read",
  "scheduling:write",
  "property:write",
  "hr:read",
  "hr:write",
  "documents:read",
  "documents:write",
];

const AGENT_SCOPES = ["orders:read", "orders:write", "property:read"];

export type Portal = "staff" | "agent" | "family";

/**
 * The portal words the claim may carry. Only words that unambiguously name a portal
 * are mapped; a role name that is not a portal (e.g. a future "sales_agent") is
 * ignored and the scope rules decide. Kept deliberately small — inventing a mapping
 * for an unfrozen claim would be guessing.
 */
const PORTAL_WORDS: Record<string, Portal> = {
  staff: "staff",
  admin: "staff",
  "admin-portal": "staff",
  agent: "agent",
  family: "family",
  customer: "family",
  client: "family",
};

export function isStaffSession(scopes: string[]): boolean {
  return scopes.some((s) => STAFF_SCOPES.includes(s));
}

export function isAgentSession(scopes: string[]): boolean {
  return !isStaffSession(scopes) && scopes.some((s) => AGENT_SCOPES.includes(s));
}

export function isFamilySession(scopes: string[]): boolean {
  return !isStaffSession(scopes) && !isAgentSession(scopes);
}

/** The portal the scope rules imply (the v1 behaviour). */
export function portalFromScopes(scopes: string[]): Portal {
  if (isStaffSession(scopes)) return "staff";
  if (isAgentSession(scopes)) return "agent";
  return "family";
}

/** A portal named by the optional v2 claim, or null for absent/unknown values. */
export function portalFromClaim(value: string | null | undefined): Portal | null {
  if (typeof value !== "string") return null;
  return PORTAL_WORDS[value.trim().toLowerCase()] ?? null;
}

/**
 * The portal for a session: the `portal` claim first, then a portal-shaped `role`,
 * then the scope rules. Never throws.
 */
export function portalForSession(session: {
  scopes: string[];
  portal?: string | null;
  role?: string | null;
}): Portal {
  return (
    portalFromClaim(session.portal) ??
    portalFromClaim(session.role) ??
    portalFromScopes(session.scopes)
  );
}

function homeForPortal(portal: Portal): string {
  if (portal === "staff") return "/staff/dashboard";
  if (portal === "agent") return "/agent/dashboard";
  return "/client/dashboard";
}

/** The portal home the scope rules put a session in (used where only scopes exist). */
export function portalHomeFor(scopes: string[]): string {
  return homeForPortal(portalFromScopes(scopes));
}

/** The portal home for a session, preferring the optional v2 claim. */
export function portalHomeForSession(session: {
  scopes: string[];
  portal?: string | null;
  role?: string | null;
}): string {
  return homeForPortal(portalForSession(session));
}

/** The portal home when only scopes and an optional raw claim are known (login path). */
export function portalHomeForClaims(scopes: string[], portal?: string | null): string {
  return homeForPortal(portalFromClaim(portal) ?? portalFromScopes(scopes));
}
