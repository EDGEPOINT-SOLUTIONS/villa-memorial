import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import { ShopCard } from "@/components/villa/shop-card";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { catalogueItemPhoto, type CatalogueItemPhoto } from "@/lib/catalogue-imagery";
import { COFFIN_TIER_NOTE } from "@/lib/villa-pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Packages — Villa Memorial",
  description:
    "Complete memorial packages — everything a family needs in one arrangement, with the client's published 2026 amounts and what each package carries.",
  path: "/packages",
});

/**
 * Public packages — REAL catalog data (item_type=package), on the storefront's
 * ONE card grammar.
 *
 * Imagery (2026-09-19 imagery pass): the three packages are three DIFFERENT
 * products but every card reprinted the one plan poster. Each package now shows
 * the casket tier its own catalogue mapping names (PLAN_TIER_PACKAGE_SKUS in
 * lib/catalogue-skus.ts — Basic = Bronze 1, Standard = Silver 1, Premium = Gold)
 * through lib/catalogue-imagery.ts's `catalogueItemPhoto`, the SAME rule home
 * `/plans` reads — so the card's photograph answers "what casket does this plan
 * carry?", two packages never share one picture, and the same package cannot
 * look like two different arrangements on two pages. The client's photographs
 * are not reconciled with the sheet's model names, so the caption keeps the
 * sample wording and the sheet's substitution note; a package the mapping does
 * not know keeps the plan's own poster.
 *
 * The card is `components/villa/shop-card.tsx` inside the shared `.shop-grid`:
 * the photograph LEADS at 4:3 (the one card ratio /products, /plans and /lots
 * use), the name and figures sit under it, and the actions ("View package" plus
 * the shared Add-to-cart / Request-order pair) close it. Each heading ladder
 * stays real: this section's h2 names the band, each card's title is an h3.
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
        <section className="stack-3" aria-label="The 2026 packages">
          <header className="band-head">
            <h2 className="band-head__title">The 2026 packages</h2>
            <span className="band-head__count">
              {items.length} package{items.length === 1 ? "" : "s"} · 2026 catalogue prices
            </span>
          </header>
          <ul className="shop-grid">
            {items.map((item) => {
              const photo: CatalogueItemPhoto | undefined = item.image
                ? { id: item.sku, src: item.image, alt: item.name }
                : catalogueItemPhoto(item.sku) ?? undefined;
              return (
                <ShopCard
                  key={item.sku}
                  href={`/plans/${item.sku}`}
                  title={item.name}
                  meta={
                    <>
                      {item.description ? `${item.description} · ` : null}
                      <code>{item.sku}</code>
                    </>
                  }
                  price={item.display_price}
                  chip={photo?.chip}
                  caption={
                    photo?.caption ? `${photo.caption} ${COFFIN_TIER_NOTE}` : undefined
                  }
                  photo={
                    photo
                      ? {
                          src: photo.src,
                          srcSet: photo.srcSet,
                          width: photo.width,
                          height: photo.height,
                          sizes: "(max-width: 40rem) 92vw, (max-width: 70rem) 45vw, 26rem",
                          alt: photo.alt,
                        }
                      : undefined
                  }
                  actions={
                    <>
                      <Link
                        href={`/plans/${item.sku}`}
                        className="btn btn--secondary btn--sm"
                      >
                        View package
                      </Link>
                      <CatalogueActions
                        item={{
                          sku: item.sku,
                          name: item.name,
                          itemType: item.item_type,
                          unitPriceCents: item.unit_price_cents,
                          currency: item.currency,
                        }}
                        displayPrice={item.display_price}
                        prefill={{ note: "Package from the 2026 catalogue." }}
                      />
                    </>
                  }
                />
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-sm text-muted">
        <Link href="/plans/compare">Compare packages</Link> ·{" "}
        <Link href="/plans/senior-benefits">Senior citizen rates</Link> ·{" "}
        <Link href="/plans">Browse all plans &amp; services</Link>
      </p>
    </>
  );
}
