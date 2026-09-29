import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api-client/api-error";
import { claimChapelBooking } from "@/lib/api-client/chapel-admin";

/**
 * BFF: POST /api/chapel/bookings/:id/claim — the storefront's checkout tells the
 * schedule that a quote hold became part of a placed order.
 *
 * WHY THIS EXISTS: a chapel reservation is created when the customer adds the
 * stay to the quote basket, so a scheduled range is otherwise indistinguishable from one
 * that was paid for. The order-payment-api-v1 contract is frozen and carries only
 * `{sku, quantity}` per line, so the LINK is made here, after checkout, by the
 * page that still holds the reservation ids — not by changing the checkout
 * contract. The claim is app-authored (no contract names it; live mode answers
 * 503) and validated in lib/api-client/chapel-admin.ts: only an online storefront
 * hold, only against a real order, and only when that order actually carries the
 * matching chapel class line for the same number of days.
 *
 * Best-effort by design: a failed claim leaves an ordinary quote hold the office
 * can confirm from /staff/schedule — never a broken checkout.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const orderNumber =
    typeof (body as { order_number?: unknown })?.order_number === "string"
      ? (body as { order_number: string }).order_number.trim()
      : "";

  const { id } = await params;
  try {
    return NextResponse.json({ state: await claimChapelBooking({ bookingId: id, orderNumber }) });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "the order could not be linked to the stay" }, { status: 502 });
  }
}
