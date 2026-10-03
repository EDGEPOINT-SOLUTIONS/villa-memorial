import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { saveRoleScopes } from "@/lib/api-client/access-control";
import { staffActorName } from "@/lib/auth/actor";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: /api/access-control/roles — the ONE write behind the Users & roles
 * permission checkboxes (S30).
 *
 * The captain asked to tick permissions (2026-10-02). The write lands in the
 * durable fixture journal (`lib/api-client/access-control.ts`), which folds over
 * the recorded identity-access seed; it does not provision a user and it does not
 * change a sign-in gate. No contract names a role-write endpoint, so this route
 * validates the posted set against the frozen `rbac-scopes-v1` vocabulary and
 * stores it as an app-authored record — it never invents an endpoint or a scope.
 *
 * Scope (frozen rbac-scopes-v1, matching the /staff/users nav entry):
 *   POST requires `identity:users:manage` ("Create/update users, assign roles").
 * This check is UX, not security: the store re-validates every save, and a future
 * identity-access endpoint remains the only authority (web/AGENTS.md rule 1).
 * The route reads scopes from the verified session cookie only — never from the
 * body.
 */
export async function POST(request: Request) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["identity:users:manage"])) {
    return NextResponse.json({ error: "identity:users:manage required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  try {
    const actor = staffActorName(jar.get("im_u")?.value, claims);
    const state = await saveRoleScopes(record.roles, actor);
    return NextResponse.json({ ok: true, ...state });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the permissions could not be saved" }, { status: 502 });
  }
}
