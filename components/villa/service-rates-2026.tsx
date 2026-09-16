import { Card } from "@/components/ui/card";
import {
  ALACARTE_SCOPE,
  ALACARTE_SERVICE_FEES,
  ALACARTE_SERVICE_TOTAL,
  CHAPEL_NOTES,
  CHAPEL_RATES,
  EMBALMING_PER_DAY_BEYOND_9,
  EMBALMING_RATES,
  php,
} from "@/lib/villa-pricing";

/**
 * Funeraria memorial services — the client's 2026 service prices, as tables.
 *
 * Provenance (see lib/villa-pricing.ts for the full sheet map):
 *  - "2026 price FV website A" (= "PRICE LIST FOR 2026 II"), block "If they
 *    will not get the package": embalming per day (3–9 days, +₱1,500/day
 *    beyond), the five a-la-carte fees and the sheet's own bottom-line total.
 *    This is the SAME scope the package pages state for embalming: these rates
 *    apply when a family does not take a package.
 *  - "PRICE LIST FOR 2026 III": chapel use only (common & private, per-day rate
 *    with the 3–9 day totals and the senior-citizen totals) plus its notes —
 *    the ₱1,000 miscellaneous fee, the sheet's own senior-per-day line, and the
 *    chapel-only groceries note.
 *
 * No figure is authored here; every amount comes from lib/villa-pricing.ts and
 * is pinned by tests/unit/villa-pricing.test.ts.
 */

function money(n: number): string {
  return php(n);
}

/** Embalming per day + the five a-la-carte fees, exactly as the sheet prints them. */
export function AlacarteServiceRates() {
  return (
    <div className="split-grid">
      <Card header={<h3>Embalming — per day</h3>}>
        <div className="table-wrapper">
          <table className="table price-table">
            <caption>{ALACARTE_SCOPE}</caption>
            <thead>
              <tr>
                <th scope="col">No. of days</th>
                <th scope="col">Embalming</th>
              </tr>
            </thead>
            <tbody>
              {EMBALMING_RATES.map((r) => (
                <tr key={r.days}>
                  <th scope="row">{r.days}</th>
                  <td className="table__numeric">{money(r.amount)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">More than 9</th>
                <td className="table__numeric">
                  +{money(EMBALMING_PER_DAY_BEYOND_9)} / day
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card header={<h3>At-need services — per service</h3>}>
        <div className="table-wrapper">
          <table className="table price-table">
            <caption>{ALACARTE_SCOPE}</caption>
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ALACARTE_SERVICE_FEES.map((f) => (
                <tr key={f.service}>
                  <th scope="row">{f.service}</th>
                  <td className="table__numeric">{money(f.amount)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">Total — all five services above</th>
                <td className="table__numeric">{money(ALACARTE_SERVICE_TOTAL)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/**
 * Chapel use rates (common & private) with the sheet's senior column and notes.
 * The senior column is printed exactly as the sheet computes it (96% of the
 * regular total, pinned in tests) and the sheet's own senior-per-day footnote is
 * published verbatim beside the table rather than silently reconciled.
 */
export function ChapelRates() {
  return (
    <Card header={<h3>Chapel use — per day, common &amp; private</h3>}>
      <div className="table-wrapper">
        <table className="table price-table">
          <caption>{CHAPEL_NOTES.scope}</caption>
          <thead>
            <tr>
              <th scope="col" rowSpan={2}>
                Days
              </th>
              <th scope="col" colSpan={3}>
                Common chapel
              </th>
              <th scope="col" colSpan={3}>
                Private chapel
              </th>
            </tr>
            <tr>
              <th scope="col">Rates</th>
              <th scope="col">Regular</th>
              <th scope="col">Senior citizen</th>
              <th scope="col">Rates</th>
              <th scope="col">Regular</th>
              <th scope="col">Senior citizen</th>
            </tr>
          </thead>
          <tbody>
            {CHAPEL_RATES.map((r) => (
              <tr key={r.days}>
                <th scope="row">{r.days}</th>
                <td className="table__numeric">{money(r.common.ratePerDay)}</td>
                <td className="table__numeric">{money(r.common.regular)}</td>
                <td className="table__numeric">{money(r.common.senior)}</td>
                <td className="table__numeric">{money(r.private.ratePerDay)}</td>
                <td className="table__numeric">{money(r.private.regular)}</td>
                <td className="table__numeric">{money(r.private.senior)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="stack-3" style={{ marginTop: "var(--space-3)" }}>
        <li className="text-sm text-muted">{CHAPEL_NOTES.miscFee}</li>
        <li className="text-sm text-muted">{CHAPEL_NOTES.seniorPerDay}</li>
        <li className="text-sm text-muted">{CHAPEL_NOTES.privateChapelOnly}</li>
      </ul>
    </Card>
  );
}

/** Both service price blocks, the way /services lays them out. */
export function ServiceRates2026() {
  return (
    <div className="stack-4">
      <AlacarteServiceRates />
      <ChapelRates />
    </div>
  );
}
