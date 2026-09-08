import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { getLot, propertyLiveModeEnabled, reserveLot } from "@/lib/api-client/property";
import {
  NOT_WIRED as PURCHASE_APPLICATIONS_NOT_WIRED,
  savePurchaseApplication,
} from "@/lib/api-client/purchase-applications";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  buyerFullName,
  purchaseApplicationFromForm,
  purchaseTerms,
  validatePurchaseApplication,
} from "@/lib/contracts/purchase-application";

/**
 * BFF: POST /api/property/lots/:id/purchase-application — records Villa's lot Purchase
 * Application for a lot (FORMS_PLAN gap 2, Track B).
 *
 * The application is what names the buyer in full and carries the sale's written figures,
 * so saving it on an AVAILABLE lot also reserves the lot for that buyer through the frozen
 * property-gis `POST /lots/:id/reserve` path (contract KEB-D3-01) — the paper sequence is
 * application first, hold second, and the two stay consistent. On an already-held lot it
 * only records/updates the application.
 *
 * NO purchase-application service contract is frozen yet (see
 * `lib/api-client/purchase-applications.ts`): in fixture mode this records a demo copy
 * in-process; live persistence is honestly unavailable (503) and never half-applies — the
 * reservation is not touched when the application itself cannot be stored.
 *
 * The scope check here is UX, not security — the service boundary re-checks.
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
  if (propertyLiveModeEnabled()) {
    return NextResponse.json({ error: PURCHASE_APPLICATIONS_NOT_WIRED }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const { id } = await params;

  let input;
  try {
    input = purchaseApplicationFromForm(body);
  } catch (err) {
    // A malformed peso figure is a 422: the request was understood and says no.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "invalid application" },
      { status: 422 },
    );
  }

  // Validate against the revision the application's own date resolves to, so the
  // classification list offered on the form and the one enforced here are the same paper's.
  let terms;
  try {
    terms = purchaseTerms(input.application_date ?? new Date().toISOString().slice(0, 10));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "invalid application date" },
      { status: 422 },
    );
  }
  const fieldErrors = validatePurchaseApplication(input, terms);
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: Object.values(fieldErrors)[0] }, { status: 422 });
  }

  try {
    const lot = await getLot(id);
    if (lot.status === "available") {
      await reserveLot(id, buyerFullName(input));
    }
    const application = await savePurchaseApplication(id, lot.lot_number, input);
    return NextResponse.json({ application, lot: await getLot(id) }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "could not save the purchase application" }, { status: 502 });
  }
}
