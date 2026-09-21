"use client";

import { useState } from "react";
import type { LotCategory, LotPriceRow, PlanTerm } from "@/lib/pricing-model";

/**
 * Official 2026 price list — the package page's price module, prototype-exact
 * (docs/prototypes/villa-home-ui/package.html §"OFFICIAL 2026 PRICE LIST").
 *
 * The prototype's own controls are reproduced here:
 *  - the "Highlight amortization term" switch (Annual · Semi-Annual ·
 *    Quarterly · Monthly) highlights the matching `data-term` column in every
 *    family table;
 *  - the "Highlight senior-citizen rates" toggle washes the whole senior half;
 *  - the grouped two-row header: Product / Area / Selling price, then the
 *    "6 years amortization" group over the four terms, then the
 *    "(Senior citizen) 6 years amortization" group over selling price + terms.
 *
 * Every figure comes from the pricing document handed in by the server page
 * (lib/api-client/pricing.ts → the editable fixture store); this component
 * never authors a number, and an office edit through /staff/pricing is what it
 * prints.
 */

/** The prototype's switch order — Annual first (PLAN_TERMS is Monthly first). */
const TERM_ORDER: ReadonlyArray<PlanTerm> = ["annual", "semi", "quarterly", "monthly"];

/** Column headings exactly as printed in the prototype's header row. */
const TERM_HEADING: Record<PlanTerm, string> = {
  annual: "Annual",
  semi: "Semi-annual",
  quarterly: "Quarterly",
  monthly: "Monthly",
};

/** The switch's labels (Semi-Annual capitalised, as in the prototype). */
const TERM_SWITCH_LABEL: Record<PlanTerm, string> = {
  annual: "Annual",
  semi: "Semi-Annual",
  quarterly: "Quarterly",
  monthly: "Monthly",
};

/** Transcribed amounts are printed without the ₱ sign in the 2026 tables. */
function num(n: number): string {
  return n.toLocaleString("en-PH");
}

/** One amortization amount from a family row (quarterly ↔ the `quarter` key). */
function amountFor(row: LotPriceRow, term: PlanTerm, senior: boolean): number {
  const table = senior ? row.senior : row.regular;
  return table[term === "quarterly" ? "quarter" : term];
}

function cellClass(term: PlanTerm, selected: PlanTerm, senior: boolean): string {
  const classes = ["num"];
  if (senior) classes.push("senior");
  if (term === selected) classes.push("is-term-hl");
  return classes.join(" ");
}

export function PriceList2026Module({ categories }: { categories: ReadonlyArray<LotCategory> }) {
  const [term, setTerm] = useState<PlanTerm>("monthly");
  const [senior, setSenior] = useState(false);

  return (
    <>
      <div className="price-module__head">
        <p className="mid-kicker">Sanctuario de Mercedes y Gloria</p>
        <h2 className="price-module__title" id="pl-title">
          Official price list 2026
        </h2>
        <p className="mid-sub">
          Every lot product with 6-year amortization at Annual, Semi-Annual, Quarterly and Monthly
          — plus senior-citizen rates.{" "}
          <strong>* Amortization can be adjusted to 8 years and 10 years.</strong>
        </p>
        <div className="plan-board__head">
          <div>
            <span className="buy-card__label price-module__term-label">
              Highlight amortization term
            </span>
            <div className="term-switch" role="group" aria-label="Highlight amortization term">
              {TERM_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  data-term={t}
                  aria-pressed={t === term}
                  onClick={() => setTerm(t)}
                >
                  {TERM_SWITCH_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <label className="senior-toggle">
            <input
              type="checkbox"
              checked={senior}
              onChange={(e) => setSenior(e.target.checked)}
            />
            Highlight senior-citizen rates
          </label>
        </div>
      </div>

      {categories.map((cat) => (
        <div
          className="pl-scroll"
          key={cat.title}
          role="region"
          aria-label={`${cat.title} — price list`}
          tabIndex={0}
        >
          <table className="pl-table">
            <caption>{cat.caption}</caption>
            <thead>
              <tr>
                <th rowSpan={2}>Product</th>
                <th rowSpan={2}>Area (sqm)</th>
                <th rowSpan={2}>Selling price</th>
                <th colSpan={4}>6 years amortization</th>
                <th colSpan={5}>(Senior citizen) 6 years amortization</th>
              </tr>
              <tr>
                {TERM_ORDER.map((t) => (
                  <th
                    key={t}
                    className={cellClass(t, term, false)}
                    data-term={t}
                    scope="col"
                  >
                    {TERM_HEADING[t]}
                  </th>
                ))}
                <th className={`num senior${senior ? " is-senior-hl" : ""}`}>Selling price</th>
                {TERM_ORDER.map((t) => (
                  <th
                    key={t}
                    className={`${cellClass(t, term, true)}${senior ? " is-senior-hl" : ""}`}
                    data-term={t}
                    scope="col"
                  >
                    {TERM_HEADING[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cat.rows.map((r) => (
                <tr key={cat.title + r.product}>
                  <td className="prod">{r.product}</td>
                  <td className="num">{r.area.toFixed(2)}</td>
                  <td className="num">{num(r.regular.selling)}</td>
                  {TERM_ORDER.map((t) => (
                    <td key={t} className={cellClass(t, term, false)} data-term={t}>
                      {num(amountFor(r, t, false))}
                    </td>
                  ))}
                  <td className={`num senior${senior ? " is-senior-hl" : ""}`}>
                    {num(r.senior.selling)}
                  </td>
                  {TERM_ORDER.map((t) => (
                    <td
                      key={t}
                      className={`${cellClass(t, term, true)}${senior ? " is-senior-hl" : ""}`}
                      data-term={t}
                    >
                      {num(amountFor(r, t, true))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <p className="plan-note">
        Source: PRICE LIST FOR 2026 (Sanctuario de Mercedes y Gloria) — reproduced exactly.
      </p>
      <p className="plan-note">
        Senior-citizen amortization is 50% of the standard table for high-value products and
        11/12 for the smallest, as printed.
      </p>
    </>
  );
}
