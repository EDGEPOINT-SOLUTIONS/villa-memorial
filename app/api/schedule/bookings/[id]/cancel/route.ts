import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { cancelBooking } from "@/lib/api-client/scheduling";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: POST /api/schedule/bookings/:id/cancel — thin proxy over scheduling-resources
 * `POST /scheduling/api/v1/bookings/:id/cancel` (scope `scheduling:write`).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["scheduling:write"])) {
    return NextResponse.json({ error: "scheduling:write required" }, { status: 403 });
  }

  const { id } = await params;
  try {
    return NextResponse.json(await cancelBooking(id));
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "could not cancel booking" }, { status: 502 });
  }
}
