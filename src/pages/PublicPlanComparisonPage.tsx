// Public plan comparison — side-by-side table of the pre-need memorial plans.

import { Link } from "react-router-dom";
import { PUBLIC_PLANS, type PublicPlan } from "../lib/publicCatalog";
import { money } from "../lib/shop";

function installmentAt(p: PublicPlan, years: number): number {
  return (p.total * 0.9) / (years * 12);
}

export function PublicPlanComparisonPage() {
  return (
    <div className="text-on-background">
      <div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-12 md:py-16">
        <nav className="flex text-on-surface-variant font-label-md text-label-md uppercase tracking-wider mb-6">
          <Link className="hover:text-primary" to="/site/plans">
            PLANS
          </Link>
          <span className="mx-2">/</span>
          <span className="text-primary">COMPARE</span>
        </nav>
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-primary mb-3">
          Compare Memorial Plans
        </h1>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-2xl mb-10">
          Side-by-side view of coverage, value, and indicative monthly installments at a
          10% down payment over 5 years.
        </p>

        <div className="bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_rgb(51,51,51,0.06)] border border-surface-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="p-6 w-[180px] text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Detail</th>
                  {PUBLIC_PLANS.map((p) => (
                    <th key={p.slug} className="p-6">
                      <Link to={`/site/plans/${p.slug}`} className="hover:no-underline!">
                        <span className={`block text-headline-sm font-headline-sm ${p.accent === "gold" ? "text-secondary" : "text-primary"}`}>
                          {p.name}
                        </span>
                      </Link>
                      {p.accent === "gold" ? (
                        <span className="inline-block mt-2 bg-secondary text-on-secondary text-label-md font-label-md px-3 py-1 rounded-full">
                          MOST POPULAR
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-body-md font-body-md">
                <tr className="border-b border-outline-variant/60">
                  <th scope="row" className="p-6 text-on-surface-variant font-body-md font-normal">Area</th>
                  {PUBLIC_PLANS.map((p) => (
                    <td key={p.slug} className="p-6 text-on-surface">{p.sqm} sqm</td>
                  ))}
                </tr>
                <tr className="border-b border-outline-variant/60 bg-surface-container-low/40">
                  <th scope="row" className="p-6 text-on-surface-variant font-body-md font-normal">Total value</th>
                  {PUBLIC_PLANS.map((p) => (
                    <td key={p.slug} className="p-6 text-headline-sm font-headline-sm text-secondary font-bold">{p.totalLabel}</td>
                  ))}
                </tr>
                <tr className="border-b border-outline-variant/60">
                  <th scope="row" className="p-6 text-on-surface-variant font-body-md font-normal">Includes</th>
                  {PUBLIC_PLANS.map((p) => (
                    <td key={p.slug} className="p-6">
                      <ul className="space-y-2">
                        {p.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2">
                            <span className={`material-symbols-outlined text-[16px] ${p.accent === "gold" ? "text-secondary" : "text-primary"}`} aria-hidden="true">check</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-outline-variant/60 bg-surface-container-low/40">
                  <th scope="row" className="p-6 text-on-surface-variant font-body-md font-normal">Est. monthly · 5 yrs</th>
                  {PUBLIC_PLANS.map((p) => (
                    <td key={p.slug} className="p-6 text-on-surface font-semibold">{money(installmentAt(p, 5))}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="p-6" />
                  {PUBLIC_PLANS.map((p) => (
                    <td key={p.slug} className="p-6">
                      <Link
                        to={`/site/plans/${p.slug}`}
                        className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#c29f32] text-white px-5 py-3 rounded-lg text-label-md font-label-md transition-colors hover:no-underline!"
                      >
                        View {p.name}
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
