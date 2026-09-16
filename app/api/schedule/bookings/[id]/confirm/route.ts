import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { confirmChapelBooking } from "@/lib/api-client/chapel-admin";
import { requireSchedulingScope } from "@/app/api/schedule/_guard";

/**
 * BFF: POST /api/schedule/bookings/:id/confirm — the office accepts a chapel
 * stay (scope `scheduling:write`).
 *
 * This is what turns a storefront cart hold ("still only in a customer's cart")
 * into a confirmed booking in the admin view: booking-events-v1 has no such
 * status, so the confirmation record is app-authored
 * (lib/api-client/chapel-admin.ts). It does NOT touch the frozen booking row —
 * the dates are already held by the scheduling booking.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireSchedulingScope(["scheduling:write"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const { booking, state } = await confirmChapelBooking(id, auth.actor);
    return NextResponse.json({ ...booking, admin_state: state });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the booking could not be confirmed" }, { status: 502 });
  }
}
