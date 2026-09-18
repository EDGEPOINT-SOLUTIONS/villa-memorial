import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { recordPayment } from "@/lib/api-client/finance";
import { requireBillingScope } from "@/app/api/billing/_guard";

/**
 * BFF: POST /api/billing/invoices/:number/payments — record a payment at the counter.
 *
 * The frozen `billing-list-api-v1` contract names this write
 * (`POST /billing/api/v1/invoices/:number/payments`, scope `billing:write`), so live mode is
 * a real proxy and fixture mode writes the durable store — never a stub.
 *
 * HANDLER STAYS RULES-FREE (web/AGENTS.md rule 1)
 * The amount/method/date rules, the "what is still owed" check and the wording of every
 * refusal live in `lib/billing-payments.ts`, and `lib/api-client/finance.ts` runs them for
 * both modes. This route only gates the session, reads the body and maps the outcome — so the
 * bank of business rules exists once, next to its tests.
 *
 * RESPONSE
 * `201 { invoice, payment }` where `invoice` is the balance AS THE SERVER REPORTS IT (the
 * screen must never do the arithmetic itself) and `payment` is the recorded payment with the
 * official receipt it issued, or null when the service named none.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const auth = await requireBillingScope(["billing:write"]);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const { number } = await params;
  try {
    const result = await recordPayment({
      invoiceNumber: decodeURIComponent(number),
      input: body,
      actor: auth.actor,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}) },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "the payment could not be recorded" }, { status: 502 });
  }
}

/** GET is the screen's own read path; a payment write has nothing to return here. */
export async function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
