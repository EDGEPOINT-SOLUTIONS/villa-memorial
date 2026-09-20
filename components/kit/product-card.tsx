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
 * ONE STATUS CHIP. The item's availability / sample state is a `StatusChip`
 * (`status.tone` + `status.label`), so its colour cannot drift. A sample
 * photograph also carries `chip` — the marker the storefront's substitution note
 * requires (`COFFIN_TIER_NOTE`) — and its `caption` says what the picture really
 * is.
 *
 * The markup is the catalogue's existing `.shop-card`, unchanged, so a surface
 * that already renders one (the storefront's `ShopCard`) adopts this component
 * with no visual change.
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
  chip,
  eyebrow,
  title,
  supporting,
  price,
  priceNote,
  status,
  caption,
  actions,
}: {
  /** The item's detail page — the photograph and the title both lead to it. */
  href: string;
  photo?: ProductCardPhoto;
  /** The sample marker ("Sample photograph") — required wherever the picture is one. */
  chip?: ReactNode;
  /** A short line above the name: the family, the group, the plot. */
  eyebrow?: ReactNode;
  title: string;
  /** The supporting line: family · cover · SKU, what the shopper compares on. */
  supporting?: ReactNode;
  /** The headline figure, already formatted by the caller. */
  price: ReactNode;
  /** What the figure is ("regular SRP", "per day"). */
  priceNote?: string;
  /** The availability / honesty chip. */
  status?: { tone?: StatusTone; label: ReactNode };
  /** What the photograph is. Required wherever `chip` is set. */
  caption?: ReactNode;
  /** The card's one action slot (the shared View / Add / Request grammar). */
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
            {chip ? <span className="casket-sample__chip">{chip}</span> : null}
          </Link>
          {caption ? <figcaption className="shop-card__caption">{caption}</figcaption> : null}
        </figure>
      ) : null}
      <div className="shop-card__body">
        {eyebrow ? <p className="shop-card__eyebrow">{eyebrow}</p> : null}
        <h3 className="shop-card__title">
          <Link href={href}>{title}</Link>
        </h3>
        {status ? (
          <div className="shop-card__meta">
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
          </div>
        ) : null}
        {supporting ? <div className="shop-card__meta">{supporting}</div> : null}
        <div className="shop-card__price">
          {price}
          {priceNote ? <span className="shop-card__unit">{priceNote}</span> : null}
        </div>
        <div className="shop-card__actions">{actions}</div>
      </div>
    </li>
  );
}
