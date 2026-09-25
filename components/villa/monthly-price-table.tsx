import { type MonthlyPrice } from "@/lib/monthly-pricing";
import { php, php2 } from "@/lib/villa-pricing";

/**
 * The minutes' monthly-first summary table (Villa Memorial, 2026-09-21, item 8):
 *
 *   Product | Monthly price | Payment term | Total contract price
 *
 * ONE renderer for the plan and lot price lists. The monthly installment leads,
 * the payment term is the lot sheet's recorded 72 months or the plan's honest
 * pending wording, and the total contract price prints only where the approved
 * data records one (`lib/monthly-pricing.ts` derives every value; this component
 * authors none). The full published schedules stay below it, unchanged.
 *
 * The class is `installment-table`, deliberately NOT a `price-table` variant:
 * the 2026 full tables keep that marker, and a summary that re-used it would
 * put a `price-table` before the disclosure in the page-blueprint guard.
 */
export function MonthlyPriceTable({
  caption,
  rows,
}: {
  caption?: string;
  rows: ReadonlyArray<{ product: string; family?: string; price: MonthlyPrice }>;
}) {
  if (rows.length === 0) return null;
  const hasFamily = rows.some((row) => (row.family ?? "").length > 0);
  return (
    <div className="table-wrapper" tabIndex={0}>
      <table className="table installment-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {hasFamily ? <th scope="col">Family</th> : null}
            <th scope="col">Product</th>
            <th scope="col">Monthly price</th>
            <th scope="col">Payment term</th>
            <th scope="col">Total contract price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.family ?? ""}-${row.product}`}>
              {hasFamily ? <td>{row.family ?? "—"}</td> : null}
              <th scope="row">{row.product}</th>
              <td className="table__numeric">{php2(row.price.monthly)} / month</td>
              <td>{row.price.term.label}</td>
              <td className="table__numeric">
                {row.price.total !== null ? php(row.price.total) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
