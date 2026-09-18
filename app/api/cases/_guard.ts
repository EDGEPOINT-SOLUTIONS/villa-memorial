/**
 * Shared session/scope gate for the staff Cases BFF routes (app/api/cases/**).
 *
 * The check is UX, not security: it turns a would-be 403 into a readable message
 * without a round trip. funeral-cases re-checks the scope on the token and remains the
 * only authority on the scope and on every write's legality (web/AGENTS.md rule 3) —
 * none of these routes re-derives a business rule.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

export type CasesAuth = { ok: true } | { ok: false; response: NextResponse };

/** Resolve the staff session for a cases route, or the response to return. */
export async function requireCasesScope(required: string[]): Promise<CasesAuth> {
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
  return { ok: true };
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
