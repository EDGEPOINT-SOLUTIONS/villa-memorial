import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentBlocks } from "@/components/content/content-blocks";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getServiceEntry } from "@/lib/api-client/content-entries";
import { serviceEntryDef, serviceEntryView, serviceHeroVariant } from "@/lib/service-content";

/**
 * One guide page, rendered from its service entry (content-catalogue Phase 3).
 *
 * The three guide routes (death at home · death at hospital · transport) stay as
 * routes, but their title, lead, photograph and content blocks are the editable
 * service entries in Pages & content → Funeraria Memorial Services. The primary
 * action stays Immediate assistance; the secondary action and the back link are
 * the page's own structure, not content.
 */
export async function ServiceGuidePage({ entryKey }: { entryKey: string }) {
  const def = serviceEntryDef(entryKey);
  if (!def) notFound();

  const [entry, items] = await Promise.all([
    getServiceEntry(def.key).catch(() => null),
    listCatalogItems().catch(() => []),
  ]);
  const view = serviceEntryView(entry, def);
  const hero = serviceHeroVariant(view.heroSrc, "wide");
  const priceBySku = new Map(items.map((item) => [item.sku, item.display_price]));
  const priceOf = (sku: string): string | null => priceBySku.get(sku) ?? null;

  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">{view.eyebrow}</p>
            <h1 className="hero-premium__title">{view.title}</h1>
            <p className="hero-premium__lead">{view.summary}</p>
            <div className="hero-premium__actions">
              <Link href="/immediate-assistance" className="btn btn--accent">Immediate assistance</Link>
              <Link href={def.secondaryHref} className="btn btn--secondary">{def.secondaryLabel}</Link>
            </div>
            <nav aria-label="Back to Funeraria Memorial Services" style={{ marginTop: "var(--space-4)" }}>
              <Link href="/services" className="back-link">
                ← Back to Funeraria Memorial Services
              </Link>
            </nav>
          </div>
          {hero ? (
            <figure className="hero-premium__media">
              {/* eslint-disable-next-line @next/next/no-img-element -- client/library photograph */}
              <img src={hero.src} srcSet={hero.srcSet} alt={view.heroAlt} />
              {view.heroCaption ? (
                <figcaption>
                  {view.heroCaption}
                  {view.heroSample ? " Illustration purposes only." : ""}
                </figcaption>
              ) : null}
            </figure>
          ) : null}
        </div>
      </section>

      {view.blocks.length > 0 ? (
        <section aria-label={`About ${view.title}`}>
          <ContentBlocks blocks={view.blocks} priceOf={priceOf} />
        </section>
      ) : null}
    </div>
  );
}
