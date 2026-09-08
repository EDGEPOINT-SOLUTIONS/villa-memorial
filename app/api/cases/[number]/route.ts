import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { updateCaseIntake } from "@/lib/api-client/operations";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";
import { intakeFromForm } from "@/lib/contracts/intake-input";

/**
 * BFF: PATCH /api/cases/:number — completes or corrects intake on an existing case.
 *
 * Addressed by case_number, which is how funeral-cases addresses cases (a capability
 * token, not a record id).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
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

  const { number } = await params;
  try {
    return NextResponse.json(await updateCaseIntake(number, intakeFromForm(body)));
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "could not save intake" }, { status: 502 });
  }
}
