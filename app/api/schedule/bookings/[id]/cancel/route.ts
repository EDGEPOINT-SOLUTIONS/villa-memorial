import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { cancelBooking } from "@/lib/api-client/scheduling";
import { cancelChapelBooking, chapelClassOfBooking } from "@/lib/api-client/chapel-admin";
import { readJsonBody, requireSchedulingScope } from "@/app/api/schedule/_guard";

/**
 * BFF: POST /api/schedule/bookings/:id/cancel — thin proxy over scheduling-resources
 * `POST /scheduling/api/v1/bookings/:id/cancel` (scope `scheduling:write`).
 *
 * CHAPEL BOOKINGS ARE THE EXCEPTION the staff chapel screen needs: a chapel
 * cancellation must say WHY the dates are being given back, and the frozen
 * endpoint carries no body for a reason. So a chapel booking goes through
 * lib/api-client/chapel-admin.ts, which cancels on the service FIRST (that is
 * what frees the dates for every reader) and then records the operator's reason
 * app-side; any other resource keeps the untouched generic proxy. The optional
 * `reason` is ignored for non-chapel bookings — the service has nowhere to put it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchedulingScope(["scheduling:write"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request);
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const reason = typeof record.reason === "string" ? record.reason : "";

  const { id } = await params;
  try {
    if ((await chapelClassOfBooking(id)) !== null) {
      const { booking, state } = await cancelChapelBooking(id, reason, auth.actor);
      return NextResponse.json({ ...booking, admin_state: state });
    }
    return NextResponse.json(await cancelBooking(id));
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "could not cancel booking" }, { status: 502 });
  }
}
