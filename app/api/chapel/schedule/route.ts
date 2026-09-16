import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { getChapelSchedule } from "@/lib/api-client/chapel-reservations";

/**
 * BFF: GET /api/chapel/schedule — the storefront booking step's availability
 * read (chapel resources + their confirmed bookings + blocked dates).
 *
 * No business rules here: the chapel slice and the blocked-date hook live in
 * lib/api-client/chapel-reservations.ts + lib/chapel-booking.ts (AGENTS rule 1).
 * The visitor is anonymous; in live mode scheduling-v1 answers 401 (staff
 * scopes) and the dialog degrades to the Request-order path — see the client
 * module's header.
 */
export async function GET() {
  try {
    const { chapels, bookings, blockedDates } = await getChapelSchedule();
    return NextResponse.json({
      chapels,
      bookings,
      blocked_dates: blockedDates,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the chapel schedule is unavailable" }, { status: 502 });
  }
}
