import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { CatalogueAddButton } from "@/components/catalogue-add-button";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { planTierForPackageSku } from "@/lib/catalogue-skus";
import { clientPhoto, clientPhotoCard } from "@/lib/client-photos";
import { PLAN_PACKAGES_IMAGE } from "@/lib/media";
import { COFFIN_TIER_PHOTO_IDS, COFFIN_TIER_NOTE, PLAN_TIERS } from "@/lib/villa-pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Packages — Villa Memorial",
  description:
    "Complete memorial packages — everything a family needs in one arrangement, with the client's published 2026 amounts and what each package carries.",
  path: "/packages",
});

/**
 * Public packages — REAL catalog data (item_type=package), villa card grammar.
 * Cards carry a "View package" detail link plus an "Add to cart" button fed by
 * the same real commerce-contract item the card displays (shared
 * CatalogueAddButton → the detail page's cart context).
 *
 * Imagery (2026-09-19 imagery pass): the three packages are three DIFFERENT
 * products but every card reprinted the one plan poster. Each package now shows
 * the casket tier its own catalogue mapping names (PLAN_TIER_PACKAGE_SKUS in
 * lib/catalogue-skus.ts — Basic = Bronze 1, Standard = Silver 1, Premium = Gold)
 * through COFFIN_TIER_PHOTO_IDS, so the card's photograph answers "what casket
 * does this plan carry?" and two packages never share one picture. The client's
 * photographs are not reconciled with the sheet's model names, so each caption
 * carries the same sample wording the product pages use (COFFIN_TIER_NOTE); a
 * package the mapping does not know keeps the plan's own poster.
 */
export default async function PackagesPage() {
  let items;
  try {
    items = await listCatalogItems("package");
  } catch {
    return (
      <div className="stack-4">
        <h1>Packages</h1>
        <ErrorState message="Packages are unavailable right now. Please try again shortly." />
      </div>
    );
  }

  return (
    <>
      <section className="page-hero">
        <p className="eyebrow-label">Packages</p>
        <h1 className="page-hero__title">Thoughtfully bundled services</h1>
        <p className="page-hero__lead">
          Complete arrangements at one clear price — so decisions stay calm when it
          matters most.
        </p>
        <nav aria-label="Back to Villa Memorial Plan" style={{ marginTop: "var(--space-3)" }}>
  <Link href="/plans" className="back-link">
    ← Back to Villa Memorial Plan (All · Packages · Services · Add-ons)
  </Link>
</nav>
      </section>

      {items.length === 0 ? (
        <EmptyState title="No packages yet" hint="Check back soon — packages are being set up." />
      ) : (
        <div className="catalog-grid">
          {items.map((item) => {
            const tier = planTierForPackageSku(item.sku);
            const tierName = tier
              ? PLAN_TIERS.find((entry) => entry.id === tier)?.name
              : undefined;
            const photoId = tierName ? COFFIN_TIER_PHOTO_IDS[tierName] : undefined;
            const photo = photoId ? clientPhotoCard(photoId) : undefined;
            const record = photoId ? clientPhoto(photoId) : undefined;
            return (
              <article key={item.sku} className="item-card">
                <figure className="item-card__figure">
                  <div className="item-card__media">
                    {photo && record ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- the client's own 2026 photograph */
                      <img
                        src={photo.src}
                        srcSet={photo.srcSet}
                        sizes="(max-width: 40rem) 92vw, (max-width: 60rem) 45vw, 22rem"
                        alt={`Illustrative sample casket — ${record.alt}`}
                        loading="lazy"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element -- the plan's own poster art */
                      <img
                        src={PLAN_PACKAGES_IMAGE}
                        alt="Villa Memorial Plan — comprehensive packages for your peace of mind"
                        loading="lazy"
                      />
                    )}
                  </div>
                  {photo && record && tierName ? (
                    <figcaption className="item-card__caption">
                      <strong>{tierName} tier casket.</strong> {record.label} — a sample from the
                      client&rsquo;s own photographs. {COFFIN_TIER_NOTE}
                    </figcaption>
                  ) : null}
                </figure>
                <div className="item-card__body">
                  <h2 className="item-card__title">
                    <Link href={`/plans/${item.sku}`}>{item.name}</Link>
                  </h2>
                  {item.description ? (
                    <p className="item-card__meta">{item.description}</p>
                  ) : null}
                  <div className="item-card__price">{item.display_price}</div>
                  <div className="item-card__actions item-card__actions--split">
                    <Link href={`/plans/${item.sku}`} className="btn btn--secondary btn--sm btn--block">
                      View package
                    </Link>
                    <CatalogueAddButton
                      item={{
                        sku: item.sku,
                        name: item.name,
                        itemType: item.item_type,
                        unitPriceCents: item.unit_price_cents,
                        currency: item.currency,
                      }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted">
        <Link href="/plans/compare">Compare packages</Link> ·{" "}
        <Link href="/plans/senior-benefits">Senior citizen rates</Link> ·{" "}
        <Link href="/plans">Browse all plans &amp; services</Link>
      </p>
    </>
  );
}
