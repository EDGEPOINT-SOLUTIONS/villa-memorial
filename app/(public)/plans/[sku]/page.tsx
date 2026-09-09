import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";
import { getCatalogItem } from "@/lib/api-client/commerce";
import { PLAN_PACKAGES_IMAGE, SAMPLE_PARK_IMAGE, TRANSPORT_IMAGE } from "@/lib/media";
import { AddToCartControl } from "./add-to-cart";

export const metadata = { title: "Plan details — Villa Memorial" };

const TYPE_LABEL: Record<string, string> = {
  package: "Package",
  service: "Service",
  add_on: "Add-on",
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

  return (
    <div className="stack-4">
      <section className="hero-premium">
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
                <div className="row row--space">
                  <Badge tone={item.item_type === "package" ? "accent" : "info"}>
                    {typeLabel}
                  </Badge>
                  <code className="text-sm text-muted">{item.sku}</code>
                </div>

                <div>
                  <div className="detail-sticky__label">Price</div>
                  {/* display_price shown as provided; totals come from the server at checkout */}
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
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
