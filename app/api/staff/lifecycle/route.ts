import { NextResponse } from "next/server";
import { recordEngagementOutcome } from "@/lib/api-client/lifecycle";
import { errorResponse, readJsonBody, requireStaffScope } from "../_guard";

/**
 * BFF: POST /api/staff/lifecycle — the office records a post-Prospect outcome.
 *
 * WHAT IT IS. The write behind the "Record a …" form on the Members · Services ·
 * Lots · Products registers: a plan membership, a booked service, a garden lot or
 * a product sale. The validation is the pure `lib/lifecycle.ts` intake (which the
 * form runs too), and persistence is the durable demo journal
 * (`lib/api-client/lifecycle-store.ts`).
 *
 * DEMO-LOCAL, NEVER LIVE. No frozen contract names a lifecycle/engagement record,
 * so `lib/api-client/lifecycle.ts` serves fixture mode and says so. This route
 * never claims a CRM or billing contract.
 *
 * RULES STAY OUT OF THE HANDLER: read a body, ask for a verdict, persist through
 * the owning store.
 */
export async function POST(request: Request) {
  const auth = await requireStaffScope(["cases:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  if (body === null) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const engagement = await recordEngagementOutcome(body, auth.actor);
    return NextResponse.json({ engagement }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "the outcome could not be saved");
  }
}
