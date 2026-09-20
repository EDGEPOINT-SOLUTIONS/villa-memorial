import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";
import { getCatalogItem, listCatalogItems } from "@/lib/api-client/commerce";
import { getItemEntry } from "@/lib/api-client/content-entries";
import { itemEntryView } from "@/lib/catalogue-content";
import { ContentBlocks } from "@/components/content/content-blocks";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { planContentFromDocument } from "@/lib/plan-content";
import { CASH_ASSISTANCE, PLAN_TIERS } from "@/lib/villa-pricing";
import { planTierForPackageSku, planTierPackageSku } from "@/lib/catalogue-skus";
import {
  DOC_COMPLETE_PACKAGE,
  DOC_PRICE_LIST_2026_II,
  DOC_PRICE_LIST_2026_III,
  DOC_TYPES_OF_COFFIN,
  LOGO_VILLA_AGENCY,
  LOGO_VILLA_GROUP,
  PLAN_PACKAGES_IMAGE,
  SAMPLE_PARK_IMAGE,
  TRANSPORT_IMAGE,
} from "@/lib/media";
import { PlanTermSelector } from "./plan-term-selector";
import type { TierCartItem } from "./plan-term-selector";
import { AddToCartControl } from "./add-to-cart";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import { pageMetadata } from "@/lib/seo";
import { PriceList2026Module } from "./price-list-2026-module";
import {
  IconCashAssistance,
  IconContestability,
  IconEligibility,
  IconTransfer,
  INCLUSION_ICONS,
} from "./package-icons";

type PlanDetailParams = { params: Promise<{ sku: string }> };

/**
 * Per-item metadata: the catalogue item's own name and recorded description,
 * canonicalised to its SKU URL. An unknown SKU 404s in the page itself, so the
 * head points at the plan index instead of inventing a title.
 */
export async function generateMetadata({ params }: PlanDetailParams): Promise<Metadata> {
  const { sku } = await params;
  const item = await getCatalogItem(decodeURIComponent(sku)).catch(() => null);
  if (!item) {
    return pageMetadata({
      title: "Villa Memorial Plan — Villa Memorial",
      description:
        "Villa Memorial Plan tiers and terms with the client's 2026 payment-mode tables — regular and senior rates, six-year amortization, and what each plan includes.",
      path: "/plans",
    });
  }
  return pageMetadata({
    title: `${item.name} — Villa Memorial`,
    description:
      item.description?.trim() ||
      `${item.name} — the Villa Memorial Plan's inclusions, eligibility and published 2026 prices.`,
    path: `/plans/${item.sku}`,
    image: item.image ?? undefined,
  });
}

// Reads the pricing store per request — an office edit must be visible here.
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  package: "Package",
  service: "Service",
  add_on: "Add-on",
};

/**
 * Catalogue-bound plan tiers for the buy card: every tier the catalogue can
 * price (lib/catalogue-skus.ts). Tiers without a SKU stay request-only, and the
 * selector falls back to the request path for them.
 */
async function packageTierItems(): Promise<TierCartItem[]> {
  try {
    const items = await listCatalogItems();
    const bySku = new Map(items.map((i) => [i.sku, i]));
    return PLAN_TIERS.flatMap(({ id }) => {
      const sku = planTierPackageSku(id);
      const found = sku ? bySku.get(sku) : undefined;
      return found
        ? [
            {
              tier: id,
              cartItem: {
                sku: found.sku,
                name: found.name,
                itemType: found.item_type,
                unitPriceCents: found.unit_price_cents,
                currency: found.currency,
              },
            },
          ]
        : [];
    });
  } catch {
    // The page's own SKU still adds to the cart; other tiers fall back to the
    // request path, so a catalogue hiccup never breaks the plan page.
    return [];
  }
}

/**
 * The package page's second lead line (client's "Package page UI example").
 * Applies to every package; the catalogue description above it is item-specific.
 */
const PACKAGE_TAGLINE =
  "Simple, dignified, and affordable — a complete memorial service to give your loved one the respect they deserve.";

/** Best available uploaded photo for a catalogue item (falls back to grounds).
 * An admin's own photo wins when the catalogue carries one. */
function mediaFor(item: { item_type: string; sku: string; image?: string | null }): string {
  if (item.image) return item.image;
  if (item.item_type === "package") return PLAN_PACKAGES_IMAGE;
  if (item.sku === "SRV-DELIVERY") return TRANSPORT_IMAGE;
  return SAMPLE_PARK_IMAGE;
}

/** Shared related-page chips (both the package and the service hero render them). */
function RelatedPlanChips() {
  return (
    <nav className="hero-chips" aria-label="Related plan pages">
      <Link href="/plans/compare">Compare packages</Link>
      <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link>
      <Link href="/plans/senior-benefits">Senior citizen rates</Link>
      <Link href="/plans">Browse all plans &amp; services</Link>
    </nav>
  );
}

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;

  const item = await getCatalogItem(decodeURIComponent(sku)).catch(() => null);
  if (!item) notFound();

  const typeLabel = TYPE_LABEL[item.item_type] ?? item.item_type.replace("_", "-");
  const isPackage = item.item_type === "package";
  const tierItems = isPackage ? await packageTierItems() : [];

  // The item's authored page content (Phase 4): packages carry an entry; a
  // service line falls back to the catalogue description unchanged.
  const entry = await getItemEntry(item.sku).catch(() => null);
  const authored = itemEntryView(entry, item);
  const authoredPrices = authored.blocks.length > 0 ? await listCatalogItems().catch(() => []) : [];
  const priceBy = new Map(authoredPrices.map((line) => [line.sku, line.display_price]));
  const priceOf = (sku: string) => priceBy.get(sku) ?? null;
  const [pricing, content, plansPage] = await Promise.all([
    loadPricingDocument(),
    listLandingContent(),
    getPageDocument("plans").catch(() => null),
  ]);
  const { contact } = content;
  const plan = planContentFromDocument(plansPage);

  const cartItem = {
    sku: item.sku,
    name: item.name,
    itemType: item.item_type,
    unitPriceCents: item.unit_price_cents,
    currency: item.currency,
  };

  /* ------------------------------------------------------------------------
   * Package pages — the approved prototype, section for section
   * (docs/prototypes/villa-home-ui/package.html, captain 2026-09-16):
   * crumbs → title/lead/tagline → chips → quote → VILLA MEMORIAL PLAN panel →
   * COMPLETE MEMORIAL PACKAGE features + eligibility row → the Official 2026
   * price list module (term-highlight switch + senior toggle + the four
   * amortization families) → The package at a glance evidence strip, with a
   * 28rem rail holding the promo card, the tier × term buy card and the
   * advisor card.
   * --------------------------------------------------------------------- */
  if (isPackage) {
    return (
      <div className="plan-page">
        <p className="crumbs">
          <Link href="/plans">Villa Memorial Plan</Link> <span aria-hidden="true">▸</span>{" "}
          {typeLabel}
        </p>

        <div className="plan-layout">
          <div className="plan-main">
            <section aria-labelledby="pkg-title">
              <h1 className="pkg-title" id="pkg-title">
                {item.name}
              </h1>
              {authored.summary ? <p className="pkg-lead">{authored.summary}</p> : null}
              <p className="pkg-note">{PACKAGE_TAGLINE}</p>
              <RelatedPlanChips />
            </section>

            {authored.blocks.length > 0 ? (
              <section className="mid-section" aria-labelledby="pkg-authored">
                <p className="mid-kicker">From the office</p>
                <h2 id="pkg-authored">More about this package</h2>
                <ContentBlocks blocks={authored.blocks} priceOf={priceOf} />
              </section>
            ) : null}

            <p className="plan-quote">“An affordable life plan for all”</p>

            <p className="plan-statement">
              <strong>VILLA MEMORIAL PLAN</strong> is a life plan that assures complete memorial
              services, assignable, transferable and with limited contestability and no
              forfeiture.
            </p>

            <h2 className="plan-section-title">Complete Memorial Package</h2>

            <section className="pkg-inclusions" aria-label="What the package includes">
              {plan.packageInclusions.map((inc, i) => {
                const IncIcon = INCLUSION_ICONS[i];
                return (
                  <div key={inc.label} className="pkg-inclusion">
                    <span className="pkg-inclusion__icon" aria-hidden="true">
                      {IncIcon ? <IncIcon /> : null}
                    </span>
                    <h3 className="pkg-inclusion__title">{inc.label}</h3>
                    <p className="pkg-inclusion__text">{inc.detail}</p>
                  </div>
                );
              })}
            </section>

            <section className="pkg-conditions" aria-label="Eligibility and benefits">
              <div className="pkg-condition">
                <span className="pkg-condition__icon" aria-hidden="true">
                  <IconEligibility />
                </span>
                <div>
                  <h3 className="pkg-condition__title">Eligibility</h3>
                  <ul>
                    {plan.eligibility.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="pkg-condition">
                <span className="pkg-condition__icon" aria-hidden="true">
                  <IconContestability />
                </span>
                <div>
                  <h3 className="pkg-condition__title">Limited contestability</h3>
                  <p>{plan.notes.contestability}</p>
                </div>
              </div>
              <div className="pkg-condition">
                <span className="pkg-condition__icon" aria-hidden="true">
                  <IconTransfer />
                </span>
                <div>
                  <h3 className="pkg-condition__title">Assignable and transferable</h3>
                  <p>{plan.notes.assign}</p>
                </div>
              </div>
              <div className="pkg-condition">
                <span className="pkg-condition__icon" aria-hidden="true">
                  <IconCashAssistance />
                </span>
                <div>
                  <h3 className="pkg-condition__title">Cash assistance with hospital benefit</h3>
                  <p>
                    {CASH_ASSISTANCE.map((c) => (
                      <span key={c.tiers} className="pkg-cash-line">
                        {`₱${c.amount.toLocaleString("en-PH")}`} for {c.tiers}
                      </span>
                    ))}
                    <em>** During the paying period **</em>
                  </p>
                </div>
              </div>
            </section>

            <section className="mid-section price-module" aria-labelledby="pl-title">
              <PriceList2026Module categories={pricing.lotCategories} />
            </section>

            <section className="mid-section" aria-labelledby="sheet-title">
              <p className="mid-kicker">From the client’s own sheets</p>
              <h2 id="sheet-title">The package at a glance</h2>
              <div className="tribute-strip">
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client sheet */}
                  <img
                    src={DOC_COMPLETE_PACKAGE}
                    alt="Villa Memorial Plan — Complete Memorial Package sheet with the standard payment-mode table"
                  />
                  <figcaption>
                    COMPLETE MEMORIAL PACKAGE sheet — the standard payment-mode table the Plan Term
                    selector reads from.
                  </figcaption>
                </figure>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client sheet */}
                  <img
                    src={DOC_TYPES_OF_COFFIN}
                    alt="Types of Coffins sheet with the senior-citizen payment-mode table and coffin tiers"
                  />
                  <figcaption>
                    TYPES OF COFFINS — coffin tiers plus the senior-citizen payment-mode table
                    (₱550 / month, Bronze 1).
                  </figcaption>
                </figure>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client sheet */}
                  <img
                    src={DOC_PRICE_LIST_2026_II}
                    alt="Price list II — casket collections with SRP, discount and discounted price, plus a-la-carte rates"
                  />
                  <figcaption>
                    PRICE LIST II — casket collections (Dynasty / White Rose / Crown) with SRP,
                    discount and discounted price, plus a-la-carte rates when a family does not
                    take a package (embalming by day, retrieval, delivery, viewing equipment,
                    coffin, interment).
                  </figcaption>
                </figure>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client sheet */}
                  <img
                    src={DOC_PRICE_LIST_2026_III}
                    alt="Price list III — chapel rates, senior rates, flowers, tarp, lapida and family car inclusions"
                  />
                  <figcaption>
                    PRICE LIST III — chapel rates (common &amp; private, regular and senior), plus
                    flowers / tarpaulin / lapida / family-car inclusions per casket type and the
                    ₱1,000 miscellaneous fee note.
                  </figcaption>
                </figure>
              </div>
            </section>
          </div>

          <aside className="plan-side">
            <figure className="promo-figure">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded promo art */}
              <img
                src={PLAN_PACKAGES_IMAGE}
                alt="Villa Memorial Plan — comprehensive packages for your peace of mind"
              />
            </figure>

            <section className="buy-card" aria-labelledby="buy-title">
              <PlanTermSelector
                pricing={pricing.plans}
                item={cartItem}
                ownTier={planTierForPackageSku(item.sku) ?? "bronze1"}
                tierItems={tierItems}
              />
            </section>

            <section className="buy-card" aria-labelledby="advisor-title">
              <div className="buy-card__label" id="advisor-title">
                Talk to our memorial care advisor
              </div>
              <p className="plan-advisor__line">
                <a className="plan-advisor__phone" href={contact.phoneHref}>
                  Call {contact.phoneDisplay}
                </a>
                <br />
                <span className="text-sm text-muted">
                  {contact.phoneLabel} · {contact.location}
                </span>
              </p>
              <div className="logo-row">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
                <img src={LOGO_VILLA_AGENCY} alt="Villa Agency Insurance Services" />
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
                <img src={LOGO_VILLA_GROUP} alt="Villa Group of Companies" />
              </div>
              <p className="plan-note">
                Villa Memorial Plan is underwritten by Eternal Plans, Inc., 20th Floor Citystate
                Center, 709 Shaw Boulevard, Pasig City. Memorial services are rendered by accredited
                mortuaries of Eternal Plans, Inc.
              </p>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------
   * Services / add-ons keep the premium hero (unchanged), with the storefront's
   * two actions on the sticky card: Add to cart for this SKU, plus the
   * prefilled Request order for anything the cart cannot settle.
   * --------------------------------------------------------------------- */
  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">
              <Link href="/plans">Villa Memorial Plan</Link> · {typeLabel}
            </p>
            <h1 className="hero-premium__title">{item.name}</h1>
            {authored.summary ? (
              <p className="hero-premium__lead">{authored.summary}</p>
            ) : (
              <ErrorState message="No description is published for this item yet." />
            )}
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>
              Pricing, discounts, and final totals are confirmed by the store when you
              check out.
            </p>
            <RelatedPlanChips />
          </div>

          <div className="stack">
            <figure className="hero-premium__media">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo */}
              <img src={mediaFor(item)} alt={item.name} />
              <figcaption>
                {typeLabel} · {item.sku}
              </figcaption>
            </figure>

            <aside className="card detail-sticky">
              <div className="card__body stack-4">
                <div className="row row--space">
                  <Badge tone="info">{typeLabel}</Badge>
                  <code className="text-sm text-muted">{item.sku}</code>
                </div>
                <div>
                  <div className="detail-sticky__label">Price</div>
                  <div className="detail-sticky__price">{item.display_price}</div>
                </div>
                <div className="detail-sticky__actions">
                  <AddToCartControl item={cartItem} />
                  <Link
                    href={buildRequestHref({
                      item: item.name,
                      sku: item.sku,
                      price: item.display_price,
                      note: `${typeLabel} from the 2026 catalogue — please confirm availability and the next steps.`,
                    })}
                    className="btn btn--secondary btn--sm btn--block"
                  >
                    Request order
                  </Link>
                  <Link href="/cart" className="btn btn--secondary btn--sm btn--block">
                    View cart
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
