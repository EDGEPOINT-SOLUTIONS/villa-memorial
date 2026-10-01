import Link from "next/link";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { PLAN_TIERS, php } from "@/lib/villa-pricing";
import { planTermOptionsOf, type PlanTier } from "@/lib/pricing-model";
import { PAPER_PROFILES } from "@/lib/export/paper-profile";
import { line, paperFileStem, space, table, type PaperBlock } from "@/lib/export/types";
import { PaperSheet } from "@/components/paper/paper-sheet";
import { PaperExportActions } from "@/components/paper/paper-export-actions";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import { FAMILY_HELP } from "@/lib/family/contact";

export const dynamic = "force-dynamic";
export const metadata = { title: "Price a plan — Villa Funeraria agent portal" };

const TIER_IDS = PLAN_TIERS.map((t) => t.id);

function isTier(value: string | undefined): value is PlanTier {
  return TIER_IDS.includes(value as PlanTier);
}

function longDate(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

/**
 * Price a plan (the captain's accepted plan, 2026-10-01) — the agent's own quote
 * desk.
 *
 * The figures are the office's OWN 2026 list, read from the editable pricing
 * store (`loadPricingDocument()`), never typed by an agent: the same table the
 * office quotes from. The screen and the printed paper are built from ONE set of
 * `PaperBlock`s, so the sheet on screen is the sheet the family gets — Print,
 * Word and PDF all carry it. Nothing here reserves anything: a quote is an
 * enquiry, and the office confirms the final amount on the contract.
 */
export default async function AgentQuotePage({
  searchParams,
}: {
  searchParams?: Promise<{ tier?: string; senior?: string }>;
}) {
  const session = await requirePortalSessionOrRedirect("agent");
  const params = (await searchParams) ?? {};
  const tier: PlanTier = isTier(params.tier) ? params.tier : "bronze2";
  const senior = params.senior === "1";
  const tierName = PLAN_TIERS.find((t) => t.id === tier)?.name ?? tier;

  const pricing = await loadPricingDocument();
  const terms = planTermOptionsOf(pricing.plans, tier, false);
  const seniorTerms = planTermOptionsOf(pricing.plans, tier, true);
  const profile = PAPER_PROFILES["family-request"];

  const now = new Date();
  const quoteBlocks: PaperBlock[] = [
    line("VILLA MEMORIAL — SANCTUARIO DE MERCEDES Y GLORIA", {
      bold: true,
      align: "center",
      caps: true,
      typeface: "heading",
      size: 12,
      spaceAfter: 2,
    }),
    line("QUOTATION — MEMORIAL PLAN", { bold: true, align: "center", caps: true, size: 11, spaceAfter: 8 }),
    line(`Prepared for: ${session.displayName}`),
    line(`Agent: ${session.email}`),
    line(`Date: ${longDate(now)}`),
    space(6),
    line(`Plan: ${tierName}`, { bold: true, spaceAfter: 4 }),
    line(
      "The four payment modes, regular and senior-citizen (61–100 years old, no insurance benefit).",
      { spaceAfter: 6 },
    ),
    table(
      3,
      [
        ...terms.map((term, i) => [
          { value: term.label },
          { value: php(term.amount) },
          { value: php(seniorTerms[i]?.amount ?? 0) },
        ]),
      ],
      { head: ["Payment mode", "Regular", "Senior citizen"], widths: [0.5, 0.25, 0.25] },
    ),
    space(8),
    line(
      "These figures are the office's 2026 price list as the office keeps it. This is a quotation, not a reservation: the office confirms the final amount on the contract.",
      { size: 9 },
    ),
    line("Office: " + FAMILY_HELP.phone + " · " + FAMILY_HELP.hours, { size: 9 }),
  ];

  return (
    <div className="workbench">
      <header className="wb-head">
        <div className="wb-head__text">
          <p className="wb-head__eyebrow">Price a plan · the office&apos;s 2026 list</p>
          <h1 className="wb-head__title">Price it from the office&apos;s own sheet.</h1>
          <p className="wb-head__lead">
            Choose a plan, read the real figure for every payment mode, and print the sheet. Nothing
            here reserves a plan — an enquiry, and the office confirms.
          </p>
        </div>
        <div className="wb-head__actions">
          <a className="btn btn--secondary" href={FAMILY_HELP.phoneHref}>
            Call the office
          </a>
        </div>
      </header>

      <section className="wb-panel" aria-label="Choose a plan">
        <div className="wb-panel__body">
          <div className="wb-chips" role="group" aria-label="Plan">
            {PLAN_TIERS.map((t) => (
              <Link
                key={t.id}
                className="ag-filter"
                data-on={t.id === tier ? "yes" : "no"}
                aria-current={t.id === tier ? "true" : undefined}
                href={`/agent/quote?tier=${t.id}${senior ? "&senior=1" : ""}`}
              >
                {t.name}
              </Link>
            ))}
          </div>
          <div className="wb-chips" role="group" aria-label="Rate table">
            <Link
              className="ag-filter"
              data-on={senior ? "no" : "yes"}
              aria-current={senior ? undefined : "true"}
              href={`/agent/quote?tier=${tier}`}
            >
              Regular rates
            </Link>
            <Link
              className="ag-filter"
              data-on={senior ? "yes" : "no"}
              aria-current={senior ? "true" : undefined}
              href={`/agent/quote?tier=${tier}&senior=1`}
            >
              Senior-citizen rates
            </Link>
          </div>
        </div>
      </section>

      <div className="wb-grid">
        <section className="wb-panel wb-span-6" aria-label="Payment modes">
          <div className="wb-panel__head">
            <p className="wb-panel__label">{senior ? "Senior citizen" : "Regular"}</p>
            <div className="wb-panel__title-row">
              <h2 className="wb-panel__title">{tierName} plan</h2>
              <a className="wb-panel__more" href="#paper">
                See the sheet ↓
              </a>
            </div>
          </div>
          <div className="wb-panel__body">
            <div className="table-wrapper" tabIndex={0} role="region" aria-label="Payment modes">
              <table className="table wb-table">
                <thead>
                  <tr>
                    <th scope="col">Payment mode</th>
                    <th scope="col" className="table__numeric">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(senior ? seniorTerms : terms).map((term) => (
                    <tr key={term.term}>
                      <th scope="row">{term.label}</th>
                      <td className="table__numeric" data-label="Amount">
                        {php(term.amount)} {term.per}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="wb-note">
              {senior
                ? "Senior rates apply at 61–100 years old with no insurance benefit. Ask the office which rate fits the person."
                : "Senior-citizen rates are the second table above — ask the office which rate fits the person."}
            </p>
            <a
              className="btn btn--primary"
              href={buildRequestHref({
                item: `${tierName} plan — quote`,
                price: php((senior ? seniorTerms : terms)[0]?.amount ?? 0),
                note: senior
                  ? "Senior-citizen rates (61–100 years old, no insurance benefit)."
                  : "Villa Memorial Plan enquiry.",
              })}
            >
              Request this plan
            </a>
          </div>
        </section>

        <section className="wb-panel wb-span-6" aria-label="Lot prices">
          <div className="wb-panel__head">
            <p className="wb-panel__label">Lots</p>
            <div className="wb-panel__title-row">
              <h2 className="wb-panel__title">The 2026 lot sheet</h2>
            </div>
          </div>
          <div className="wb-panel__body">
            <div className="table-wrapper" tabIndex={0} role="region" aria-label="Lot families">
              <table className="table wb-table">
                <thead>
                  <tr>
                    <th scope="col">Family</th>
                    <th scope="col" className="table__numeric">
                      Selling
                    </th>
                    <th scope="col" className="table__numeric">
                      Monthly
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.lotCategories.flatMap((category) =>
                    category.rows.map((row) => (
                      <tr key={`${category.title}-${row.product}`}>
                        <th scope="row">
                          {row.product}
                          <span className="wb-table__sub">
                            {row.area} sqm · {category.caption}
                          </span>
                        </th>
                        <td className="table__numeric" data-label="Selling">
                          {php(row.regular.selling)}
                        </td>
                        <td className="table__numeric" data-label="Monthly">
                          {php(row.regular.monthly)}/mo
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
            <p className="wb-note">
              The same families the office quotes; a per-plot figure is confirmed by the office on the
              map. Show the park map and prices from{" "}
              <Link href="/agent/lots">Lot availability</Link>.
            </p>
          </div>
        </section>
      </div>

      <section className="wb-panel" id="paper" aria-label="The printed sheet">
        <div className="wb-panel__head">
          <p className="wb-panel__label">Paper</p>
          <div className="wb-panel__title-row">
            <h2 className="wb-panel__title">The quotation sheet</h2>
            <span className="wb-panel__count">what the family gets</span>
          </div>
        </div>
        <div className="wb-panel__body">
          <PaperSheet blocks={quoteBlocks} profile={profile} />
          <PaperExportActions
            blocks={quoteBlocks}
            profile={profile}
            filename={paperFileStem([session.displayName, tierName, senior ? "senior" : "regular", "quote"])}
          />
          <p className="wb-note">
            Print, Word and PDF all render the same sheet. The figures are a quotation; the office
            confirms the final amount on the contract.
          </p>
        </div>
      </section>
    </div>
  );
}
