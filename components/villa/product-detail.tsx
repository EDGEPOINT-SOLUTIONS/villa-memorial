"use client";

/**
 * Product detail — the Amazon STRUCTURE in our tokens and kit (P3 of
 * data/villa-pdp-cms-plan/report.md §6, the captain's 2026-09-21 removal
 * direction). The client half of `/products/[sku]`.
 *
 * THE LAYOUT. A two-row grid (`.pdp-layout`): the sticky gallery on the left
 * (`.pdp-media`, `position: sticky` at desktop) and the buy box on the right
 * (`.pdp-buy`); the editable content spans both columns below the fold
 * (`.pdp-below`). Below `64rem` it collapses to one column in DOM order —
 * gallery, buy box, content — which is the Amazon phone stack. The gallery is a
 * `<figure>`, so the buy box is the first `<section>` a reader reaches.
 *
 * THE BUY BOX. Collection eyebrow · the selected variant's h1 · its one-line
 * lead · the P2 variant selector · the live catalogue price (and the model's
 * sheet senior line) · the honest availability/trust lines · the ONE primary
 * action (Add to cart) with Request order beside it.
 *
 * BELOW THE FOLD. Everything here comes from the catalogue entry: the typed rich
 * description, the authored feature bullets (`bullets` blocks), the formatted
 * specs table and the remaining authored blocks. Nothing is rule-derived prose.
 *
 * THE SELECTOR. An Amazon-style `role="radiogroup"` of `role="radio"` buttons —
 * one thumbnail + name per model, `aria-checked` for the selection, arrow keys to
 * move (Home/End to the ends), and an `aria-live` line announcing the swap.
 * Selecting calls `history.replaceState` so the URL stays the selected model's
 * own SKU page (captain's Q6) while the canonical stays per-SKU (the server head).
 *
 * PER-VARIANT SPECS. The page resolves `resolveSpecs(line, variant)` (P0), so a
 * line's shared rows print for every model and a variant authors only its deltas.
 *
 * IMAGERY FALLBACK, in priority order (the report's §5): the variant's own
 * authored gallery; otherwise the rule-derived sample photograph with the sheet's
 * short illustration label; otherwise an honest text placeholder — never another
 * variant's photograph silently.
 *
 * MONEY IS ALWAYS THE SELECTED VARIANT'S LIVE CATALOGUE PRICE — never authored,
 * never carried across the swap.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import type { CatalogItem } from "@/lib/api-client/commerce";
import type { ContactInfo } from "@/lib/api-client/landing";
import type { ContentBlock, ContentImage, ContentSpecs, RichTextDoc } from "@/lib/content-catalog";
import { php, type CasketModel } from "@/lib/villa-pricing";
import { CasketSampleFigure } from "@/components/villa/casket-detail";
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

type BulletsBlock = Extract<ContentBlock, { type: "bullets" }>;

function isBulletsBlock(block: ContentBlock): block is BulletsBlock {
  return block.type === "bullets";
}

/** The variant a SKU selects, falling back to the first for an unknown SKU. */
export function activeVariant(variants: PdpVariant[], sku: string): PdpVariant | undefined {
  return variants.find((variant) => variant.sku === sku) ?? variants[0];
}

export function ProductDetail({
  lineName,
  selectedSku,
  variants,
  pricesBySku,
  contact,
  aside,
  mediaBaseUrl = null,
}: {
  lineName: string;
  selectedSku: string;
  variants: PdpVariant[];
  /** Every catalogue display price, so an authored price block can resolve. */
  pricesBySku: Record<string, string>;
  /** The staff-editable 24/7 line (the landing contact region). */
  contact: ContactInfo;
  /** The advisor card, rendered under the buy box. */
  aside?: ReactNode;
  /** The optional CDN/origin prefix for stored media (lib/media-url.ts). */
  mediaBaseUrl?: string | null;
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

  const featureBlocks = variant.blocks.filter(isBulletsBlock);
  const otherBlocks = variant.blocks.filter((block) => !isBulletsBlock(block));
  const hasSamplePhoto =
    variant.gallery.some((image) => image.sample) || (!variant.gallery.length && Boolean(model));

  return (
    <div className="pdp">
      <div className="pdp-layout">
        <div className="pdp-media">
          {variant.gallery.length > 0 ? (
            <PdpGallery
              key={variant.sku}
              images={variant.gallery}
              label={variant.name}
              mediaBaseUrl={mediaBaseUrl}
            />
          ) : model ? (
            <CasketSampleFigure model={model} />
          ) : (
            <p className="pdp-gallery__placeholder" role="note">
              Photographs for this model are being prepared — the office will show them before you
              commit.
            </p>
          )}
        </div>

        <div className="pdp-buy-column">
          <section className="pdp-buy" aria-labelledby="pdp-title">
            <p className="pdp-buy__eyebrow">{lineName}</p>
            <h1 className="pdp-buy__title" id="pdp-title">
              {variant.name}
            </h1>
            {variant.summary ? <p className="pdp-buy__lead">{variant.summary}</p> : null}

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

            <div className="pdp-buy__price">
              <div className="detail-sticky__label">Published 2026 price</div>
              <div className="detail-sticky__price">{variant.item.display_price}</div>
              {/* The senior figure comes from the VARIANT'S CATALOGUE ROW, not the hardcoded
                  sheet model: it is the price the cart charges and the one a staff edit in
                  /staff/catalog moves. A variant with no recorded senior price prints no
                  senior line rather than ₱0. */}
              {variant.item.senior_price_cents != null && variant.item.senior_price_cents > 0 ? (
                <p className="pdp-buy__senior">
                  Senior citizens pay <strong>{php(variant.item.senior_price_cents / 100)}</strong>{" "}
                  (61–100, no insurance benefit).{" "}
                  <Link href="/price-list">Senior plan and rates</Link>.
                </p>
              ) : null}
            </div>

            <ul className="pdp-trust">
              <li>Ordered from the office — availability and the final price are confirmed first.</li>
              {hasSamplePhoto ? (
                <li>Photographs are illustrative samples, not this exact unit.</li>
              ) : null}
              <li>
                Included in every <Link href="/plans">Villa Memorial Plan</Link> tier.
              </li>
              <li>
                <a href={contact.phoneHref}>Call {contact.phoneDisplay}</a> — {contact.phoneLabel}.
              </li>
            </ul>

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
                    ? `${model.collection} · ${model.family} family. Regular SRP ${variant.item.display_price}${
                        variant.item.senior_price_cents != null && variant.item.senior_price_cents > 0
                          ? `; senior-citizen price ${php(variant.item.senior_price_cents / 100)} (61–100, no insurance benefit)`
                          : ""
                      }.`
                    : undefined,
                }}
              />
            </div>
          </section>

          {aside ? <div className="pdp-aside">{aside}</div> : null}
        </div>

        <div className="pdp-below">
          {variant.description ? (
            <section className="pdp-section" aria-labelledby="pdp-about">
              <h2 className="pdp-section__title" id="pdp-about">
                About this model
              </h2>
              <RichText doc={variant.description} />
            </section>
          ) : null}

          {featureBlocks.length > 0 ? (
            <section className="pdp-section" aria-labelledby="pdp-features">
              <h2 className="pdp-section__title" id="pdp-features">
                What comes with it
              </h2>
              {featureBlocks.map((block) => (
                <div key={block.id} className="pdp-feature-group">
                  {block.heading ? (
                    <h3 className="pdp-feature-group__title">{block.heading}</h3>
                  ) : null}
                  <ul className="pdp-features">
                    {block.items
                      .filter((item) => item.trim().length > 0)
                      .map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}

          {variant.specs && variant.specs.columns.length > 0 ? (
            <section className="pdp-section" aria-labelledby="pdp-specs">
              <h2 className="pdp-section__title" id="pdp-specs">
                Specifications
              </h2>
              <SpecsTable
                specs={variant.specs}
                caption={`${variant.name} — as recorded by the office`}
              />
            </section>
          ) : null}

          {otherBlocks.length > 0 ? (
            <section className="pdp-section" aria-labelledby="pdp-more">
              <h2 className="pdp-section__title" id="pdp-more">
                More about this model
              </h2>
              <ContentBlocks
                blocks={otherBlocks}
                priceOf={(sku) => pricesBySku[sku] ?? null}
                mediaBaseUrl={mediaBaseUrl}
              />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
