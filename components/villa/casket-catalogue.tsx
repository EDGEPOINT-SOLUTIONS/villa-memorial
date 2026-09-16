import { Card } from "@/components/ui/card";
import {
  CASKET_COLLECTIONS,
  CASKET_INCLUSION_COLUMNS,
  CASKET_INCLUSION_NOTES,
  CASKET_INCLUSIONS,
  CASKET_MODELS,
  php,
} from "@/lib/villa-pricing";

/**
 * The 2026 casket catalogue — every model with its published price.
 *
 * Both tables are transcriptions of the client's own sheets and render through
 * components so the numbers can never be re-typed in a view:
 *  - CasketPriceTable reads "2026 price FV website A" (= "PRICE LIST FOR 2026
 *    II"), section "For package": SRP, the senior SRP the sheet reprints beside
 *    it, the senior-citizen discount and the discounted price, grouped under the
 *    sheet's collection headers.
 *  - CasketInclusionTable reads "PRICE LIST FOR 2026 III": the per-family row of
 *    flowers / tarp / lapida / family car / 1 doz roses / thank-you card and the
 *    package's common & private chapel day rate, with the sheet's own footnotes.
 *
 * tests/unit/villa-pricing.test.ts pins every figure; tests/unit/
 * price-surfacing.test.tsx pins that each one actually reaches the page.
 */

/** ₱-prefixed amount for a table cell. */
function amount(n: number): string {
  return php(n);
}

export function CasketPriceTable() {
  return (
    <div className="table-wrapper">
      <table className="table price-table">
        <caption>
          For package — the client&rsquo;s 2026 casket catalogue. The senior SRP column is
          reprinted on the sheet because the senior citizen pays the same SRP less the
          printed discount.
        </caption>
        <thead>
          <tr>
            <th scope="col">Casket model</th>
            <th scope="col">Regular SRP</th>
            <th scope="col">Senior SRP</th>
            <th scope="col">Senior discount</th>
            <th scope="col">Discounted price</th>
          </tr>
        </thead>
        {CASKET_COLLECTIONS.map((collection) => (
          <tbody key={collection}>
            <tr className="price-table__group">
              <th scope="colgroup" colSpan={5}>
                {collection}
              </th>
            </tr>
            {CASKET_MODELS.filter((m) => m.collection === collection).map((m) => (
              <tr key={m.model}>
                <th scope="row">{m.model}</th>
                <td className="table__numeric">{amount(m.srp)}</td>
                <td className="table__numeric">{amount(m.srp)}</td>
                <td className="table__numeric">{amount(m.seniorDiscount)}</td>
                <td className="table__numeric">{amount(m.seniorPrice)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export function CasketInclusionTable() {
  return (
    <>
      <div className="table-wrapper">
        <table className="table price-table">
          <caption>
            What comes with each casket family, and the package&rsquo;s chapel day rates.
          </caption>
          <thead>
            <tr>
              <th scope="col">Casket family</th>
              {CASKET_INCLUSION_COLUMNS.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
              <th scope="col">Common chapel</th>
              <th scope="col">Private chapel</th>
            </tr>
          </thead>
          <tbody>
            {CASKET_INCLUSIONS.map((row) => (
              <tr key={row.family}>
                <th scope="row">{row.family}</th>
                {CASKET_INCLUSION_COLUMNS.map((c) => (
                  <td key={c.key}>{row[c.key] ? "YES" : "NO"}</td>
                ))}
                <td className="table__numeric">{amount(row.commonChapelPerDay)} / day</td>
                <td className="table__numeric">
                  {amount(row.privateChapelPerDay)} / day
                  {row.privateChapelDiscounted ? <sup>*</sup> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
        {CASKET_INCLUSION_NOTES.miscFee} {CASKET_INCLUSION_NOTES.discountedPrice}
      </p>
    </>
  );
}

/** Both catalogue tables in one block, under the sheet's own section headings. */
export function CasketCatalogue() {
  return (
    <div className="stack-4">
      <Card
        header={<h3>For package — SRP, senior discount and discounted price</h3>}
      >
        <CasketPriceTable />
      </Card>
      <Card header={<h3>What is included per casket family</h3>}>
        <CasketInclusionTable />
      </Card>
    </div>
  );
}
