import { NextResponse } from "next/server";
import { recordEngagementPayment } from "@/lib/api-client/lifecycle";
import { errorResponse, readJsonBody, requireStaffScope } from "../../_guard";

/**
 * BFF: POST /api/staff/lifecycle/payments — the counter records a payment.
 *
 * The amount is validated against the record's outstanding balance (no credit is
 * modeled): an overpayment is a 422, never a silently floored figure. The write
 * goes to the durable demo journal on the same engagement the register lists.
 */
export async function POST(request: Request) {
  const auth = await requireStaffScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const payment = await recordEngagementPayment(body, auth.actor);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "the payment could not be saved");
  }
}
