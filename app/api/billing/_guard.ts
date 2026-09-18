/**
 * Shared session/scope gate for the staff Billing BFF routes (`app/api/billing/**`).
 *
 * The same check the Schedule and Catalogue routes use: a parsable access cookie and AT
 * LEAST ONE of the required scopes. The check is UX, not security — finance-billing
 * re-checks `billing:write` on the bearer token and remains the only authority on whether a
 * payment may be recorded (web/AGENTS.md rule 1). Fixture mode is the exception that proves
 * the rule: there is no service to re-check, so `lib/api-client/billing-store.ts` re-runs the
 * shared rules inside its write lock.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { staffActorName } from "@/lib/auth/actor";
import { ACCESS_COOKIE, parseAccessTokenClaims, type JwtClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

export type BillingAuth =
  | { ok: true; claims: JwtClaims; actor: string }
  | { ok: false; response: NextResponse };

/** Resolve the staff session for a billing route, or the response to return. */
export async function requireBillingScope(required: string[]): Promise<BillingAuth> {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return { ok: false, response: NextResponse.json({ error: "not signed in" }, { status: 401 }) };
  }
  if (!hasAnyScope(claims.scopes, required)) {
    return {
      ok: false,
      response: NextResponse.json({ error: `${required.join(" or ")} required` }, { status: 403 }),
    };
  }
  return { ok: true, claims, actor: staffActorName(jar.get("im_u")?.value, claims) };
}
