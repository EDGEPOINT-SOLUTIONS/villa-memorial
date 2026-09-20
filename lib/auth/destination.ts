/**
 * Portal destination rules — server-side ONLY.
 *
 * The JWT carries permission scopes but no role/portal claim (frozen
 * jwt-claims-v1), so the app infers the right surface from scopes. These rules
 * decide where a signed-in user belongs:
 *
 *   admin-ish scopes → Admin Portal
 *   else order/property scopes (agent) → Agent portal
 *   else (storefront-only, e.g. customer) → Family portal
 *
 * This is a PRESENTATION convenience (which door to open first), never
 * authorization — every surface still gates its own content by scope at the
 * boundary. When the dev adds a role/portal claim to the contract, replace
 * this file's body with that claim; the call sites stay the same.
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

export function isStaffSession(scopes: string[]): boolean {
  return scopes.some((s) => STAFF_SCOPES.includes(s));
}

export function isAgentSession(scopes: string[]): boolean {
  return !isStaffSession(scopes) && scopes.some((s) => AGENT_SCOPES.includes(s));
}

export function isFamilySession(scopes: string[]): boolean {
  return !isStaffSession(scopes) && !isAgentSession(scopes);
}

/** The portal home a session belongs to (used for login redirects + guards). */
export function portalHomeFor(scopes: string[]): string {
  if (isStaffSession(scopes)) return "/staff/dashboard";
  if (isAgentSession(scopes)) return "/agent/dashboard";
  return "/client/dashboard";
}
