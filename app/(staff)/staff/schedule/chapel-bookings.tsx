"use client";

/**
 * Chapel bookings (staff Schedule): every booking against a chapel — the stays a
 * customer is holding in a cart, the confirmed ones (with the order that claimed
 * them, when checkout linked one), and the cancellations with their reason.
 *
 * The operator's two verbs live here: Confirm (the office accepts a storefront
 * hold) and Cancel (the dates are freed and the reason is recorded). Both POST
 * BFF routes that keep their rules in lib/api-client/chapel-admin.ts — a chapel
 * cancellation cannot be made without a reason, from this screen or any other.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelBookingButton } from "@/components/schedule-actions";
import {
  CHAPEL_BOOKING_STATUS_LABEL,
  type ChapelBookingStatus,
} from "@/lib/chapel-admin";
import { formatCalendarDate, isOnlineChapelBooking } from "@/lib/chapel-booking";
import type { ChapelAdminBooking } from "@/lib/api-client/chapel-admin";

const STATUS_TONE: Record<ChapelBookingStatus, "warning" | "success" | "neutral"> = {
  hold: "warning",
  confirmed: "success",
  cancelled: "neutral",
};

const FILTERS: Array<{ key: "all" | ChapelBookingStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "hold", label: "In carts" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
];

/** "Sep 20 → Sep 22, 2026 · 3 days" for a booking's own dates. */
function stayLabel(booking: ChapelAdminBooking): string {
  if (booking.dates.length === 0) return "—";
  const first = booking.dates[0];
  const last = booking.dates[booking.dates.length - 1];
  const range =
    first === last
      ? formatCalendarDate(first)
      : `${formatCalendarDate(first)} → ${formatCalendarDate(last)}`;
  return `${range} · ${booking.dates.length} ${booking.dates.length === 1 ? "day" : "days"}`;
}

function ConfirmBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/schedule/bookings/${encodeURIComponent(bookingId)}/confirm`, {
        method: "POST",
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : "Could not confirm the booking.",
        );
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the scheduling service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={confirm} disabled={pending}>
        {pending ? "Confirming…" : "Confirm"}
      </Button>
      {error ? <p className="field__error" role="alert">{error}</p> : null}
    </>
  );
}

export function ChapelBookings({
  bookings,
  canWrite,
}: {
  bookings: ChapelAdminBooking[];
  canWrite: boolean;
}) {
  const [filter, setFilter] = useState<"all" | ChapelBookingStatus>("all");

  const counts = {
    hold: bookings.filter((b) => b.status === "hold").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };
  const shown = bookings.filter((b) => filter === "all" || b.status === filter);

  return (
    <div className="card">
      <div className="card__header row row--space">
        <h3>Chapel bookings</h3>
        <span className="text-sm text-muted">
          {counts.hold} in cart{counts.hold === 1 ? "" : "s"} · {counts.confirmed} confirmed ·{" "}
          {counts.cancelled} cancelled
        </span>
      </div>
      <div className="card__body stack-4">
        <div className="row row--wrap">
          {FILTERS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              aria-pressed={filter === entry.key}
              className={`pill-toggle${filter === entry.key ? " pill-toggle--active" : ""}`}
              onClick={() => setFilter(entry.key)}
            >
              {entry.label}
              {entry.key === "all" ? ` (${bookings.length})` : ` (${counts[entry.key]})`}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="text-sm text-muted">
            {bookings.length === 0
              ? "No chapel booking yet — storefront holds appear here the moment a customer adds a stay to their cart."
              : "Nothing in this filter."}
          </p>
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Chapel</th>
                  <th scope="col">Dates</th>
                  <th scope="col">Customer / order</th>
                  <th scope="col">Case</th>
                  <th scope="col">Status</th>
                  {canWrite ? <th scope="col">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {shown.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>{booking.resource_name}</strong>
                      <div className="text-sm text-muted">{booking.title}</div>
                    </td>
                    <td className="text-sm">{stayLabel(booking)}</td>
                    <td className="text-sm">
                      {booking.order ? (
                        <>
                          {booking.order.customer_name}
                          <div className="text-sm text-muted">
                            Order {booking.order.number}
                          </div>
                        </>
                      ) : isOnlineChapelBooking(booking.title) ? (
                        <span className="text-muted">
                          {booking.status === "hold"
                            ? "Cart hold — no contact yet"
                            : "Storefront hold — no contact"}
                        </span>
                      ) : (
                        <span className="text-muted">Office booking</span>
                      )}
                    </td>
                    <td className="text-sm">{booking.case_number ?? "—"}</td>
                    <td>
                      <Badge tone={STATUS_TONE[booking.status]}>
                        {CHAPEL_BOOKING_STATUS_LABEL[booking.status]}
                      </Badge>
                      {booking.status === "cancelled" && booking.reason ? (
                        <div className="text-sm text-muted">Reason: {booking.reason}</div>
                      ) : null}
                      {booking.status !== "hold" && booking.by ? (
                        <div className="text-sm text-muted">
                          {booking.by}
                          {booking.at ? ` · ${formatCalendarDate(booking.at.slice(0, 10))}` : ""}
                        </div>
                      ) : null}
                    </td>
                    {canWrite ? (
                      <td>
                        <div className="row row--wrap">
                          {booking.status === "hold" ? (
                            <ConfirmBookingButton bookingId={booking.id} />
                          ) : null}
                          {booking.status !== "cancelled" ? (
                            <CancelBookingButton bookingId={booking.id} chapel />
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canWrite ? (
          <Alert tone="info">
            A cart hold already reserves the dates. <strong>Confirm</strong> tells the storefront
            the office accepted the stay; <strong>Cancel</strong> frees the dates and records why.
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
