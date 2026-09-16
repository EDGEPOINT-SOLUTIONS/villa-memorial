import Link from "next/link";
import { LOGO_VILLA_AGENCY, LOGO_VILLA_GROUP, PLAN_PACKAGES_IMAGE } from "@/lib/media";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import {
  CASH_ASSISTANCE,
  COFFINS,
  LOT_PRICE_CATEGORIES,
  php,
  SENIOR_PAYMENTS,
  SENIOR_TERMS,
  VMP_ELIGIBILITY,
  VMP_NOTES,
  VMP_PACKAGE,
  VMP_PAYMENTS,
} from "@/lib/villa-pricing";

export const metadata = { title: "Villa Memorial Plan — Products & Price List 2026" };

export default function VillaMemorialPlanPage() {
  return (
    <div className="stack-4">
      {/* Hero */}
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Villa Memorial Plan</p>
            <h1 className="hero-premium__title">
              Products &amp; Price List 2026
            </h1>
            <p className="hero-premium__lead">
              A life plan that assures complete memorial services — assignable,
              transferable, with limited contestability and no forfeiture. Coffins,
              senior rates, full benefits and the complete lot price list on one page.
            </p>
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>
              Served by Funeraria Villa &amp; ZC-Arcega Funeral Homes, underwritten by
              Villa Agency Insurance Services.
            </p>
            <p className="plan-logo-row">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
              <img src={LOGO_VILLA_AGENCY} alt="Villa Agency Insurance Services — Insure. Invest. Prosper." />
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
              <img src={LOGO_VILLA_GROUP} alt="Villa Group of Companies" />
            </p>
            <nav className="hero-chips" aria-label="Jump to a section">
              <a href="#coffins">Coffin options</a>
              <a href="#senior">Senior citizen plan</a>
              <a href="#vmp">Plan benefits</a>
              <a href="#payments">Payment schedules</a>
              <a href="#prices">2026 price list</a>
            </nav>
            <div className="row" style={{ gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
              <a href="#prices" className="btn btn--accent btn--lg">
                View the 2026 price list
              </a>
              <Link href="/contact" className="btn btn--secondary btn--lg">
                Ask the park office
              </Link>
            </div>
          </div>
          <figure className="hero-premium__media">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo */}
            <img src={PLAN_PACKAGES_IMAGE} alt="Memorial plans — comprehensive packages for your peace of mind" />
            <figcaption>Villa Memorial Plan · comprehensive packages</figcaption>
          </figure>
        </div>
      </section>

      {/* Locations */}
      <section id="served-by" className="stack-3">
        <div className="row row--space">
          <h2 className="section-title">Branches &amp; affiliated locations</h2>
        </div>
        <div className="card">
          <div className="card__body">
            <ul className="stack-3">
              <li>Funeraria Villa – Capilla de San Jose, Isabela City, Basilan</li>
              <li>Funeraria Villa – National Highway, Brgy. Salvacion, Panabo City</li>
              <li>Villa ZC-Arcega Funeral Homes – Zamboanga City</li>
              <li>All Villa-affiliated funeral parlors around Mindanao</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 1. Coffin options */}
      <section id="coffins" className="stack-3">
        <div className="row row--space">
          <h2 className="section-title">1 · Coffin options</h2>
          <Link href="/products" className="btn btn--secondary btn--sm">
            Coffins &amp; caskets — every model with prices
          </Link>
        </div>
        <div className="landing__grid">
          {COFFINS.map((c) => (
            <article key={c.tier} className="card landing__card">
              <div className="media-block media-block--natural card-media">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded casket photos */}
                <img src={c.photo} alt={`${c.tier} casket`} loading="lazy" />
              </div>
              <div className="card__body">
                <h3>{c.tier}</h3>
                <p className="text-sm text-muted">{c.description}</p>
                <p className="text-sm">
                  <strong>Lid:</strong> {c.lid}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 2. Senior citizen plan */}
      <section id="senior" className="stack-3">
        <div className="row row--space">
          <h2 className="section-title">2 · Senior citizen plan</h2>
          <Link href="/plans/senior-benefits" className="btn btn--secondary btn--sm">
            Senior plan page
          </Link>
        </div>
        <div className="card">
          <div className="card__body">
            <h3>Eligibility &amp; terms</h3>
            <ul className="stack-3">
              {SENIOR_TERMS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card">
          <div className="card__body stack-3">
            <h3>Payment schedule (PHP)</h3>
            <PlanPaymentTable
              rows={SENIOR_PAYMENTS}
              senior
              label="Senior citizen payment schedule"
            />
          </div>
        </div>
      </section>

      {/* 3. Villa Memorial Plan (regular) */}
      <section id="vmp" className="stack-3">
        <h2 className="section-title">3 · Villa Memorial Plan</h2>
        <div className="card">
          <div className="card__body stack-3">
            <h3>Complete memorial package</h3>
            <div className="table-wrapper">
              <table className="table">
                <tbody>
                  {VMP_PACKAGE.map((p) => (
                    <tr key={p.service}>
                      <th scope="row">{p.service}</th>
                      <td>{p.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted">{VMP_NOTES.extras}</p>
          </div>
        </div>

        <div className="split-grid">
          <div className="card">
            <div className="card__body stack-3">
              <h3>Eligibility</h3>
              <ul className="stack-3">
                {VMP_ELIGIBILITY.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <h3>Limited contestability</h3>
              <p className="text-sm">{VMP_NOTES.contestability}</p>
            </div>
          </div>
          <div className="card">
            <div className="card__body stack-3">
              <h3>Cash assistance with hospital benefit</h3>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Coffin tier</th>
                      <th scope="col">Cash assistance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CASH_ASSISTANCE.map((c) => (
                      <tr key={c.tiers}>
                        <td>{c.tiers}</td>
                        <td>{php(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted">During the paying period only.</p>
              <h3>Assignable and transferable</h3>
              <p className="text-sm">{VMP_NOTES.assign}</p>
            </div>
          </div>
        </div>

        <div id="payments" className="card">
          <div className="card__body stack-3">
            <h3>Villa Memorial Plan — payment schedule (PHP)</h3>
            <PlanPaymentTable
              rows={VMP_PAYMENTS}
              label="Villa Memorial Plan — regular payment schedule"
            />
          </div>
        </div>
      </section>

      {/* 4. Price list 2026 — lots & mausoleum */}
      <section id="prices" className="stack-4">
        <div className="row row--space">
          <h2 className="section-title">4 · Price list 2026 — lots &amp; mausoleum</h2>
          <Link href="/lots/price-list-2026" className="btn btn--secondary btn--sm">
            Price list page
          </Link>
        </div>
        <p className="text-sm text-muted">
          Six-year amortization shown for regular and senior citizens.{" "}
          <strong>{VMP_NOTES.adjust}</strong>
        </p>
        {LOT_PRICE_CATEGORIES.map((cat) => (
          <div className="card" key={cat.title}>
            <div className="card__body stack-3">
              <h3>{cat.title} — 6 years amortization</h3>
              <div className="table-wrapper">
                <table className="table price-table">
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Area (sqm)</th>
                      <th scope="col" colSpan={5}>
                        Regular
                      </th>
                      <th scope="col" className="blank" aria-hidden="true" />
                      <th scope="col" colSpan={5}>
                        Senior citizen
                      </th>
                    </tr>
                    <tr>
                      <th scope="col" aria-hidden="true" />
                      <th scope="col" aria-hidden="true" />
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
            </div>
          </div>
        ))}
      </section>

      {/* Footer nav */}
      <section className="stack-3">
        <p className="text-sm text-muted">
          Compare with <Link href="/plans/compare">package options</Link> ·{" "}
          <Link href="/services">2026 service rates</Link> ·{" "}
          <Link href="/products">coffins with prices</Link> ·{" "}
          <Link href="/lots">browse plots on the map</Link>. Need a hand?{" "}
          <Link href="/contact">Contact the park office</Link> — prices above are the
          published 2026 Villa rates, confirmed at the office.
        </p>
      </section>
    </div>
  );
}
