import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { CatalogueAddButton } from "@/components/catalogue-add-button";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { PLAN_PACKAGES_IMAGE } from "@/lib/media";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Packages — Villa Memorial",
  description:
    "Complete memorial packages — everything a family needs in one arrangement, with the client's published 2026 amounts and what each package carries.",
  path: "/packages",
});

/** Public packages — REAL catalog data (item_type=package), villa card grammar.
 * Cards carry a "View package" detail link plus an "Add to cart" button fed by
 * the same real commerce-contract item the card displays (shared
 * CatalogueAddButton → the detail page's cart context). */
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
          {items.map((item) => (
            <article key={item.sku} className="item-card">
              <div className="item-card__media">
                {/* eslint-disable-next-line @next/next/no-img-element -- local sample imagery */}
                <img src={PLAN_PACKAGES_IMAGE} alt="" loading="lazy" />
              </div>
              <div className="item-card__body">
                <h3 className="item-card__title">
                  <Link href={`/plans/${item.sku}`}>{item.name}</Link>
                </h3>
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
          ))}
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
