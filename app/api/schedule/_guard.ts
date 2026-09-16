/**
 * Shared session/scope gate for the staff Schedule BFF routes
 * (app/api/schedule/**) — the same check each route used to inline: a parsable
 * access cookie and AT LEAST ONE of the required scopes. The check is UX, not
 * security: the scheduling service re-checks the scope on the token and remains
 * the only authority (web/AGENTS.md rule 3); the chapel records this module's
 * routes write are app-side (lib/api-client/chapel-admin.ts).
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { staffActorName } from "@/lib/auth/actor";
import { ACCESS_COOKIE, parseAccessTokenClaims, type JwtClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

export type SchedulingAuth =
  | { ok: true; claims: JwtClaims; actor: string }
  | { ok: false; response: NextResponse };

/** Resolve the staff session for a scheduling route, or the response to return. */
export async function requireSchedulingScope(required: string[]): Promise<SchedulingAuth> {
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

/** Read a JSON body, or null when the request is not JSON. */
export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}
