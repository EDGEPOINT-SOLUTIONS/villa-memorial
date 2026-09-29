import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { releaseOnlineChapelBooking } from "@/lib/api-client/chapel-reservations";

/**
 * BFF: POST /api/chapel/bookings/:id/release — give a quote-created chapel hold
 * back to the schedule (the customer removed the line).
 *
 * Only bookings this flow created are releasable (the online title marker,
 * checked in lib/api-client/chapel-reservations.ts); staff-made bookings answer
 * 403. Idempotent: releasing an already-cancelled hold answers 200.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return NextResponse.json({ booking: await releaseOnlineChapelBooking(id) });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the chapel hold could not be released" }, { status: 502 });
  }
}
