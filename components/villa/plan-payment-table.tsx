import Link from "next/link";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import { php, PLAN_TIERS, PLAN_TERMS, type PaymentRow } from "@/lib/villa-pricing";

/**
 * The Villa Memorial Plan's payment-mode table (five tiers × four terms), one of
 * the client's two 2026 schedules:
 *  - rows={VMP_PAYMENTS}     → the standard table (COMPLETE MEMORIAL PACKAGE.jpg)
 *  - rows={SENIOR_PAYMENTS}  → the senior-citizen table (TYPES OF COFFIN.jpg)
 *
 * ONE renderer for every surface that shows the schedule (/plans,
 * /plans/villa-memorial-plan, /plans/senior-benefits) so the three can never
 * drift; every amount comes from lib/villa-pricing.ts.
 *
 * Every amount is ACTIONABLE: each tier × term cell links to the prefilled
 * request naming the tier, the payment mode and the published amount the visitor
 * clicked. The cart itself only prices the monthly amortization (the catalogue's
 * plan SKUs), so the other terms, the tiers without a SKU and the senior rates
 * are requested from the office — an enquiry, never a reservation.
 */
export function PlanPaymentTable({
  rows,
  label,
  senior = false,
}: {
  rows: ReadonlyArray<PaymentRow>;
  /** Accessible name for the table ("Regular" / "Senior citizen"). */
  label?: string;
  /** True for SENIOR_PAYMENTS — the request copy then names the senior condition. */
  senior?: boolean;
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
          {rows.map((r) => {
            const per = PLAN_TERMS.find((t) => t.mode === r.mode)?.per ?? "";
            return (
              <tr key={r.mode}>
                <th scope="row">{r.mode}</th>
                {PLAN_TIERS.map((t) => (
                  <td key={t.id} className="table__numeric">
                    <Link
                      className="price-request-link"
                      href={buildRequestHref({
                        item: `${t.name} plan — ${r.mode}`,
                        price: `${php(r[t.id])} ${per}`.trim(),
                        note: senior
                          ? "Senior-citizen rates (61–100 years old, no insurance benefit)."
                          : "Villa Memorial Plan enquiry.",
                      })}
                      aria-label={`Request ${t.name} plan, ${r.mode} — ${php(r[t.id])}`}
                    >
                      {php(r[t.id])}
                    </Link>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
