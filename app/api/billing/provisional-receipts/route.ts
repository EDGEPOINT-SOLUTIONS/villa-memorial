import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { issueProvisionalReceipt } from "@/lib/api-client/provisional-receipts";
import { requireBillingScope } from "@/app/api/billing/_guard";

/**
 * BFF: POST /api/billing/provisional-receipts — issue the paper the counter hands over.
 *
 * No frozen contract names this record: it is the counter's own slip journal (FORMS_PLAN gap 3
 * — the client's signed Provisional Receipt paper is not archived, so this captures the same
 * information and says plainly what it is). Fixture mode writes the durable app store; live
 * mode answers a named 503 rather than dressing a local file up as a service.
 *
 * HANDLER STAYS RULES-FREE (web/AGENTS.md rule 1)
 * The payer/amount/instrument/date rules live in `lib/contracts/provisional-receipt-capture.ts`,
 * run by the form, this route's client and the store — the amount/instrument/date half is the
 * shared billing rule set. This handler only gates the session, reads the body and maps the
 * outcome, so every refusal sentence exists once.
 *
 * The body is APP-AUTHORED: `{invoice_number, case_number, payer, amount_cents, instrument,
 * reference, received_on, notes}` — the contract ask travels with the PR.
 */
export async function POST(request: Request) {
  const auth = await requireBillingScope(["billing:write"]);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const receipt = await issueProvisionalReceipt({ input: body, actor: auth.actor });
    return NextResponse.json({ receipt }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}) },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "the provisional receipt could not be recorded" },
      { status: 502 },
    );
  }
}

/** GET is the screens' own read path; issuing a slip has nothing to return here. */
export async function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
