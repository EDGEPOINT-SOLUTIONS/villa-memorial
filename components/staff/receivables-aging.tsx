import { formatMinorUnits } from "@/lib/money";
import type { AgingRow } from "@/lib/receivables";

/**
 * The dues aging strip the money screens share — Billing & collections, Accounting
 * and (until the at-a-glance trim) Analytics all read the same four buckets from
 * `lib/receivables.ts`. One rule set, one markup: the buckets are DERIVED from each
 * invoice's due date and balance, never stored beside it.
 *
 * HONESTY. A bucket with no account prints "—", never "₱0.00": the bucket is not a
 * recorded amount when nothing in it was recorded. The count still prints its real
 * zero, because "0 accounts" is a fact about the bucket.
 */
export function ReceivablesAging({
  rows,
  testId,
}: {
  rows: readonly AgingRow[];
  testId?: string;
}) {
  return (
    <ul className="aging" data-testid={testId}>
      {rows.map((row) => (
        <li key={row.bucket} className="aging__row">
          <span className="aging__label">{row.label}</span>
          <strong className="aging__amount">
            {row.count === 0 ? "—" : formatMinorUnits(row.amount_cents)}
          </strong>
          <span className="aging__count">
            {row.count} {row.count === 1 ? "account" : "accounts"}
          </span>
        </li>
      ))}
    </ul>
  );
}
