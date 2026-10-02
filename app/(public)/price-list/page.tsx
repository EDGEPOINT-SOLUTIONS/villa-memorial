import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { PublicHero } from "@/components/public/public-hero";
import { PublicDisclosure } from "@/components/public/public-disclosure";
import { PageBlocks } from "@/components/villa/page-blocks";
import { heroOr } from "@/lib/page-hero";
import { ListingShell } from "@/components/kit";
import { LOGO_VILLA_AGENCY, LOGO_VILLA_GROUP } from "@/lib/media";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { MonthlyPriceTable } from "@/components/villa/monthly-price-table";
import { PriceIndexNav, PrintListButton } from "@/components/villa/price-index-nav";
import {
  PriceBandHead,
  PriceIndexCollections,
  PriceIndexFrom,
  PriceIndexLedger,
  PriceIndexModels,
  collectionGroups,
} from "@/components/villa/price-index";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { planRateOf } from "@/lib/pricing-model";
import { lotMonthlyPrice, planMonthlyPrice } from "@/lib/monthly-pricing";
import { CASH_ASSISTANCE, CASKET_MODELS, PLAN_TIERS, php } from "@/lib/villa-pricing";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Price list — Villa Funeraria",
  description:
    "Every published 2026 amount — the plan and senior schedules, lot and mausoleum families, the 24 casket models, the complete package and the cash assistance.",
  path: "/price-list",
});

// Reads the pricing store per request — an office edit must be visible here.
export const dynamic = "force-dynamic";

/** The page's static branch list (the plan document's `serving` note, published). */
const BRANCHES: ReadonlyArray<string> = [
  "Funeraria Villa – Capilla de San Jose, Isabela City, Basilan",
  "Funeraria Villa – National Highway, Brgy. Salvacion, Panabo City",
  "Villa ZC-Arcega Funeral Homes – Zamboanga City",
  "All Villa-affiliated funeral parlors around Mindanao",
];

/**
 * PRICE LIST — the 2026 price index (rebuilt 2026-09-30,
 * `villa-price-list-redesign-plan`; captain approved the board and asked to
 * implement it).
 *
 * THE PAGE'S JOB: every published 2026 amount in ONE scannable reference.
 *
 *   · the opening    — the home gateway, not a bare title: eyebrow · h1 at the
 *                      page-title step · one lead · the Print and Ask actions ·
 *                      a four-count facts row · the provenance and the logos;
 *   · the index rail — a figure-bearing, STICKY price index (captain's board
 *                      round 1: "Make this sticky when scrolling"). It pins
 *                      under the public header while scrolling and collapses to
 *                      the shell's phone sheet. Each family carries its live
 *                      “from” figure; a scroll-spy marks the active one;
 *   · the bands      — Plans & packages · Lots & mausoleum · Coffins · The
 *                      package · Branches, each opening on its from-figure;
 *   · the sheets     — every long table stays behind `PublicDisclosure` (in the
 *                      DOM, one tap away) and PRINTS OPEN via the Print action.
 *
 * TYPE. Every section title is TeX Gyre Bonum at the page-title step, weight
 * 500 — never bold (the captain's rule; `.home-band-head__title` carries it).
 *
 * HONESTY. No amount is authored here. Plan rates and lot families are live
 * reads of the pricing store (`loadPricingDocument()` + `planRateOf` /
 * `lotMonthlyPrice`); the 24 casket models, the cash assistance and the
 * inclusions are the client's own sheet constants / page document, read through
 * `lib/villa-pricing.ts` and `lib/plan-content.ts`. The three published packages
 * come from the live catalogue. The a-la-carte service fees, embalming and
 * chapel rates are Request-for-Quote (captain, 2026-09-21) and are NOT here.
 */
export default async function PriceListPage() {
  const [pricing, page, packages, priceListPage] = await Promise.all([
    loadPricingDocument(),
    getPageDocument("plans").catch(() => null),
    listCatalogItems("package").catch(() => null),
    getPageDocument("priceList").catch(() => null),
  ]);
  const hero = heroOr(priceListPage, {
    eyebrow: "Price list 2026",
    headline: "Every published 2026 amount",
    lead: "Plans, lots, coffins and the package — one list.",
  });
  const content = planContentFromDocument(page);
  const groups = collectionGroups(CASKET_MODELS);

  // The monthly-first summaries (Villa Memorial minutes, item 8): the monthly
  // installment leads; the full published schedules stay in the disclosures.
  const planMonthlyRows = PLAN_TIERS.map((tier) => ({
    product: tier.name,
    price: planMonthlyPrice(pricing.plans, tier.id, false),
  }));
  const lotMonthlyRows = pricing.lotCategories.flatMap((category) =>
    category.rows.map((row) => ({
      product: row.product,
      family: category.caption,
      price: lotMonthlyPrice(row.regular),
    })),
  );

  // Every “from” figure is a derived read, never a typed amount.
  const planFrom = Math.min(
    ...PLAN_TIERS.map((tier) => planRateOf(pricing.plans, tier.id, "monthly", false)),
  );
  const seniorFrom = Math.min(
    ...PLAN_TIERS.map((tier) => planRateOf(pricing.plans, tier.id, "monthly", true)),
  );
  const seniorTo = Math.max(
    ...PLAN_TIERS.map((tier) => planRateOf(pricing.plans, tier.id, "monthly", true)),
  );
  const lotFrom = Math.min(
    ...pricing.lotCategories.flatMap((category) =>
      category.rows.map((row) => row.regular.monthly),
    ),
  );
  const coffinFrom = Math.min(...CASKET_MODELS.map((model) => model.srp));
  const cashFrom = Math.min(...CASH_ASSISTANCE.map((row) => row.amount));
  const cashTo = Math.max(...CASH_ASSISTANCE.map((row) => row.amount));

  const indexItems = [
    { id: "plans", label: "Plans & packages", figure: `${php(planFrom)}/mo` },
    { id: "lots", label: "Lots & mausoleum", figure: `${php(lotFrom)}/mo` },
    { id: "coffins", label: "Coffins", figure: php(coffinFrom) },
    { id: "package", label: "The package", figure: `${php(cashFrom)}–${php(cashTo)}` },
    { id: "branches", label: "Branches", figure: `${BRANCHES.length}` },
  ];

  return (
    <div className="plan-flow price-index-page stack-4">
      {/* Printed header — hidden on screen, shown by the price-index print block
          so a printed page is self-describing. */}
      <p className="price-index__print-note">
        Villa Memorial · 2026 price list · 0917 617 8489 · Capilla de San Jose, Isabela City, Basilan
      </p>

      <PublicHero
        variant="interior"
        eyebrow={hero.eyebrow}
        title={hero.headline}
        lead={hero.lead}
      >
        <div className="public-hero__actions">
          <PrintListButton className="btn btn--primary btn--lg">
            Print the 2026 list
          </PrintListButton>
          <Link className="btn btn--secondary btn--lg" href="/contact">
            Ask the park office
          </Link>
        </div>
        <ul className="price-index__facts" aria-label="What this list covers">
          <li>
            <b>{indexItems.length}</b>
            price families
          </li>
          <li>
            <b>{PLAN_TIERS.length}</b>
            plan tiers
          </li>
          <li>
            <b>{CASKET_MODELS.length}</b>
            casket models
          </li>
          <li>
            <b>{pricing.lotCategories.length}</b>
            lot families
          </li>
        </ul>
        <div className="price-index__provenance">
          <p className="text-sm text-muted">
            Served by Funeraria Villa &amp; ZC-Arcega Funeral Homes, underwritten by Villa Agency
            Insurance Services.
          </p>
          <p className="logo-row">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
            <img src={LOGO_VILLA_AGENCY} alt="Villa Agency Insurance Services — Insure. Invest. Prosper." />
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
            <img src={LOGO_VILLA_GROUP} alt="Villa Group of Companies" />
          </p>
        </div>
      </PublicHero>

      <PageBlocks blocks={priceListPage?.blocks ?? []} />

      {/* THE STICKY PRICE INDEX (captain's board round 1). `ListingShell`'s rail
          is `position: sticky` under the public header at ≥64rem and becomes the
          phone sheet below it; `PriceIndexNav` adds the live from-figures and
          the scroll-spy. It is a NAV rail, so no phone `sheetAction` — the shell
          closes its sheet on the anchor's `hashchange`. */}
      <ListingShell
        railLabel="Price index"
        sheetLabel="Price index"
        sheetIcon={false}
        rail={<PriceIndexNav label="Price index" items={indexItems} />}
      >
        {/* 1 · Plans & packages */}
        <section id="plans" className="price-index__band" aria-labelledby="plans-title">
          <PriceBandHead
            id="plans-title"
            kicker="1 · Plans & packages"
            title="The Villa Memorial Plan"
            lead="Five tiers, four ways to pay — regular and senior rates."
            action={
              <Link href="/plans" className="btn btn--secondary">
                See the plan
              </Link>
            }
          />
          <h3 className="price-index__subhead">Monthly installments at a glance</h3>
          <MonthlyPriceTable rows={planMonthlyRows} />
          <p className="price-index__note">
            <b>Senior citizen plan</b> — ages 61–100, no insurance benefit. Senior monthly:{" "}
            {php(seniorFrom)}–{php(seniorTo)}.
          </p>

          {packages === null ? (
            <ErrorState message="The published packages are unavailable right now. Please try again shortly." />
          ) : packages.length === 0 ? (
            <EmptyState title="No packages to compare yet" hint="Check back soon." />
          ) : (
            <div className="price-index__packages">
              <p className="price-index__packages-title">
                The three published packages —{" "}
                <Link href="/plans/packages">Compare the packages</Link>
              </p>
              <ul>
                {packages.map((item) => (
                  <li key={item.sku}>
                    <Link href={`/plans/${item.sku}`}>{item.name}</Link>
                    <b>{item.display_price}</b>
                    {item.description ? (
                      <span className="text-sm text-muted">{item.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PublicDisclosure summary="Show the four payment terms, the eligibility terms and the payment schedule (PHP)">
            <div className="card">
              <div className="card__body stack-3">
                <h3>Eligibility</h3>
                <ul className="stack-3">
                  {content.eligibility.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
                <h3>Limited contestability</h3>
                <p className="text-sm">{content.notes.contestability}</p>
                <h3>Assignable and transferable</h3>
                <p className="text-sm">{content.notes.assign}</p>
              </div>
            </div>
            <PlanPaymentTable
              rows={pricing.plans.regular}
              label="Villa Memorial Plan — regular payment schedule"
            />
            <PlanPaymentTable
              rows={pricing.plans.senior}
              senior
              label="Senior citizen payment schedule"
            />
          </PublicDisclosure>
          <p className="price-index__source">
            Source: PRICE LIST FOR 2026 II &amp; COMPLETE MEMORIAL PACKAGE.
          </p>
        </section>

        {/* 2 · Lots & mausoleum */}
        <section id="lots" className="price-index__band" aria-labelledby="lots-title">
          <PriceBandHead
            id="lots-title"
            kicker="2 · Lots"
            title="Lots & mausoleum"
            lead="Four families, six-year amortization — regular and senior."
            action={
              <>
                <Link href="/lots/price-list-2026" className="btn btn--secondary">
                  Price list page
                </Link>
                <Link href="/map" className="btn btn--secondary">
                  Browse on the map
                </Link>
              </>
            }
          />
          <PriceIndexFrom figures={[{ label: "From", value: `${php(lotFrom)} / month` }]} />
          <PublicDisclosure
            summary={`Show the monthly installments and the ${pricing.lotCategories.length} lot & mausoleum tables`}
          >
            <h3 className="price-index__subhead">Monthly installments at a glance</h3>
            <MonthlyPriceTable rows={lotMonthlyRows} />
            {pricing.lotCategories.map((category) => (
              <div className="card" key={category.title}>
                <div className="card__body stack-3">
                  <h3>{category.title} — 6 years amortization</h3>
                  <div className="table-wrapper" tabIndex={0}>
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
                        {category.rows.map((row) => (
                          <tr key={category.title + row.product}>
                            <td>{row.product}</td>
                            <td className="text-sm">{row.area}</td>
                            <td>{php(row.regular.selling)}</td>
                            <td>{php(row.regular.annual)}</td>
                            <td>{php(row.regular.semi)}</td>
                            <td>{php(row.regular.quarter)}</td>
                            <td>{php(row.regular.monthly)}</td>
                            <td className="blank" aria-hidden="true" />
                            <td>{php(row.senior.selling)}</td>
                            <td>{php(row.senior.annual)}</td>
                            <td>{php(row.senior.semi)}</td>
                            <td>{php(row.senior.quarter)}</td>
                            <td>{php(row.senior.monthly)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </PublicDisclosure>
          <p className="price-index__source">
            Source: PRICE LIST FOR 2026.jpg — the four lot families.
          </p>
        </section>

        {/* 3 · Coffins — the 24-model price index the page was missing. */}
        <section id="coffins" className="price-index__band" aria-labelledby="coffins-title">
          <PriceBandHead
            id="coffins-title"
            kicker="3 · Coffins"
            title="Coffin options"
            lead="24 models in four collections — regular and senior prices."
            action={
              <Link href="/products" className="btn btn--secondary">
                Every model, with photographs
              </Link>
            }
          />
          <PriceIndexFrom figures={[{ label: "From", value: php(coffinFrom) }]} />
          <PriceIndexCollections groups={groups} />
          <PublicDisclosure summary={`Show the ${CASKET_MODELS.length} casket models with prices`}>
            <PriceIndexModels groups={groups} />
          </PublicDisclosure>
          <p className="price-index__source">
            Source: the 2026 casket catalogue (regular SRP &amp; senior-citizen price). The
            photographs are samples from the client&apos;s own set — illustration only; the exact
            cover is confirmed by the office.
          </p>
        </section>

        {/* 4 · The complete package */}
        <section id="package" className="price-index__band" aria-labelledby="package-title">
          <PriceBandHead
            id="package-title"
            kicker="4 · The package"
            title="What every plan includes"
            lead="The five inclusions and the cash assistance."
          />
          <div className="price-index__package">
            <div className="price-index__ledger">
              <h3 className="price-index__ledger-title">Complete memorial package</h3>
              <table className="table">
                <tbody>
                  {content.packageInclusions.map((inclusion) => (
                    <tr key={inclusion.label}>
                      <th scope="row">{inclusion.label}</th>
                      <td className="text-sm">{inclusion.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PriceIndexLedger
              title="Cash assistance with hospital benefit"
              rows={CASH_ASSISTANCE.map((row) => ({ label: row.tiers, value: php(row.amount) }))}
            />
          </div>
          <PublicDisclosure summary="Show the eligibility and the plan conditions">
            <ul className="stack-3">
              {content.eligibility.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
              {content.seniorTerms.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
            <p className="text-sm text-muted">{content.notes.extras}</p>
            <p className="text-sm text-muted">{content.notes.adjust}</p>
          </PublicDisclosure>
          <p className="price-index__source">Source: COMPLETE MEMORIAL PACKAGE.</p>
        </section>

        {/* 5 · Branches */}
        <section id="branches" className="price-index__band" aria-labelledby="branches-title">
          <PriceBandHead
            id="branches-title"
            kicker="5 · Where"
            title="Where you&rsquo;ll find us"
          />
          <ul className="plan-branch-row">
            {BRANCHES.map((branch) => (
              <li key={branch}>{branch}</li>
            ))}
          </ul>
          <p className="price-index__band-action">
            <Link href="/map" className="btn btn--secondary">
              Get directions
            </Link>
          </p>
        </section>
      </ListingShell>

      {/* Footer nav — one short line (no prose wall). */}
      <section className="price-index__footer">
        <p className="text-sm text-muted">
          Compare the <Link href="/plans">five plan tiers</Link>, 2026{" "}
          <Link href="/services">service rates</Link>,{" "}
          <Link href="/products">coffins with prices</Link>, or{" "}
          <Link href="/map?tab=lots">browse plots on the map</Link>. Prices are the published 2026 Villa
          rates, confirmed at the office.
        </p>
      </section>
    </div>
  );
}
