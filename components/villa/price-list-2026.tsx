/**
 * The official 2026 price list — all four product families, regular and
 * senior-citizen rates, six-year amortization. ONE renderer shared by
 * /lots/price-list-2026 and the package page (captain's review: “the module of
 * each product, service and plan must be captured on the website … the price
 * list must be followed exactly”), so the two surfaces can never drift.
 *
 * Figures come from the pricing document handed in by the server page
 * (lib/api-client/pricing.ts → the editable fixture store) — this component
 * never authors a number, and an office edit through /staff/pricing is what it
 * prints.
 *
 * Lots join the QUOTE BASKET as their own kind of line (office, 2026-09-29):
 * they never merge into a stock line, because a lot needs a buyer, a block/lot
 * number and a signed
 * purchase agreement), so every row carries the two honest actions instead:
 * "Request this lot" — the prefilled contact capture naming the category, the
 * row and the published selling price — and "See it on the map". A request is an
 * enquiry and never reserves the lot.
 */
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LotQuoteButton } from "@/components/villa/lot-quote-button";
import { PublicDisclosure } from "@/components/public";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import type { LotCategory, LotPriceRow } from "@/lib/pricing-model";
import { php } from "@/lib/villa-pricing";

/** One row's "Request this lot" href. */
function lotRequestHref(category: string, row: LotPriceRow): string {
  return buildRequestHref({
    item: `${category} — ${row.product}`,
    price: `${php(row.regular.selling)} regular selling price (senior citizen ${php(row.senior.selling)})`,
    note: `${row.area} sqm · 6-year amortization. Requesting a lot does not reserve it — the office confirms availability.`,
  });
}

export function PriceList2026Tables({
  categories,
  disclose = false,
}: {
  categories: ReadonlyArray<LotCategory>;
  /**
   * Collapse all but the first family behind a "Show …" disclosure. The
   * public /lots/price-list-2026 opens on it (plan §5.5: never all four tables
   * at once); the staff pricing preview passes false so an editor sees the whole
   * document it is editing.
   */
  disclose?: boolean;
}) {
  return (
    <>
      {categories.map((cat, index) => {
        const card = (
          <Card key={cat.title} header={<h3>{cat.title} — 6 years amortization</h3>}>
          <div className="table-wrapper" tabIndex={0}>
            <table className="table price-table">
              <thead>
                <tr>
                  <th scope="col" rowSpan={2}>
                    Product
                  </th>
                  <th scope="col" rowSpan={2}>
                    Area (sqm)
                  </th>
                  <th scope="col" colSpan={6}>
                    Regular
                  </th>
                  <th scope="col" colSpan={6}>
                    Senior citizen
                  </th>
                </tr>
                <tr>
                  <th scope="col">Selling</th>
                  <th scope="col">Annual</th>
                  <th scope="col">Semi-annual</th>
                  <th scope="col">Quarterly</th>
                  <th scope="col">Monthly</th>
                  <th scope="col" className="blank" aria-hidden="true" />
                  <th scope="col">Selling</th>
                  <th scope="col">Annual</th>
                  <th scope="col">Semi-annual</th>
                  <th scope="col">Quarterly</th>
                  <th scope="col">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {cat.rows.map((r) => (
                  <tr key={cat.title + r.product}>
                    <td>
                      <div className="lot-row__name">{r.product}</div>
                      <div className="lot-row__actions">
                        <LotQuoteButton
                          category={cat.title}
                          product={r.product}
                          area={r.area}
                          sellingPrice={r.regular.selling}
                        />
                        <Link href={lotRequestHref(cat.title, r)}>Request this lot</Link>
                        <Link href="/map">See it on the map</Link>
                      </div>
                    </td>
                    <td className="text-sm">{r.area}</td>
                    <td>{php(r.regular.selling)}</td>
                    <td>{php(r.regular.annual)}</td>
                    <td>{php(r.regular.semi)}</td>
                    <td>{php(r.regular.quarter)}</td>
                    <td>{php(r.regular.monthly)}</td>
                    <td className="blank" aria-hidden="true" />
                    <td>{php(r.senior.selling)}</td>
                    <td>{php(r.senior.annual)}</td>
                    <td>{php(r.senior.semi)}</td>
                    <td>{php(r.senior.quarter)}</td>
                    <td>{php(r.senior.monthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Card>
        );
        return disclose ? (
          <PublicDisclosure
            key={cat.title}
            summary={`${cat.title} — 6 years amortization`}
            defaultOpen={index === 0}
          >
            {card}
          </PublicDisclosure>
        ) : (
          card
        );
      })}
    </>
  );
}
