import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { reserveLot } from "@/lib/api-client/property";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: POST /api/property/lots/:id/reserve — thin proxy over property-gis
 * `POST /property/api/v1/lots/:id/reserve` (contract KEB-D3-01, scope `property:write`).
 *
 * The scope check here is UX, not security: it turns a would-be 403 into a readable
 * message without a round trip. property-gis re-checks the same scope on the token and
 * remains the only authority — see web/AGENTS.md rule 3.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["property:write"])) {
    return NextResponse.json({ error: "property:write required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const ownerName =
    typeof body === "object" && body !== null && "owner_name" in body
      ? String((body as { owner_name: unknown }).owner_name ?? "")
      : "";

  const { id } = await params;
  try {
    return NextResponse.json(await reserveLot(id, ownerName));
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "reservation failed" }, { status: 502 });
  }
}
