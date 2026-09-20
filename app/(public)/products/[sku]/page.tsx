import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import {
  CasketFacts,
  CasketInclusionPanel,
  CasketPriceGrid,
  CasketSampleFigure,
} from "@/components/villa/casket-detail";
import { getCatalogItem } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";
import { casketDetailHref, coffinModelForSku, coffinSku } from "@/lib/catalogue-skus";
import { CASKET_MODELS, COFFINS, COFFIN_TIER_NOTE, php } from "@/lib/villa-pricing";
import { casketSamplePhoto } from "@/lib/media";
import { clientPhotoWide } from "@/lib/client-photos";
import { buildRequestHref } from "@/lib/public-forms/request-prefill";
import { pageMetadata } from "@/lib/seo";

/**
 * Casket detail — /products/[sku] (the "View details" action on every catalogue
 * card). A route rather than a dialog: the page follows the app's existing
 * /plans/[sku] detail pattern, so a model is linkable, shareable and readable
 * without JavaScript, and every fact comes from data (the catalogue entry plus
 * lib/villa-pricing.ts) instead of being typed into the view.
 *
 * The URL carries the catalogue SKU from lib/catalogue-skus.ts; the sheet model
 * is resolved by that map, so a stale or hand-typed slug 404s instead of
 * rendering a half-filled page.
 */

type CasketDetailParams = { params: Promise<{ sku: string }> };

// Reads the landing contact document per request — the advisor card's number is
// the same staff-editable one the header prints, never a typed placeholder.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CasketDetailParams): Promise<Metadata> {
  const { sku } = await params;
  const model = coffinModelForSku(decodeURIComponent(sku));
  if (!model) {
    // Unknown SKU: the route 404s; canonicalise the head to the catalogue.
    return pageMetadata({
      title: "Coffins & caskets — Villa Memorial",
      description:
        "The client's full 2026 casket catalogue at published prices — SRP, senior-citizen price and the inclusions per family.",
      path: "/products",
    });
  }
  const sample = casketSamplePhoto(model);
  return pageMetadata({
    title: `${model.model} casket — 2026 price — Villa Memorial`,
    description: `${model.model} (${model.collection}) — the client's 2026 SRP of ${php(model.srp)} and the senior-citizen price of ${php(model.seniorPrice)}, with the inclusions this model carries.`,
    // Canonicalise every case/spelling variant to the sheet's own SKU URL.
    path: `/products/${coffinSku(model.model)}`,
    // The share card takes the feature crop (3:2, the largest published width),
    // not the 4:3 catalogue thumbnail.
    image: clientPhotoWide(sample.id).src,
    imageAlt: `Illustrative sample coffin — ${sample.alt}`,
  });
}

/** Chips shared by the detail page's hero. */
function RelatedChips() {
  return (
    <nav className="hero-chips" aria-label="Related pages">
      <Link href="/products">All coffins &amp; caskets</Link>
      <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link>
      <Link href="/services">Memorial service rates</Link>
      <Link href="/lots/price-list-2026">2026 lot price list</Link>
      <Link href="/contact">Ask the office</Link>
    </nav>
  );
}

export default async function CasketDetailPage({ params }: CasketDetailParams) {
  const { sku } = await params;
  const model = coffinModelForSku(decodeURIComponent(sku));
  if (!model) notFound();

  let item: Awaited<ReturnType<typeof getCatalogItem>>;
  try {
    // The SKU comes from the shared map (never the URL), so the page always
    // prices the model it resolved.
    item = await getCatalogItem(coffinSku(model.model));
  } catch {
    return (
      <div className="stack-4">
        <h1>{model.model} casket</h1>
        <ErrorState message="The casket catalogue is unavailable right now, so this model's 2026 price cannot be shown. Please try again shortly." />
      </div>
    );
  }

  const siblings = CASKET_MODELS.filter((m) => m.collection === model.collection && m.model !== model.model);

  const { contact } = await listLandingContent();

  return (
    <div className="plan-page">
      <p className="crumbs">
        <Link href="/products">Coffins &amp; caskets</Link> <span aria-hidden="true">▸</span>{" "}
        {model.collection}
      </p>

      <div className="plan-layout">
        <div className="plan-main">
          <section aria-labelledby="casket-title">
            <p className="mid-kicker">{model.collection}</p>
            <h1 className="pkg-title" id="casket-title">
              {item.name}
            </h1>
            <p className="pkg-lead">{item.description}</p>
            <p className="pkg-note">
              Every figure below is the client&rsquo;s own 2026 published price — the SRP, the
              senior-citizen SRP, the senior discount and the discounted price the sheet prints
              against this model.
            </p>
            <RelatedChips />
          </section>

          <CasketSampleFigure model={model} />

          <section className="mid-section" aria-labelledby="casket-glance">
            <p className="mid-kicker">From the client&rsquo;s 2026 sheets</p>
            <h2 id="casket-glance">This model at a glance</h2>
            <p className="mid-intro">
              Where the sheet files the model, the cover its name states, and the four published
              prices.
            </p>
            <CasketFacts model={model} item={item} />
            <h3 className="casket-subtitle">Published 2026 prices</h3>
            <CasketPriceGrid model={model} />
            <p className="mid-note">
              Senior citizens are 61–100 years old with no insurance benefit. The office confirms
              the final price on the order.
            </p>
          </section>

          <section className="mid-section" aria-labelledby="casket-included">
            <p className="mid-kicker">PRICE LIST FOR 2026 III</p>
            <h2 id="casket-included">What comes with this model</h2>
            <p className="mid-intro">
              The {model.family} family row, exactly as the sheet prints it — flowers, tarp,
              lapida, family car, one dozen roses and the thank-you card — plus the package&rsquo;s
              own chapel day rates.
            </p>
            <CasketInclusionPanel model={model} />
          </section>

          <section className="mid-section" aria-labelledby="casket-samples">
            <p className="mid-kicker">The client&rsquo;s own photographs</p>
            <h2 id="casket-samples">How the five tiers are shown</h2>
            <p className="mid-intro">
              Each tier below carries one sample from the client&rsquo;s own 2026 photographs, chosen
              for the lid line its sheet name states — the office confirms the cover before
              anything is reserved. {COFFIN_TIER_NOTE}
            </p>
            <div className="casket-sample-strip">
              {COFFINS.map((coffin) => (
                <figure key={coffin.tier} className="tribute-figure">
                  {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
                  <img
                    src={coffin.photo}
                    alt={`Illustrative sample coffin — ${coffin.tier}, ${coffin.lid}`}
                    loading="lazy"
                  />
                  <figcaption>
                    <strong>{coffin.tier}</strong>
                    <span>{coffin.lid}</span>
                    <span className="casket-sample__mini">Sample photograph</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        </div>

        <aside className="plan-side">
          <section className="buy-card" aria-labelledby="casket-buy">
            <div className="buy-card__label" id="casket-buy">
              {item.name} · 2026 price
            </div>
            <div>
              <div className="detail-sticky__label">Published price</div>
              <div className="detail-sticky__price">{item.display_price}</div>
            </div>
            <p className="plan-advisor__line">
              <span className="text-sm text-muted">
                Senior citizens pay <strong>{php(model.seniorPrice)}</strong> (61–100, no
                insurance benefit). Regular SRP {php(model.srp)}.
              </span>
            </p>
            <div className="plan-buy-actions">
              <CatalogueActions
                item={{
                  sku: item.sku,
                  name: item.name,
                  itemType: item.item_type,
                  unitPriceCents: item.unit_price_cents,
                  currency: item.currency,
                }}
                displayPrice={item.display_price}
                prefill={{
                  price: item.display_price,
                  note: `${model.collection} · ${model.family} family. Regular SRP ${php(model.srp)}; senior-citizen price ${php(model.seniorPrice)} (61–100, no insurance benefit).`,
                }}
              />
              <Link href="/cart" className="btn btn--secondary btn--sm btn--block">
                View cart
              </Link>
            </div>
          </section>

          <section className="buy-card" aria-labelledby="casket-advisor">
            <div className="buy-card__label" id="casket-advisor">
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
            <p className="plan-note">
              Not sure which cover or model suits the family? Send a request with this model — the
              office confirms availability and the final price before anything is reserved.
            </p>
            <Link
              href={buildRequestHref({
                item: `${model.model} casket`,
                sku: item.sku,
                price: item.display_price,
                note: `Model question — ${model.collection}, ${model.family} family. Nothing is reserved by this request.`,
              })}
              className="btn btn--secondary btn--sm btn--block"
            >
              Request a model check
            </Link>
          </section>

          {siblings.length > 0 ? (
            <section className="buy-card" aria-labelledby="casket-siblings">
              <div className="buy-card__label" id="casket-siblings">
                Also in {model.collection}
              </div>
              <ul className="casket-siblings">
                {siblings.map((m) => (
                  <li key={m.model}>
                    <Link href={casketDetailHref(m.model)}>{m.model}</Link>
                    <span className="text-sm text-muted">{php(m.srp)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-sm text-muted" style={{ margin: 0 }}>
            <Badge tone="accent">Casket</Badge> Included in every{" "}
            <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link> tier; senior
            citizens enjoy the <Link href="/plans/senior-benefits">senior plan</Link> with free
            flowers.
          </p>
        </aside>
      </div>
    </div>
  );
}
