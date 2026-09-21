import Link from "next/link";
import type { ReactNode } from "react";
import { StatusChip, type StatusTone } from "@/components/kit/status-chip";

/**
 * ProductCard — the ONE product card: photograph first, then the figures.
 *
 * THE RULE (captain 2026-09-19): a product is a photograph with its facts under
 * it, never a bordered tile with a thumbnail in one corner. The photograph LEADS
 * at the column's full width (`.shop-card__media`, 4:3), the name and the price
 * sit under it, and the actions close the card. The same card answers a lot, a
 * coffin, a plan and a service so a reader moving between them does not feel they
 * changed products.
 *
 * PHOTOGRAPHS LEAD; A CARD WITHOUT ONE IS A BUG. A sellable item that the client's
 * own material does not cover is a genuine exception (`lib/catalogue-imagery.ts`
 * returns null), and the card renders its facts text-only with an honest note —
 * it never borrows a wrong picture to fill the slot. Everything else passes a
 * `photo`.
 *
 * ONE STATUS ROW, UNDER THE FIGURE. The item's availability / sample state is a
 * `StatusChip` (`status.tone` + `status.label`), printed directly under the
 * price — the second thing a shopper reads after the figure, which is where the
 * /lots listing's availability chip has always sat. A sample photograph carries
 * its `caption` saying what the picture really is; the storefront's substitution
 * note (`COFFIN_TIER_NOTE`) supplies the honesty line, so the picture no longer
 * needs a redundant "sample" badge.
 *
 * THE SENIOR LINE. A casket carries a second published figure (the senior-
 * citizen price and discount); `senior` is that line, under the status row. It is
 * data, not prose — a `<div>`, never a paragraph (the reading-budget guard
 * measures every `<p>` on /plans and /products).
 *
 * This IS the catalogue's former `components/villa/shop-card.tsx`, moved onto
 * the kit's one product component (2026-09-21 public adoption). The markup is
 * unchanged — `.shop-card` body order is eyebrow · title · supporting · price ·
 * status · senior · actions — so /lots, /plans, /packages and /products adopt it
 * with no visual change and no duplicated card grammar.
 */
export type ProductCardPhoto = {
  src: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  alt: string;
};

export function ProductCard({
  href,
  photo,
  eyebrow,
  title,
  supporting,
  price,
  priceNote,
  status,
  senior,
  caption,
  actions,
}: {
  /** The item's detail page — the photograph and the title both lead to it. */
  href: string;
  photo?: ProductCardPhoto;
  /** A short line above the name: the family, the group, the plot. */
  eyebrow?: ReactNode;
  title: string;
  /** The supporting line: family · cover · SKU, what the shopper compares on. */
  supporting?: ReactNode;
  /** The headline figure, already formatted by the caller. */
  price: ReactNode;
  /** What the figure is ("regular SRP", "per day"). */
  priceNote?: string;
  /** The availability / honesty chip, under the figure. */
  status?: { tone?: StatusTone; label: ReactNode };
  /** The senior-citizen line, when the item has one. */
  senior?: ReactNode;
  /** What the photograph is. Required wherever the picture is a sample. */
  caption?: ReactNode;
  /** The card's action slot (the shared View / Add / Request grammar). */
  actions: ReactNode;
}) {
  return (
    <li className="shop-card">
      {photo ? (
        <figure className="shop-card__figure">
          {/* The picture of the titled link below; aria-hidden so a screen reader
              meets ONE link per product, never a duplicate. */}
          <Link href={href} className="shop-card__media" tabIndex={-1} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- the client's own photograph */}
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes={photo.sizes}
              width={photo.width}
              height={photo.height}
              alt=""
              loading="lazy"
            />
          </Link>
          {caption ? <figcaption className="shop-card__caption">{caption}</figcaption> : null}
        </figure>
      ) : null}
      <div className="shop-card__body">
        {eyebrow ? <p className="shop-card__eyebrow">{eyebrow}</p> : null}
        <h3 className="shop-card__title">
          <Link href={href}>{title}</Link>
        </h3>
        {supporting ? <div className="shop-card__meta">{supporting}</div> : null}
        <div className="shop-card__price">
          {price}
          {priceNote ? <span className="shop-card__unit">{priceNote}</span> : null}
        </div>
        {status ? (
          <div className="shop-card__status">
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
          </div>
        ) : null}
        {senior ? <div className="shop-card__senior">{senior}</div> : null}
        <div className="shop-card__actions">{actions}</div>
      </div>
    </li>
  );
}
