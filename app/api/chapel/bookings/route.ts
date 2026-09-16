import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { reserveChapelStay } from "@/lib/api-client/chapel-reservations";
import { isChapelDayCount, isCalendarDate } from "@/lib/chapel-booking";

/**
 * BFF: POST /api/chapel/bookings — hold one chapel for a 3–9 day range for the
 * storefront booking step.
 *
 * The route only parses the request and maps errors; the range is re-checked
 * against a fresh schedule inside lib/api-client/chapel-reservations.ts, which
 * also rolls the write back if the service still flags a conflict. `resource_id`
 * + `start_date` + `days` are untrusted input and validated before any read.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const resourceId = typeof b.resource_id === "string" ? b.resource_id.trim() : "";
  const startDate = typeof b.start_date === "string" ? b.start_date.trim() : "";
  const days = Number(b.days);

  if (!resourceId) {
    return NextResponse.json({ error: "Choose a chapel for the stay." }, { status: 422 });
  }
  if (!isCalendarDate(startDate)) {
    return NextResponse.json({ error: "Choose a valid start date for the stay." }, { status: 422 });
  }
  if (!isChapelDayCount(days)) {
    return NextResponse.json(
      { error: "Chapel stays run 3–9 days — choose a stay in that range." },
      { status: 422 },
    );
  }

  try {
    return NextResponse.json({ booking: await reserveChapelStay({ resourceId, startDate, days }) }, {
      status: 201,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the chapel stay could not be held" }, { status: 502 });
  }
}
