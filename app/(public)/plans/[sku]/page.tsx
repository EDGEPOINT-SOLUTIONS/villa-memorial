import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";
import { PriceList2026Tables } from "@/components/villa/price-list-2026";
import { getCatalogItem } from "@/lib/api-client/commerce";
import type { PlanTier } from "@/lib/villa-pricing";
import {
  CASH_ASSISTANCE,
  VMP_ELIGIBILITY,
  VMP_INCLUSIONS,
  VMP_NOTES,
} from "@/lib/villa-pricing";
import {
  LOGO_VILLA_AGENCY,
  LOGO_VILLA_GROUP,
  PLAN_PACKAGES_IMAGE,
  SAMPLE_PARK_IMAGE,
  TRANSPORT_IMAGE,
} from "@/lib/media";
import { PlanTermSelector } from "./plan-term-selector";
import { AddToCartControl } from "./add-to-cart";

export const metadata = { title: "Plan details — Villa Memorial" };

const TYPE_LABEL: Record<string, string> = {
  package: "Package",
  service: "Service",
  add_on: "Add-on",
};

/**
 * Which plan tier this package page corresponds to. PKG-BASIC is the Bronze 1
 * plan (the reference page's ₱600.00/month), so the term selector opens on the
 * tier the page actually sells; the other packages explore the same five-tier
 * table under the Bronze 1 default until the catalogue import names them.
 */
const TIER_BY_SKU: Record<string, PlanTier> = {
  "PKG-BASIC": "bronze1",
};

/** Best available uploaded photo for a catalogue item (falls back to grounds). */
function mediaFor(item: { item_type: string; sku: string }): string {
  if (item.item_type === "package") return PLAN_PACKAGES_IMAGE;
  if (item.sku === "SRV-DELIVERY") return TRANSPORT_IMAGE;
  return SAMPLE_PARK_IMAGE;
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

  return (
    <div className="stack-4">
      <section className={`hero-premium${isPackage ? " hero-premium--package" : ""}`}>
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">
              <Link href="/plans">Plans &amp; services</Link> · {typeLabel}
            </p>
            <h1 className="hero-premium__title">{item.name}</h1>
            {item.description ? (
              <p className="hero-premium__lead">{item.description}</p>
            ) : (
              <ErrorState message="No description is published for this item yet." />
            )}
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>
              Pricing, discounts, and final totals are confirmed by the store when you
              check out.
            </p>
            <nav className="hero-chips" aria-label="Related plan pages">
              <Link href="/plans/compare">Compare packages</Link>
              <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link>
              <Link href="/plans/senior-benefits">Senior citizen rates</Link>
              <Link href="/plans">Browse all plans &amp; services</Link>
            </nav>
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
                {isPackage ? (
                  <PlanTermSelector
                    item={{
                      sku: item.sku,
                      name: item.name,
                      itemType: item.item_type,
                      unitPriceCents: item.unit_price_cents,
                      currency: item.currency,
                    }}
                    ownTier={TIER_BY_SKU[item.sku] ?? "bronze1"}
                  />
                ) : (
                  <>
                    <div className="row row--space">
                      <Badge tone="info">{typeLabel}</Badge>
                      <code className="text-sm text-muted">{item.sku}</code>
                    </div>
                    <div>
                      <div className="detail-sticky__label">Price</div>
                      <div className="detail-sticky__price">{item.display_price}</div>
                    </div>
                    <div className="detail-sticky__actions">
                      <AddToCartControl
                        item={{
                          sku: item.sku,
                          name: item.name,
                          itemType: item.item_type,
                          unitPriceCents: item.unit_price_cents,
                          currency: item.currency,
                        }}
                      />
                      <Link href="/cart" className="btn btn--secondary btn--sm btn--block">
                        View cart
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {isPackage ? (
        <>
          <p className="plan-quote">“An affordable life plan for all”</p>

          <p className="plan-statement">
            <strong>VILLA MEMORIAL PLAN</strong> is a life plan that assures complete memorial
            services, assignable, transferable and with limited contestability and no forfeiture.
          </p>

          <section className="mid-section" aria-labelledby="inclusions-title">
            <p className="mid-kicker">Complete memorial package</p>
            <h2 id="inclusions-title" className="plan-grid-title">
              What every package includes
            </h2>
            <div className="pkg-inclusions">
              {VMP_INCLUSIONS.map((inc) => (
                <div key={inc.service} className="pkg-inclusion">
                  <h3 className="pkg-inclusion__title">{inc.service}</h3>
                  <p className="pkg-inclusion__text">{inc.detail}</p>
                </div>
              ))}
            </div>
            <div className="pkg-conditions">
              <div className="pkg-condition">
                <h3 className="pkg-condition__title">Eligibility</h3>
                <ul>
                  {VMP_ELIGIBILITY.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="pkg-condition">
                <h3 className="pkg-condition__title">Limited contestability</h3>
                <p>{VMP_NOTES.contestability}</p>
              </div>
              <div className="pkg-condition">
                <h3 className="pkg-condition__title">Assignable and transferable</h3>
                <p>{VMP_NOTES.assign}</p>
              </div>
              <div className="pkg-condition">
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
            <p className="text-sm text-muted" style={{ marginTop: "var(--space-4)" }}>
              {VMP_NOTES.extras} {VMP_NOTES.serving}
            </p>
            <p className="plan-logo-row" aria-label="Villa Agency Insurance Services and Villa Group of Companies">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
              <img src={LOGO_VILLA_AGENCY} alt="Villa Agency Insurance Services — Insure. Invest. Prosper." />
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client logo */}
              <img src={LOGO_VILLA_GROUP} alt="Villa Group of Companies" />
            </p>
          </section>

          <section className="stack-4" aria-labelledby="price-list-title">
            <div className="mid-section">
              <p className="mid-kicker">Price list 2026</p>
              <h2 id="price-list-title" className="plan-grid-title">
                Lots &amp; mausoleum — every product, every term
              </h2>
              <p className="mid-intro">
                Six-year amortization at annual, semi-annual, quarterly and monthly terms, for
                regular and senior-citizen buyers. <strong>{VMP_NOTES.adjust}</strong>
              </p>
            </div>
            <PriceList2026Tables />
            <p className="text-sm text-muted">
              Compare the plan tiers on <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link>,
              senior terms on <Link href="/plans/senior-benefits">Senior citizen rates</Link>, or
              browse the lots on the <Link href="/map">park map</Link>.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
