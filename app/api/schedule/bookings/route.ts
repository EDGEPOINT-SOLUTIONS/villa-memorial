import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { createBooking, type BookingInput } from "@/lib/api-client/scheduling";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: POST /api/schedule/bookings — thin proxy over scheduling-resources
 * `POST /scheduling/api/v1/bookings` (scope `scheduling:write`).
 *
 * The scope check here is UX, not security: it turns a would-be 403 into a readable
 * message without a round trip. scheduling-resources re-checks the scope on the token
 * and remains the only authority — see web/AGENTS.md rule 3.
 */
export async function POST(request: NextRequest) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["scheduling:write"])) {
    return NextResponse.json({ error: "scheduling:write required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const input: BookingInput = {
    title: typeof b.title === "string" ? b.title.trim() : "",
    resource_id: typeof b.resource_id === "string" ? b.resource_id.trim() : "",
    starts_at: typeof b.starts_at === "string" ? b.starts_at : "",
    ends_at: typeof b.ends_at === "string" ? b.ends_at : "",
    case_number: typeof b.case_number === "string" ? b.case_number.trim() : undefined,
  };
  if (!input.title || !input.resource_id || !input.starts_at || !input.ends_at) {
    return NextResponse.json(
      { error: "title, resource_id, starts_at and ends_at are required" },
      { status: 422 },
    );
  }

  try {
    return NextResponse.json(await createBooking(input), { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "booking failed" }, { status: 502 });
  }
}
