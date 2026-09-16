import { php, PLAN_TIERS, type PaymentRow } from "@/lib/villa-pricing";

/**
 * The Villa Memorial Plan's payment-mode table (five tiers × four terms), one of
 * the client's two 2026 schedules:
 *  - rows={VMP_PAYMENTS}     → the standard table (COMPLETE MEMORIAL PACKAGE.jpg)
 *  - rows={SENIOR_PAYMENTS}  → the senior-citizen table (TYPES OF COFFIN.jpg)
 *
 * ONE renderer for every surface that shows the schedule (/plans,
 * /plans/villa-memorial-plan, /plans/senior-benefits) so the three can never
 * drift; every amount comes from lib/villa-pricing.ts.
 */
export function PlanPaymentTable({
  rows,
  label,
}: {
  rows: ReadonlyArray<PaymentRow>;
  /** Accessible name for the table ("Regular" / "Senior citizen"). */
  label?: string;
}) {
  return (
    <div className="table-wrapper">
      <table className="table price-table">
        {label ? <caption>{label}</caption> : null}
        <thead>
          <tr>
            <th scope="col">Payment mode</th>
            {PLAN_TIERS.map((t) => (
              <th key={t.id} scope="col">
                {t.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.mode}>
              <th scope="row">{r.mode}</th>
              <td className="table__numeric">{php(r.bronze1)}</td>
              <td className="table__numeric">{php(r.bronze2)}</td>
              <td className="table__numeric">{php(r.silver1)}</td>
              <td className="table__numeric">{php(r.silver2)}</td>
              <td className="table__numeric">{php(r.gold)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
