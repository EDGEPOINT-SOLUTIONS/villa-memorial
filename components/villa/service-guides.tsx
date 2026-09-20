import Link from "next/link";
import type { CatalogueEntry } from "@/lib/content-catalog";
import {
  SERVICE_ENTRY_DEFS,
  serviceEntryDef,
  serviceEntryView,
  serviceHeroVariant,
} from "@/lib/service-content";

/** The first sentence of a guide summary — the card's one-line answer (reading budget). */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (match ? match[0] : trimmed).trim();
}

/**
 * The guide card's one line: the entry's first sentence, shortened to its first
 * clause when that is already long. The full lead stays on the guide page, so a
 * card never turns a page into prose (reading budget, captain 2026-09-18).
 */
function cardLine(text: string): string {
  const first = firstSentence(text);
  if (first.split(/\s+/).length <= 20) return first;
  const clause = first.split(/\s+(?:—|–|,)\s+/)[0]?.trim();
  return clause && clause.length > 0 ? clause : first;
}

/**
 * The service guide entries as cards on Funeraria Memorial Services
 * (content-catalogue Phase 3).
 *
 * The three guide pages the captain confirmed stay as service entries (§10
 * answer 3): death at home · death in hospital · transport. Each card prints the
 * entry's own title, summary and photograph, edited in Pages & content →
 * Funeraria Memorial Services; the card links to the entry's own route, which
 * reads the same entry. A missing entry falls back to its recorded copy — the
 * page never invents one.
 */
export function ServiceGuides({ entries }: { entries: CatalogueEntry[] }) {
  const cards = SERVICE_ENTRY_DEFS.flatMap((def) => {
    const entry = entries.find((record) => record.key === def.key) ?? null;
    return [{ def, view: serviceEntryView(entry, def) }];
  });
  if (cards.length === 0) return null;

  return (
    <section className="sv-section" id="guides" aria-labelledby="guides-title">
      <p className="sv-section__kicker">The first call</p>
      <h2 className="sv-section__title" id="guides-title">
        Guides for what comes next
      </h2>
      <p className="sv-section__intro">Where to start, at home, in care, or on the road.</p>

      <div className="sv-prices sv-prices--guides">
        {cards.map(({ def, view }) => {
          const image = serviceHeroVariant(view.heroSrc, "card");
          return (
            <article className="sv-price-card" key={def.key}>
              <div className="sv-price-card__head">
                <h3>{view.title}</h3>
              </div>
              {image ? (
                <div className="sv-card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element -- client/library photograph */}
                  <img
                    src={image.src}
                    srcSet={image.srcSet}
                    sizes="(max-width: 40rem) 92vw, (max-width: 70rem) 45vw, 22rem"
                    alt={view.heroAlt}
                    loading="lazy"
                  />
                </div>
              ) : null}
              <p className="sv-price-card__plain">{cardLine(view.summary)}</p>
              <div className="sv-price-card__actions">
                <Link className="btn btn--secondary btn--block" href={def.route}>
                  Read the guide: {view.title}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Re-exported for the services page's own reading of a guide entry key. */
export { serviceEntryDef };
