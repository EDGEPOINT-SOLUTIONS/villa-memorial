import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The one shop card — the public catalogue's product grammar (2026-09-19
 * imagery pass).
 *
 * WHY IT EXISTS. The catalogue surfaces had drifted into three grammars: a
 * ledger of hairline rows on /products (whose photographs rendered 128×96), a
 * grouped price index on /plans (three images on the whole page) and shadowed
 * boxes on /packages. A reader moving between them felt they had changed
 * products. Every sellable item now renders through this card: a large 4:3
 * photograph that leads, the item's own name and figures under it, its caption
 * (what the picture actually is), and its actions.
 *
 * THE HONESTY CONTRACT. `chip` and `caption` are not decoration — a card whose
 * photograph is a sample MUST publish both, because the client's photographs are
 * not reconciled with the 2026 sheet model names (lib/client-photos.ts). A card
 * with a photograph that IS the thing named passes no chip. The chip class is
 * shared with the detail page's (`.casket-sample__chip`) so a reviewer can grep
 * one word for every sample on the storefront.
 *
 * MARKUP DISCIPLINE. The photograph and its caption are a `<figure>`/
 * `<figcaption>` — a caption of a picture, not paragraph prose. Only the eyebrow
 * is a `<p>`, because the reading-budget guard (tests/unit/reading-budget.test.tsx)
 * measures every `<p>` on /plans and a forty-card page full of paragraphs would
 * spend the whole budget on card furniture. Prices, meta and actions are `<div>`s;
 * the photograph's link is `aria-hidden` with an empty alt so a screen reader
 * meets ONE link per product (the titled one below), never a duplicate.
 *
 * ONE OPTIONAL STATUS ROW. `/lots` adds its availability chip under the price
 * (the captain's 2026-09-20 listing pass); every other surface passes no
 * `status` and renders exactly as before.
 *
 * Size discipline (the reason the old page read as "no images"): the photograph
 * is the widest thing in the card, at the grid's full column width — never a
 * thumbnail beside text. `styles/components.css` carries one `.shop-grid`
 * (3 columns at 1440, 1 at 390) and one `.shop-card`.
 */
export type ShopCardPhoto = {
  src: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  alt: string;
};

export function ShopCard({
  href,
  photo,
  chip,
  eyebrow,
  title,
  meta,
  price,
  priceNote,
  status,
  senior,
  caption,
  actions,
}: {
  /** The item's detail page — the photograph and the title both lead to it. */
  href: string;
  /** The item's photograph. Omitted only for an item the client's material
   *  does not cover (see lib/catalogue-imagery.ts) — the card then renders its
   *  facts alone rather than borrowing a wrong picture. */
  photo?: ShopCardPhoto;
  /** The sample marker, e.g. "Sample photograph". Omitted for a real one. */
  chip?: string;
  /** A short line above the name: the family, the group, the plot. */
  eyebrow?: ReactNode;
  /** The item's own name. */
  title: string;
  /** Family · cover · SKU — the facts a shopper compares on. */
  meta?: ReactNode;
  /** The headline figure, already formatted. */
  price: ReactNode;
  /** What the figure is ("regular SRP", "catalogue price", "per day"). */
  priceNote?: string;
  /** Availability (the lot listing's Available/Reserved/Sold chip), under the
   *  figure — the second thing a shopper reads. */
  status?: ReactNode;
  /** The senior-citizen line, when the item has one. */
  senior?: ReactNode;
  /** What the photograph is. Required wherever `chip` is set. */
  caption?: ReactNode;
  /** The card's action pair (the shared View/Add/Request grammar). */
  actions: ReactNode;
}) {
  return (
    <li className="shop-card">
      {photo ? (
        <figure className="shop-card__figure">
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
        {meta ? <div className="shop-card__meta">{meta}</div> : null}
        <div className="shop-card__price">
          {price}
          {priceNote ? <span className="shop-card__unit">{priceNote}</span> : null}
        </div>
        {status ? <div className="shop-card__status">{status}</div> : null}
        {senior ? <div className="shop-card__senior">{senior}</div> : null}
        <div className="shop-card__actions">{actions}</div>
      </div>
    </li>
  );
}
