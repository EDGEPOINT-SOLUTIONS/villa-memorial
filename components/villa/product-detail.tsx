"use client";

/**
 * Product detail with the variant selector (P2 of data/villa-pdp-cms-plan/report.md
 * §5) — the client half of `/products/[sku]`.
 *
 * ONE PASS, LOCAL SWAP. The server page resolves the line and EVERY sibling
 * entry in one read and hands them here as `variants`, so choosing a model is
 * local state: the gallery, price, specs, description and rule-derived facts
 * re-render in the same React commit, with no navigation and no round-trip.
 *
 * THE SELECTOR. An Amazon-style `role="radiogroup"` of `role="radio"` buttons —
 * one thumbnail + name per model, `aria-checked` for the selection, arrow keys
 * to move (Home/End to the ends), and an `aria-live` line announcing the swap.
 * Selecting calls `history.replaceState` so the URL stays the selected model's
 * own SKU page (captain's Q6) while the canonical stays per-SKU (the server head).
 *
 * PER-VARIANT SPECS. The page resolves `resolveSpecs(line, variant)` (P0), so a
 * line's shared rows print for every model and a variant authors only its deltas.
 *
 * IMAGERY FALLBACK, in priority order (the report's §5): the variant's own
 * authored gallery; otherwise the rule-derived sample photograph with its
 * "Sample photograph" chip and the sheet's substitution note; otherwise an
 * honest text placeholder — never another variant's photograph silently. (A
 * line-level shared gallery is NOT part of the confirmed P0 `ProductLine` model,
 * so that rung does not exist here.)
 *
 * MONEY IS ALWAYS THE SELECTED VARIANT'S LIVE CATALOGUE PRICE — never authored,
 * never carried across the swap.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import type { CatalogItem } from "@/lib/api-client/commerce";
import type { ContentBlock, ContentImage, ContentSpecs, RichTextDoc } from "@/lib/content-catalog";
import { php, type CasketModel } from "@/lib/villa-pricing";
import {
  CasketFacts,
  CasketInclusionPanel,
  CasketPriceGrid,
  CasketSampleFigure,
} from "@/components/villa/casket-detail";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import { ContentBlocks } from "@/components/content/content-blocks";
import { RichText } from "@/components/content/rich-text";
import { SpecsTable } from "@/components/content/specs-table";
import { PdpGallery } from "@/components/villa/pdp-gallery";

/** Everything one variant renders from — plain, serializable data. */
export type PdpVariant = {
  sku: string;
  name: string;
  /** The variant's own per-SKU URL, used by `history.replaceState`. */
  href: string;
  /** The sheet model behind the SKU (rule-derived facts); null for a manual line. */
  model: CasketModel | null;
  /** The live catalogue record — the price authority. */
  item: CatalogItem;
  summary: string;
  description: RichTextDoc | null;
  /** The variant's own authored gallery; empty means the fallback chain. */
  gallery: ContentImage[];
  /** Already resolved against the line's shared specs on the server. */
  specs: ContentSpecs | null;
  blocks: ContentBlock[];
  /** The selector thumbnail (rule-derived), or null for a text-only chip. */
  thumb: string | null;
};

/** The variant a SKU selects, falling back to the first for an unknown SKU. */
export function activeVariant(variants: PdpVariant[], sku: string): PdpVariant | undefined {
  return variants.find((variant) => variant.sku === sku) ?? variants[0];
}

/** Chips shared by the detail page's hero. */
function RelatedChips() {
  return (
    <nav className="hero-chips" aria-label="Related pages">
      <Link href="/products">All coffins &amp; caskets</Link>
      <Link href="/price-list">Price list</Link>
      <Link href="/services">Memorial service rates</Link>
      <Link href="/lots/price-list-2026">2026 lot price list</Link>
      <Link href="/contact">Ask the office</Link>
    </nav>
  );
}

export function ProductDetail({
  lineName,
  selectedSku,
  variants,
  pricesBySku,
  staticAside,
  staticBelowFold,
}: {
  lineName: string;
  selectedSku: string;
  variants: PdpVariant[];
  /** Every catalogue display price, so an authored price block can resolve. */
  pricesBySku: Record<string, string>;
  staticAside?: ReactNode;
  staticBelowFold?: ReactNode;
}) {
  const [selected, setSelected] = useState(selectedSku);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const variant = activeVariant(variants, selected);
  const model = variant?.model ?? null;

  function choose(next: PdpVariant) {
    setSelected(next.sku);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", next.href);
    }
  }

  function onSelectorKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = variants.length;
    if (count === 0) return;
    let next = index;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = variants[next];
    if (!target) return;
    choose(target);
    buttonRefs.current[next]?.focus();
  }

  if (!variant) return null;

  return (
    <div className="plan-layout">
      <div className="plan-main">
        <section aria-labelledby="casket-title">
          <p className="mid-kicker">{lineName}</p>
          <h1 className="pkg-title" id="casket-title">
            {variant.name}
          </h1>
          {variant.summary ? <p className="pkg-lead">{variant.summary}</p> : null}
          <p className="pkg-note">
            Every figure below is the client&rsquo;s own 2026 published price — the SRP, the
            senior-citizen SRP, the senior discount and the discounted price the sheet prints
            against this model.
          </p>
          <RelatedChips />
        </section>

        {variant.gallery.length > 0 ? (
          <PdpGallery key={variant.sku} images={variant.gallery} label={variant.name} />
        ) : model ? (
          <CasketSampleFigure model={model} />
        ) : (
          <p className="pdp-gallery__placeholder" role="note">
            Photographs for this model are being prepared — the office will show them before you
            commit.
          </p>
        )}

        {variant.description ? (
          <section className="mid-section" aria-labelledby="casket-about">
            <p className="mid-kicker">From the office</p>
            <h2 id="casket-about">About this model</h2>
            <RichText doc={variant.description} />
          </section>
        ) : null}

        {variant.specs && variant.specs.columns.length > 0 ? (
          <section className="mid-section" aria-labelledby="casket-specs">
            <p className="mid-kicker">Specifications</p>
            <h2 id="casket-specs">Specifications</h2>
            <SpecsTable
              specs={variant.specs}
              caption={`${variant.name} — as recorded by the office`}
            />
          </section>
        ) : null}

        {variant.blocks.length > 0 ? (
          <section className="mid-section" aria-labelledby="casket-authored">
            <p className="mid-kicker">From the office</p>
            <h2 id="casket-authored">More about this model</h2>
            <ContentBlocks
              blocks={variant.blocks}
              priceOf={(sku) => pricesBySku[sku] ?? null}
            />
          </section>
        ) : null}

        {model ? (
          <section className="mid-section" aria-labelledby="casket-glance">
            <p className="mid-kicker">From the client&rsquo;s 2026 sheets</p>
            <h2 id="casket-glance">This model at a glance</h2>
            <p className="mid-intro">
              Where the sheet files the model, the cover its name states, and the four published
              prices.
            </p>
            <CasketFacts model={model} item={variant.item} />
            <h3 className="casket-subtitle">Published 2026 prices</h3>
            <CasketPriceGrid model={model} />
            <p className="mid-note">
              Senior citizens are 61–100 years old with no insurance benefit. The office confirms
              the final price on the order.
            </p>
          </section>
        ) : null}

        {model ? (
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
        ) : null}

        {staticBelowFold}
      </div>

      <aside className="plan-side">
        <section className="buy-card" aria-labelledby="casket-buy">
          <div className="buy-card__label" id="casket-buy">
            {variant.name} · 2026 price
          </div>

          <div className="pdp-variants">
            <p className="pdp-variants__label" id="pdp-variants-label">
              Choose a model
            </p>
            <div
              className="pdp-variants__list"
              role="radiogroup"
              aria-labelledby="pdp-variants-label"
            >
              {variants.map((option, index) => {
                const active = option.sku === variant.sku;
                return (
                  <button
                    key={option.sku}
                    ref={(element) => {
                      buttonRefs.current[index] = element;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={option.name}
                    className={`pdp-variant${active ? " pdp-variant--active" : ""}`}
                    onClick={() => choose(option)}
                    onKeyDown={(event) => onSelectorKeyDown(event, index)}
                  >
                    <span className="pdp-variant__thumb">
                      {option.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element -- client sample photo
                        <img src={option.thumb} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="pdp-variant__thumb--empty" aria-hidden="true">
                          {option.name.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className="pdp-variant__name">{option.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="pdp-variants__live" aria-live="polite">
              Now showing {variant.name}, {variant.item.display_price}.
            </p>
          </div>

          <div>
            <div className="detail-sticky__label">Published price</div>
            <div className="detail-sticky__price">{variant.item.display_price}</div>
          </div>

          {model ? (
            <p className="plan-advisor__line">
              <span className="text-sm text-muted">
                Senior citizens pay <strong>{php(model.seniorPrice)}</strong> (61–100, no
                insurance benefit). Regular SRP {php(model.srp)}.
              </span>
            </p>
          ) : null}

          <div className="plan-buy-actions">
            <CatalogueActions
              key={variant.sku}
              item={{
                sku: variant.item.sku,
                name: variant.item.name,
                itemType: variant.item.item_type,
                unitPriceCents: variant.item.unit_price_cents,
                currency: variant.item.currency,
              }}
              displayPrice={variant.item.display_price}
              prefill={{
                price: variant.item.display_price,
                note: model
                  ? `${model.collection} · ${model.family} family. Regular SRP ${php(model.srp)}; senior-citizen price ${php(model.seniorPrice)} (61–100, no insurance benefit).`
                  : undefined,
              }}
            />
            <Link href="/cart" className="btn btn--secondary btn--sm btn--block">
              View cart
            </Link>
          </div>
        </section>

        {staticAside}
      </aside>
    </div>
  );
}
