import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { PageSection } from "@/components/ui/page";
import { formatMinorUnits } from "@/lib/money";
import {
  paymentAlertWindowDays,
  type PaymentAlert,
  type PaymentAlertSummary,
} from "@/lib/payment-alerts";

/**
 * The dashboard's payment notification bands (client minute, 2026-09-21, item 4;
 * recomposed 2026-10-02 to the admin-plan board).
 *
 * The board asks for TWO bands side by side — the overdue accounts in red and the
 * accounts due inside the shared two-day window in amber — each leading with its
 * count and amount, its named accounts following. Red is never the only signal:
 * an icon, the word “Overdue” / “Due soon” on every row, and the counts in the
 * headline carry the meaning too (F-16 accessibility rule). The counts come
 * straight from the shared two-day rule (`lib/payment-alerts.ts`) — the band
 * never re-classifies a date.
 *
 * The type is deliberately right-sized so the bands stay a notice rather than
 * shouting past the KPI tiles: a 22px headline (`.payment-alerts__headline`, the
 * card-title role) over 18px amounts (`.payment-alerts__amount`). The ladder
 * lives in the “Dashboard payment alerts” block of `styles/components.css`.
 *
 * Every row opens the read-only invoice it names, and the band's foot routes to
 * the billing screen, where the office can record a payment.
 */

/** How many named accounts a glance shows per band before pointing at the full list. */
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
        <Badge tone="danger">{alert.state_label}</Badge>
        <span className="text-xs text-muted">{alert.countdown}</span>
      </span>
    </li>
  );
}

function Band({
  tone,
  count,
  cents,
  currency,
  headline,
  note,
  rows,
}: {
  tone: "danger" | "warning";
  count: number;
  cents: number;
  currency: string;
  headline: string;
  note: string;
  rows: readonly PaymentAlert[];
}) {
  const shown = rows.slice(0, MAX_ROWS);
  const remaining = rows.length - shown.length;
  return (
    <Alert tone={tone}>
      <p className="payment-alerts__headline">
        {headline} · {formatMinorUnits(cents, currency)}
      </p>
      <p className="text-sm text-muted">{note}</p>
      <div className="row row--wrap" style={{ marginTop: "var(--space-2)" }}>
        <AlertTriangle size={16} aria-hidden="true" />
        <span className="payment-alerts__figure">
          <strong>
            {count} account{count === 1 ? "" : "s"}
          </strong>
        </span>
        <Badge tone={tone}>{tone === "danger" ? "Overdue" : "Due soon"}</Badge>
      </div>
      {shown.length > 0 ? (
        <ul className="payment-alerts__list stack-2" style={{ marginTop: "var(--space-2)" }}>
          {shown.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </ul>
      ) : null}
      {remaining > 0 ? (
        <p className="text-xs text-muted mt-2">+{remaining} more on the billing screen.</p>
      ) : null}
    </Alert>
  );
}

export function PaymentAlertBand({ summary }: { summary: PaymentAlertSummary }) {
  if (summary.total === 0) return null;

  const windowDays = paymentAlertWindowDays();
  const currency = "PHP";

  return (
    <PageSection>
      <div className="row row--space row--wrap">
        <h2 className="page-section-title">Payment notifications</h2>
        <span className="text-sm text-muted">
          {summary.total} account{summary.total === 1 ? "" : "s"}{" "}
          {summary.total === 1 ? "needs" : "need"} attention
        </span>
      </div>
      <div className="split-grid">
        {summary.overdue_count > 0 ? (
          <Band
            tone="danger"
            count={summary.overdue_count}
            cents={summary.overdue_cents}
            currency={currency}
            headline={`${summary.overdue_count} account${summary.overdue_count === 1 ? "" : "s"} overdue`}
            note="Overdue is the calendar, not the stored status — the two-day rule is the reminder the family already receives."
            rows={summary.overdue}
          />
        ) : null}
        {summary.due_soon_count > 0 ? (
          <Band
            tone="warning"
            count={summary.due_soon_count}
            cents={summary.due_soon_cents}
            currency={currency}
            headline={`${summary.due_soon_count} account${summary.due_soon_count === 1 ? "" : "s"} due in ${windowDays} days`}
            note="A reminder is queued for each; nothing is sent until the notification service exists."
            rows={summary.due_soon}
          />
        ) : null}
      </div>
      <p className="mt-4 mb-0">
        <Link href="/staff/billing" className="btn btn--secondary btn--sm">
          Review payments
        </Link>
      </p>
    </PageSection>
  );
}
