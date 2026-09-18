/**
 * The Villa Memorial Plan's published terms, as a readable display module.
 *
 * WHAT THIS IS: a display of what the product already publishes — the coverage line, the
 * complete-package inclusions, the eligibility rules for both rate classes, the cash
 * assistance table, the plan notes and the current 2026 tier × term rates. The office can
 * show it while a family decides (the membership application screen and the memberships
 * index both render this same module).
 *
 * WHAT THIS IS NOT: a new contract. No operative clause is authored here and no legal
 * wording is transcribed — the signed membership paper and the issued certificate of
 * coverage (COC) carry that (they are not archived in this project; see
 * `lib/contracts/membership-application.ts`). The rates come from the CURRENT pricing
 * document through `PlanPaymentTable`, never from constants, so an office edit to
 * `/staff/plans` is what this module shows on the next request.
 */
import { Card } from "@/components/ui/card";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import {
  CASH_ASSISTANCE,
  php,
  SENIOR_TERMS,
  VMP_ELIGIBILITY,
  VMP_INCLUSIONS,
  VMP_NOTES,
} from "@/lib/villa-pricing";
import { MEMBERSHIP_COVERAGE } from "@/lib/contracts/membership-application";
import type { PlanPricing } from "@/lib/pricing-model";

export function PlanTermsDisplay({
  pricing,
  heading = "The plan's published terms",
}: {
  /** The CURRENT plan tables (`loadPricingDocument()`), handed down by the server page. */
  pricing: PlanPricing;
  heading?: string;
}) {
  return (
    <section id="plan-terms" className="stack-3" aria-labelledby="plan-terms-title">
      <h2 className="section-title" id="plan-terms-title">
        {heading}
      </h2>
      <p className="text-sm text-muted" style={{ margin: 0 }}>
        {MEMBERSHIP_COVERAGE}. What a family reads below is what the office publishes today;
        the signed membership paper carries the wording that governs.
      </p>

      <div className="split-grid">
        <Card header={<h3>What the plan covers</h3>}>
          <ul className="rate-facts">
            {VMP_INCLUSIONS.map((inclusion) => (
              <li key={inclusion.service}>
                <strong>{inclusion.service}</strong> — {inclusion.detail}
              </li>
            ))}
          </ul>
        </Card>

        <Card header={<h3>Who can join</h3>}>
          <p className="capture-subhead" style={{ marginTop: 0 }}>
            Regular rate — ages 1–60
          </p>
          <ul className="rate-facts">
            {VMP_ELIGIBILITY.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="capture-subhead">Senior citizen rate — ages 61–100</p>
          <ul className="rate-facts">
            {SENIOR_TERMS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="text-sm" style={{ marginTop: "var(--space-3)" }}>
            {VMP_NOTES.contestability}
          </p>
        </Card>
      </div>

      <div className="split-grid">
        <Card header={<h3>Cash assistance with hospital benefit</h3>}>
          <div className="table-wrapper">
            <table className="table price-table">
              <thead>
                <tr>
                  <th scope="col">Coffin tier</th>
                  <th scope="col">Cash assistance</th>
                </tr>
              </thead>
              <tbody>
                {CASH_ASSISTANCE.map((row) => (
                  <tr key={row.tiers}>
                    <th scope="row">{row.tiers}</th>
                    <td className="table__numeric">{php(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
            During the paying period only.
          </p>
          <p className="text-sm" style={{ marginTop: "var(--space-2)" }}>
            {VMP_NOTES.assign}
          </p>
        </Card>

        <Card header={<h3>Who serves and underwrites the plan</h3>}>
          <p className="text-sm" style={{ margin: "0 0 var(--space-3)" }}>
            {VMP_NOTES.serving}
          </p>
          <ul className="rate-facts">
            <li>{VMP_NOTES.extras}</li>
            <li>{VMP_NOTES.adjust}</li>
          </ul>
        </Card>
      </div>

      <div className="split-grid">
        <Card header={<h3>2026 rates — regular</h3>}>
          <PlanPaymentTable
            rows={pricing.regular}
            label="Villa Memorial Plan — regular payment schedule"
          />
        </Card>
        <Card header={<h3>2026 rates — senior citizen</h3>}>
          <PlanPaymentTable
            rows={pricing.senior}
            senior
            label="Villa Memorial Plan — senior citizen payment schedule"
          />
        </Card>
      </div>
    </section>
  );
}
