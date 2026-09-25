import { type MonthlyPrice } from "@/lib/monthly-pricing";
import { php, php2 } from "@/lib/villa-pricing";

/**
 * The monthly-first price block (Villa Memorial minutes, 2026-09-21, item 8).
 *
 * ONE renderer for the surfaces that carry a card price — the /lots cards, the
 * home plans & lots cards and the monthly-first rows of the price lists: the
 * monthly installment LEADS, its payment term follows, and the total contract
 * price prints only where the approved data records one. A plan with no recorded
 * term renders the honest pending wording (`lib/monthly-pricing.ts`) instead of
 * a guessed month count.
 *
 * The block is card furniture, never prose: every line is a `<div>`, so it never
 * trips the reading-budget guard that measures `<p>` on the public pages.
 */
export function MonthlyPriceBlock({
  price,
  showTotal = true,
  className,
}: {
  price: MonthlyPrice;
  /** Show the total contract price line when the data records one. */
  showTotal?: boolean;
  className?: string;
}) {
  return (
    <div className={`monthly-price${className ? ` ${className}` : ""}`}>
      <div className="monthly-price__installment">
        <span className="monthly-price__amount">{php2(price.monthly)}</span>{" "}
        <span className="monthly-price__unit">/ month</span>
      </div>
      <div className="monthly-price__term">
        {price.term.status === "recorded"
          ? `Payment term: ${price.term.label}`
          : price.term.label}
      </div>
      {showTotal && price.total !== null ? (
        <div className="monthly-price__total">Total contract price {php(price.total)}</div>
      ) : null}
    </div>
  );
}
