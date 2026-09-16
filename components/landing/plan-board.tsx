"use client";

/**
 * Home "Plan ahead" board — the approved prototype's VILLA MEMORIAL PLAN block
 * (docs/prototypes/villa-home-ui/home.html): the term switch that highlights a
 * column, the five-tier × four-term table, the footnote and the partner logo
 * row (the promo figure beside it is rendered by LandingView).
 *
 * Every figure comes from lib/villa-pricing.ts (PLAN_TIERS × PLAN_TERMS through
 * planRate), so the board can never disagree with the client's payment-mode
 * sheets or with the package page's selector. Nothing here is staff-typed
 * except the footnote copy, which the section hands in as `note`.
 *
 * Client component for ONE reason: the term switch is interactive (the
 * prototype's own review affordance — `aria-pressed` per button, the matching
 * column washed gold). Everything renders server-side as well, with Monthly
 * pressed and its column highlighted from the first paint.
 *
 * Like LandingView, internal navigation uses plain <a> anchors (not next/link)
 * so the board stays framework-free and renders identically under the repo's
 * node tests and inside the staff editor preview.
 */
/* eslint-disable @next/next/no-html-link-for-pages -- see note above */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LOGO_VILLA_AGENCY, LOGO_VILLA_GROUP } from "@/lib/media";
import { PLAN_TERMS, PLAN_TIERS, php, planRate, type PlanTerm, type PlanTier } from "@/lib/villa-pricing";

/**
 * The prototype lists the switch Monthly · Semi-Annual · Quarterly · Annual
 * (home.html) while the table keeps the price sheet's own column order — so the
 * switch order is its own list here, with labels still read from PLAN_TERMS.
 */
const SWITCH_ORDER: ReadonlyArray<PlanTerm> = ["monthly", "semi", "quarterly", "annual"];

/** Which package SKU a tier sells as — the package page owns the same map
 * (app/(public)/plans/[sku]/page.tsx, PKG-BASIC = Bronze 1); Bronze 1 is the
 * row the prototype badges on the home board. */
const SKU_BY_TIER: Partial<Record<PlanTier, string>> = { bronze1: "PKG-BASIC" };

/**
 * The footnote with its two derived tokens filled in: `{seniorMonthly}` → the
 * senior Bronze-1 monthly rate (the plan's entry point for senior citizens) and
 * `{packagePage}` → the anchor to the package page. Staff author the sentence;
 * the amounts and the destination are never typed.
 */
function PlanNote({ note }: { note: string }) {
  const seniorMonthly = php(planRate("bronze1", "monthly", true));
  const packagePage = (
    <a key="package-page" href="/plans/PKG-BASIC">
      package page
    </a>
  );
  // The capture group keeps the token NAMES in the split result (the braces are
  // the delimiters, so the captured value is the bare token name).
  const parts = note.split(/\{(seniorMonthly|packagePage)\}/);
  return (
    <p className="plan-note">
      {parts.map((part) => {
        if (part === "seniorMonthly") return seniorMonthly;
        if (part === "packagePage") return packagePage;
        return part;
      })}
    </p>
  );
}

export function PlanBoard({ note }: { note: string | null }) {
  const [term, setTerm] = useState<PlanTerm>("monthly");
  const highlighted = (id: PlanTerm): string => (id === term ? " is-term-hl" : "");

  return (
    <div className="plan-board">
      <div className="plan-board__head">
        <span className="buy-card__label">Payment mode</span>
        <div className="term-switch" role="group" aria-label="Plan term">
          {SWITCH_ORDER.map((id) => {
            const def = PLAN_TERMS.find((t) => t.id === id);
            if (!def) return null;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={id === term}
                data-term={id}
                onClick={() => setTerm(id)}
              >
                {def.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="plan-scroll"
        role="region"
        aria-label="Villa Memorial Plan payment modes"
        tabIndex={0}
      >
        <table className="plan-table" id="home-plan-table">
          <thead>
            <tr>
              <th scope="col">Plan tier</th>
              {PLAN_TERMS.map((t) => (
                <th key={t.id} scope="col" className={`num${highlighted(t.id)}`} data-col={t.id}>
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_TIERS.map((tier) => (
              <tr key={tier.id}>
                <th scope="row" className="tier-name">
                  {tier.name}
                  {SKU_BY_TIER[tier.id] ? <Badge tone="accent">{SKU_BY_TIER[tier.id]}</Badge> : null}
                </th>
                {PLAN_TERMS.map((t) => (
                  <td key={t.id} className={`num${highlighted(t.id)}`} data-col={t.id}>
                    {php(planRate(tier.id, t.id))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {note ? <PlanNote note={note} /> : null}

      <p className="logo-row">
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
        <img src={LOGO_VILLA_AGENCY} alt="Villa Agency Insurance Services — Insure. Invest. Prosper." />
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
        <img src={LOGO_VILLA_GROUP} alt="Villa Group of Companies" />
        <span className="logo-chip">Powered by Eternal Plans, Inc.</span>
      </p>
    </div>
  );
}

export default PlanBoard;
