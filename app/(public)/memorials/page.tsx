import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, MapPin, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { PublicDisclosure, SectionHead } from "@/components/kit";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPublishedMemorials } from "@/lib/api-client/memorials";
import {
  MEMORIAL_FIND_HREF,
  MEMORIAL_NEVER_SHOWN,
  MEMORIAL_SEARCHABLE,
  MEMORIAL_SEARCH_EMPTY_HINT,
  MEMORIAL_SEARCH_EMPTY_TITLE,
  MEMORIAL_SEARCH_NOBODY_HINT,
  MEMORIAL_SEARCH_NOBODY_TITLE,
  MEMORIAL_SERVICE_NOTE,
  hasMemorialSearch,
  matchMemorials,
  memorialFirstLine,
  memorialPlotHref,
  memorialRestingLine,
  parseMemorialSearch,
  type PublishedMemorial,
} from "@/lib/memorials";
import { pageMetadata } from "@/lib/seo";
import { VisibilityChoices } from "./visibility-choices";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { query } = parseMemorialSearch(await searchParams);
  const meta = pageMetadata({
    title: "Digital memorial search — Villa Funeraria",
    description:
      "Search the memorials families have chosen to publish at Villa Memorial Park — by name and life dates. Private and family-only memorials never appear.",
    path: "/memorials",
  });
  // A result page is keyed by the visitor's query and must never become an
  // indexed directory of names; the canonical /memorials page stays indexable.
  if (!hasMemorialSearch(query)) return meta;
  return { ...meta, robots: { index: false, follow: true } };
}

export const dynamic = "force-dynamic";

/**
 * Digital Memorial Search — /memorials (screen-inventory "Digital Memorial
 * Search", F-04).
 *
 * THE SEARCH COMES FIRST (captain, 2026-09-30, inbox 002: "what they will see
 * first should be the search bar… no other shenanigans"). The page opens on the
 * search itself — no hero, no card, no breadcrumb. The compact privacy
 * explainer sits WITH the search (inbox 003): the heading "What this search can
 * show", the three tiers in a visitor's terms, and one disclosure holding the
 * searchable / never-shown lists.
 *
 * A FOUND MEMORIAL SHOWS THE WAY (captain, 2026-09-30): each result carries the
 * resting line and, when the family published a plot, ONE action —
 * `View this lot in the 3D map` — that opens the 3D park already framed on the
 * plot. The full lot + pinned map + facts live on the memorial page.
 *
 * NO PERSON IS EVER FABRICATED: every name comes from a record whose visibility
 * is `published` (lib/api-client/memorials.ts drops every other record), and an
 * empty query lists nobody.
 */
export default async function MemorialSearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { query, error } = parseMemorialSearch(await searchParams);
  const searched = hasMemorialSearch(query);
  const { contact } = await listLandingContent();

  let published: PublishedMemorial[] = [];
  let results: PublishedMemorial[] = [];
  let readFailed = false;
  try {
    published = await loadPublishedMemorials();
    results = matchMemorials(published, query);
  } catch {
    readFailed = true;
  }

  return (
    <div className="mem-page">
      {/* The interactive surface leads, so the page's one h1 is for assistive
          tech and SEO only (the `/map` precedent). */}
      <h1 className="visually-hidden">Find a memorial</h1>

      <section id="search" className="mem-open" aria-label="Search memorials">
        <p className="mem-open__eyebrow">Digital memorial search</p>
        <form className="mem-search__form" method="get" action="/memorials" role="search">
          <div className="field-grid field-grid--3">
            <div className="field">
              <label htmlFor="memorial-name">Name</label>
              <input
                className="input"
                id="memorial-name"
                name="name"
                type="search"
                defaultValue={query.name}
                placeholder="As the family published it"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="memorial-born">Born</label>
              <input
                className="input"
                id="memorial-born"
                name="born"
                inputMode="numeric"
                pattern="\d{4}"
                defaultValue={query.born}
                placeholder="1948"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="memorial-died">Died</label>
              <input
                className="input"
                id="memorial-died"
                name="died"
                inputMode="numeric"
                pattern="\d{4}"
                defaultValue={query.died}
                placeholder="2026"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="mem-search__actions">
            <button className="btn btn--primary" type="submit">
              Search memorials
            </button>
            {searched ? (
              <Link className="btn btn--secondary" href="/memorials">
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {/* The privacy explainer, WITH the search (captain's exact copy). */}
      <section id="rules" className="mem-show" aria-labelledby="rules-title">
        <SectionHead
          id="rules-title"
          kicker="Before you search"
          title="What this search can show"
          lead="Only what a family publishes appears."
        />
        <VisibilityChoices title="" />
        <PublicDisclosure summary="What exactly is searchable, and what is never shown">
          <div className="mem-rules__grid">
            <div className="mem-rule-card">
              <div className="mem-rule-card__head">
                <Search size={18} aria-hidden="true" />
                <h3>Searchable</h3>
              </div>
              <ul className="mem-list">
                {MEMORIAL_SEARCHABLE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="mem-rule-card mem-rule-card--never">
              <div className="mem-rule-card__head">
                <EyeOff size={18} aria-hidden="true" />
                <h3>Never shown</h3>
              </div>
              <ul className="mem-list">
                {MEMORIAL_NEVER_SHOWN.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </PublicDisclosure>
      </section>

      <section className="mem-results-section" aria-label="Search results">
        <div className="mem-results" aria-live="polite">
          {readFailed ? (
            <ErrorState message="The memorial search could not be read just now. Call the office and a person will look for you." />
          ) : error ? (
            <p className="alert alert--warning" role="alert">
              {error}
            </p>
          ) : !searched ? (
            <p className="mem-hint">Enter a name, or the years you know.</p>
          ) : results.length > 0 ? (
            <>
              <p className="mem-results__count">
                {results.length === 1
                  ? "1 memorial matches."
                  : `${results.length} memorials match.`}
              </p>
              <ul className="mem-results__list">
                {results.map((memorial) => {
                  const resting = memorialRestingLine(memorial);
                  const plotHref = memorialPlotHref(memorial);
                  return (
                    <li className="mem-result" key={memorial.id}>
                      <div>
                        <h3 className="mem-result__name">{memorial.name}</h3>
                        <p className="mem-result__dates">{memorial.life_dates.display}</p>
                        {resting ? <p className="mem-result__place">{resting}</p> : null}
                        <p className="mem-result__line">{memorialFirstLine(memorial)}</p>
                      </div>
                      <div className="mem-result__actions">
                        <Link className="btn btn--secondary" href={`/memorials/${memorial.id}`}>
                          View memorial
                        </Link>
                        {plotHref ? (
                          <Link className="btn btn--accent" href={plotHref}>
                            <MapPin size={16} aria-hidden="true" />
                            View this lot in the 3D map
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : published.length === 0 ? (
            // The store holds nothing published at all — the stronger, honest
            // state, with the service line that explains why.
            <>
              <EmptyState title={MEMORIAL_SEARCH_NOBODY_TITLE} hint={MEMORIAL_SEARCH_NOBODY_HINT} />
              <p className="mem-service-note">{MEMORIAL_SERVICE_NOTE}</p>
            </>
          ) : (
            <EmptyState title={MEMORIAL_SEARCH_EMPTY_TITLE} hint={MEMORIAL_SEARCH_EMPTY_HINT} />
          )}
        </div>
      </section>

      {/* ONE staffed closing band: the visitor who cannot find someone gets a
          human door, and the service note prints here once. */}
      <section className="mem-staffed" aria-labelledby="memorials-staffed-title">
        <SectionHead
          id="memorials-staffed-title"
          kicker="If you cannot find them"
          title="A person will look with you"
          lead="We search the office record and confirm only what a family has published."
        />
        <div className="mem-staffed__actions">
          <a className="btn btn--accent" href={contact.phoneHref}>
            Call {contact.phoneDisplay}
          </a>
          <Link className="btn btn--secondary" href={MEMORIAL_FIND_HREF}>
            Find my loved one
          </Link>
        </div>
        <p className="mem-service-note">{MEMORIAL_SERVICE_NOTE}</p>
      </section>
    </div>
  );
}
