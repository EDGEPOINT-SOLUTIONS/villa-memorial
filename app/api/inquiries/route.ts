import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { crmLiveModeEnabled } from "@/lib/api-client/crm";
import { receiveInquiry } from "@/lib/api-client/inquiry-store";
import { readInquirySubmission, type InquiryKind } from "@/lib/inquiry-intake";

/**
 * BFF: POST /api/inquiries — the office receives an enquiry.
 *
 * WHY IT IS UNGATED. The callers are the PUBLIC Request-for-Quote and Contact forms: a
 * family asking for a quotation has no session, and the client's minutes make submitting
 * an enquiry the point of the requirement. It is the same posture as `POST /api/orders`
 * (checkout) and `POST /api/chapel/bookings` — a public write that must be reachable
 * without signing in.
 *
 * THE HANDLER STAYS RULES-FREE, like every other BFF route here. Parsing and validation
 * live in `lib/inquiry-intake.ts` (one reading, shared with the browser so a field error
 * is the same sentence in both places) and persistence lives in
 * `lib/api-client/inquiry-store.ts`. This file reads the body, asks for a verdict, and
 * maps the outcome to a status code.
 *
 * LIVE MODE REFUSES. No frozen contract names an inquiry-write endpoint — crm-families is
 * unbuilt — so when `CRM_BASE_URL` selects live mode this answers the named 503 from
 * `lib/api-client/crm.ts` rather than quietly writing the enquiry into a local file. An
 * office running against a real CRM will see an honest "not connected" and the form tells
 * the family to call; it will never see a silent success that lost the message.
 */
export async function POST(request: NextRequest) {
  if (crmLiveModeEnabled()) {
    return NextResponse.json({ error: "CRM_NOT_WIRED" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const kind = record.kind;
  if (kind !== "quote" && kind !== "contact" && kind !== "log") {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const verdict = readInquirySubmission(kind as InquiryKind, record.values);
  if (!verdict.ok) {
    // The same field errors the form would have shown, so a client that skipped its own
    // check still gets the office's wording rather than a generic refusal.
    return NextResponse.json(
      { error: Object.values(verdict.errors)[0] ?? "The enquiry could not be recorded.", fieldErrors: verdict.errors },
      { status: 422 },
    );
  }

  try {
    const inquiry = await receiveInquiry({ intake: verdict.intake });
    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "The enquiry could not be recorded." }, { status: 502 });
  }
}
