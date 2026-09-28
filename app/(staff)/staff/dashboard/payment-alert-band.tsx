import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { PageSection } from "@/components/ui/page";
import {
  paymentAlertWindowDays,
  type PaymentAlert,
  type PaymentAlertSummary,
} from "@/lib/payment-alerts";

/**
 * The dashboard's payment alert band (client minute, 2026-09-21, item 4).
 *
 * A red `Alert` is the indicator and red is the payment-alert colour consistently
 * (minute UI note), but red is never the only signal: an icon, the word “Overdue” /
 * “Due soon” on every row, and the counts in the headline carry the meaning too
 * (F-16 accessibility rule). The counts come straight from the shared
 * two-day rule (`lib/payment-alerts.ts`) — the band never re-classifies a date.
 *
 * The type is deliberately right-sized so the band stays a notice rather than
 * shouting past the KPI tiles: a 22px headline (`.payment-alerts__headline`, the
 * card-title role) over 18px figures (`.payment-alerts__figure` / `__amount`). The
 * ladder lives in the "Dashboard payment alerts" block of `styles/components.css`.
 *
 * The whole band links to the billing screen, where the office can open a payment
 * and record it; the rows name the client, the invoice number, what is owed and how
 * late or how near it is, so the detail is readable before the click.
 */

/**
 * How many rows a glance shows PER STATE before the band points at the full list. It is
 * per-state on purpose: a single shared cap let five overdue rows crowd out every due-soon
 * row, so the band counted upcoming payments it would never show (2026-09-21 review).
 */
const MAX_ROWS = 5;

/** The due calendar day, printed so the row carries the date and not only the countdown. */
function dueLabel(dueOn: string): string {
  const date = new Date(`${dueOn}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dueOn;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function AlertRow({ alert }: { alert: PaymentAlert }) {
  return (
    <li className="row row--space">
      <span>
        <span className="text-sm">{alert.client}</span>{" "}
        {/* The row opens the read-only invoice, so a reader without billing:write can still
            see the payment the alert names (minute item 4). */}
        <Link
          href={`/staff/billing/invoices/${encodeURIComponent(alert.reference)}`}
          className="text-xs link-muted"
        >
          <code>{alert.reference}</code>
        </Link>
      </span>
      <span className="row nowrap">
        <span className="text-xs text-muted">due {dueLabel(alert.due_on)}</span>
        <span className="payment-alerts__amount">{alert.amount_label}</span>
        {/* Red is the payment-alert colour consistently (minute UI note); the state
            word and the countdown carry upcoming-vs-overdue, never the hue alone. */}
        <Badge tone="danger">{alert.state_label}</Badge>
        <span className="text-xs text-muted">{alert.countdown}</span>
      </span>
    </li>
  );
}

export function PaymentAlertBand({ summary }: { summary: PaymentAlertSummary }) {
  if (summary.total === 0) return null;

  const windowDays = paymentAlertWindowDays();
  // Cap each state on its own, so overdue rows can never hide the due-soon ones.
  const rows = [
    ...summary.overdue.slice(0, MAX_ROWS),
    ...summary.due_soon.slice(0, MAX_ROWS),
  ];
  const remaining = summary.total - rows.length;
  const noun = summary.total === 1 ? "payment needs" : "payments need";

  return (
    <PageSection>
      <Alert tone="danger">
        <p className="payment-alerts__headline">
          {summary.total} {noun} attention
        </p>
        <div className="row row--wrap">
          <AlertTriangle size={18} aria-hidden="true" />
          <span className="payment-alerts__figure">
            <strong>{summary.overdue_count} overdue</strong>
            {summary.due_soon_count > 0 ? (
              <>
                {" · "}
                <strong>
                  {summary.due_soon_count} due within {windowDays} days
                </strong>
              </>
            ) : null}
          </span>
          <Link href="/staff/billing" className="text-sm link-muted">
            Review payments
          </Link>
        </div>
        <ul className="payment-alerts__list stack-2">
          {rows.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </ul>
        {remaining > 0 ? (
          <p className="text-xs text-muted mt-2">
            +{remaining} more on the billing screen.
          </p>
        ) : null}
      </Alert>
    </PageSection>
  );
}
