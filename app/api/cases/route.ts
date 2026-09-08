import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { createCase } from "@/lib/api-client/operations";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";
import { intakeFromForm } from "@/lib/contracts/intake-input";

/**
 * BFF: POST /api/cases — opens a case at the counter, with no order in front of it.
 *
 * The scope check is UX, not security: funeral-cases re-checks `cases:write` on the token
 * and remains the only authority (web/AGENTS.md rule 3).
 */
export async function POST(request: NextRequest) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["cases:write"])) {
    return NextResponse.json({ error: "cases:write required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await createCase(intakeFromForm(body)), { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "could not open the case" }, { status: 502 });
  }
}
