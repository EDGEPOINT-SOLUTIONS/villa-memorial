import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { transitionOrder, type OrderTransition } from "@/lib/api-client/commerce";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: POST /api/orders/:number/status — the staff Orders admin's one write.
 *
 * The frozen order-payment-api-v1 contract has no transition endpoint, so in live mode the
 * client answers 503 and will not invent a contract (lib/api-client/commerce.ts). Fixture
 * mode applies the lifecycle rule in the durable store. The scope check here is UX, not
 * security: the store re-checks the same rule, and the future service endpoint remains the
 * only authority (web/AGENTS.md rule 1) once one freezes.
 */

const WRITABLE_TRANSITIONS: OrderTransition[] = ["confirmed", "fulfilled", "cancelled"];

/** Display name of the operator for the timeline; claims subject is the honest fallback. */
function actorFromUserCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const user = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as {
      display_name?: unknown;
      email?: unknown;
    };
    if (typeof user.display_name === "string" && user.display_name.trim().length > 0) {
      return user.display_name;
    }
    if (typeof user.email === "string" && user.email.trim().length > 0) {
      return user.email;
    }
  } catch {
    // fall through to the claims subject
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["orders:write"])) {
    return NextResponse.json({ error: "orders:write required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const status = record.status;
  if (
    typeof status !== "string" ||
    !WRITABLE_TRANSITIONS.includes(status as OrderTransition)
  ) {
    return NextResponse.json(
      { error: "status must be one of confirmed, fulfilled, cancelled" },
      { status: 422 },
    );
  }
  const reason = typeof record.reason === "string" ? record.reason : "";

  const { number } = await params;
  try {
    const updated = await transitionOrder(number, status as OrderTransition, {
      by: actorFromUserCookie(jar.get("im_u")?.value) ?? claims.sub,
      reason,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "could not update the order" }, { status: 502 });
  }
}
