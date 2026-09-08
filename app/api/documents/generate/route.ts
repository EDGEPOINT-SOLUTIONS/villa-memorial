import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { getCase } from "@/lib/api-client/operations";
import { getOrderByNumber } from "@/lib/api-client/commerce";
import { getLot } from "@/lib/api-client/property";
import { generateDocument } from "@/lib/api-client/documents";
import { buildServiceContract } from "@/lib/contracts/service-contract";
import { buildPurchaseAgreement } from "@/lib/contracts/purchase-agreement";
import { ACCESS_COOKIE, parseAccessTokenClaims } from "@/lib/auth/session";
import { hasAnyScope } from "@/lib/rbac/nav";

/**
 * BFF: POST /api/documents/generate — assembles a Villa contract from platform records and
 * asks documents ⓡ to render it (`POST /documents/api/v1/documents/generate`).
 *
 * The client sends an intent ("the service contract for this case"), never a variable bag:
 * the payload is a legal artifact's content, so it is built server-side from records the
 * caller is authorised to read, not from anything the browser can set.
 *
 * The scope check here is UX, not security — documents ⓡ re-checks `documents:write` on
 * the token and remains the only authority (web/AGENTS.md rule 3).
 */
export async function POST(request: NextRequest) {
  const jar = await cookies();
  const claims = parseAccessTokenClaims(jar.get(ACCESS_COOKIE)?.value);
  if (!claims) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!hasAnyScope(claims.scopes, ["documents:write"])) {
    return NextResponse.json({ error: "documents:write required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const fields = (body ?? {}) as Record<string, unknown>;
  const kind = String(fields.kind ?? "");
  const tenantName = process.env.TENANT_DISPLAY_NAME || "Villa Memoria";
  const signedOn = new Date().toISOString();

  try {
    let payload;

    if (kind === "service_contract") {
      const caseId = String(fields.case_id ?? "");
      if (!caseId) {
        return NextResponse.json({ error: "case_id required" }, { status: 400 });
      }
      const kase = await getCase(caseId);

      // A case without a fulfilled order has no priced lines. That is a real state —
      // intake can precede checkout — so the contract still prints, unpriced.
      let order = null;
      if (kase.linked_order_number) {
        try {
          order = await getOrderByNumber(kase.linked_order_number);
        } catch {
          order = null;
        }
      }
      payload = buildServiceContract({ kase, order, tenantName, signedOn });
    } else if (kind === "lot_purchase") {
      const lotId = String(fields.lot_id ?? "");
      if (!lotId) {
        return NextResponse.json({ error: "lot_id required" }, { status: 400 });
      }
      const lot = await getLot(lotId);
      payload = buildPurchaseAgreement({ lot, tenantName, signedOn });
    } else {
      return NextResponse.json({ error: `unknown document kind ${kind}` }, { status: 400 });
    }

    const document = await generateDocument(payload);
    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // A refusal to build (an unreserved lot, an unknown terms version) is a 422: the
    // request was understood and the records say no, which is not an upstream failure.
    if (err instanceof Error && err.message) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
