import { Card } from "@/components/ui/card";
import { LOT_PRICE_CATEGORIES, php } from "@/lib/villa-pricing";

/**
 * The official 2026 price list — all four product families, regular and
 * senior-citizen rates, six-year amortization. ONE renderer shared by
 * /lots/price-list-2026 and the package page (captain's review: “the module of
 * each product, service and plan must be captured on the website … the price
 * list must be followed exactly”), so the two surfaces can never drift.
 *
 * Figures come from lib/villa-pricing.ts (the transcribed client sheet) — this
 * component never authors a number.
 */
export function PriceList2026Tables() {
  return (
    <>
      {LOT_PRICE_CATEGORIES.map((cat) => (
        <Card key={cat.title} header={<h3>{cat.title} — 6 years amortization</h3>}>
          <div className="table-wrapper">
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
                    <td>{r.product}</td>
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
      ))}
    </>
  );
}
