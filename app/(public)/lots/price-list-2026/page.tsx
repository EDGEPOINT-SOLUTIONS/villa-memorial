import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LOT_PRICE_CATEGORIES, php, VMP_NOTES } from "@/lib/villa-pricing";
import {
  LOT_GARDEN_NICHES,
  LOT_MAUSOLEUM,
  LOT_PREMIUM,
  LOT_PRIMARY,
} from "@/lib/media";

export const metadata = { title: "2026 Price list — Lots & mausoleum" };

/** Villa Memorial 2026 price list: all categories, regular + senior, 6-year amortization. */
export default function PriceList2026Page() {
  return (
    <div className="stack-4">
      <section className="page-hero">
        <p className="eyebrow-label">Price list 2026</p>
        <h1 className="page-hero__title">Lots, mausoleum &amp; packages</h1>
        <p className="page-hero__lead">
          Six-year amortization for regular and senior citizens.{" "}
          <strong>{VMP_NOTES.adjust}</strong>
        </p>
      </section>

      <div className="landing__grid">
        {[
          { img: LOT_MAUSOLEUM, label: "Mausoleum" },
          { img: LOT_GARDEN_NICHES, label: "Garden Niches" },
          { img: LOT_PREMIUM, label: "Premium Lot" },
          { img: LOT_PRIMARY, label: "Primary Lot" },
        ].map((x) => (
          <figure key={x.label} className="card landing__card">
            <div className="media-block card-media media-block--natural">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded imagery */}
              <img src={x.img} alt={x.label} loading="lazy" />
            </div>
            <figcaption className="card__body">
              <h3>{x.label}</h3>
            </figcaption>
          </figure>
        ))}
      </div>

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

      <p className="text-sm text-muted">
        See lots on the <Link href="/map">park map</Link>, explore the{" "}
        <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link>, or{" "}
        <Link href="/contact">ask the park office</Link> about 8- and 10-year terms.
      </p>
    </div>
  );
}
