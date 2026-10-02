/**
 * Shared session/scope gate for the office's Prospect + Inquiry BFF routes
 * (`app/api/staff/**`).
 *
 * The check is UX, not security: it turns a would-be 403 into a readable message
 * without a round trip and mirrors the nav gate the screen carries. No
 * customer-records service exists to re-check it (crm-families is unbuilt), so
 * the routes state their demo-local posture in their own headers — they never
 * pretend a service is the authority (web/AGENTS.md rule 1).
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { staffActorName } from "@/lib/auth/actor";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

export type StaffAuth =
  | { ok: true; actor: string }
  | { ok: false; response: NextResponse };

/** Resolve the staff session (and the actor's name) for a staff route. */
export async function requireStaffScope(required: string[]): Promise<StaffAuth> {
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
  return { ok: true, actor: staffActorName(jar.get("im_u")?.value, claims) };
}

/** Read a JSON body, or null when the request is not JSON. */
export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

/** Map an ApiError onto the contract's `{ error }` shape; anything else is a 502. */
export function errorResponse(err: unknown, fallback: string): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return NextResponse.json({ error: fallback }, { status: 502 });
}

/** The first field error, for the `{ error }` line the browser shows. */
export function firstError(errors: Record<string, string>, fallback: string): string {
  return Object.values(errors)[0] ?? fallback;
}
