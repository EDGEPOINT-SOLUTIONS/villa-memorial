import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import {
  listPricingQuestions,
  loadPricingDocument,
  saveLotPricing,
  savePlanPricing,
} from "@/lib/api-client/pricing";
import { staffActorName } from "@/lib/auth/actor";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: /api/pricing — the staff plan-rates (/staff/plans) and lot-prices
 * (/staff/pricing) administration seam.
 *
 * The frozen contract surface carries no pricing endpoints (the client's 2026
 * plan tables and lot prices are app-recorded content), so in LIVE MODE the
 * save answers an honest 503 (`PRICING_ADMIN_NOT_WIRED`) instead of inventing a
 * contract; the read serves the recorded sheet document, which is the display
 * authority in every mode. See lib/api-client/pricing.ts for the contract ask.
 *
 * Scopes (frozen rbac-scopes-v1, matching the nav entries in lib/rbac/nav.ts):
 *   - GET  requires `catalog:read`  (the matching read scope)
 *   - POST requires `catalog:write` (the scope the two nav entries already use)
 * This check is UX, not security: the store re-validates every save, and the
 * future service endpoint remains the only authority (web/AGENTS.md rule 1).
 */
export async function GET() {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["catalog:read"])) {
    return NextResponse.json({ error: "catalog:read required" }, { status: 403 });
  }
  return NextResponse.json({
    pricing: await loadPricingDocument(),
    questions: await listPricingQuestions(),
  });
}

export async function POST(request: Request) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["catalog:write"])) {
    return NextResponse.json({ error: "catalog:write required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const section = record.section;

  try {
    const actor = staffActorName(jar.get("im_u")?.value, claims);
    const pricing =
      section === "plans"
        ? await savePlanPricing(record.plans, actor)
        : section === "lots"
          ? await saveLotPricing(record.lotCategories, actor)
          : null;
    if (!pricing) {
      return NextResponse.json(
        { error: 'section must be "plans" or "lots"' },
        { status: 422 },
      );
    }
    return NextResponse.json({ ok: true, pricing });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the prices could not be saved" }, { status: 502 });
  }
}
