import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, Lock, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { listLandingContent, type ContactInfo } from "@/lib/api-client/landing";
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
    title: "Digital memorial search — Villa Memorial",
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
 * THE RULES COME BEFORE THE RESULTS. This is not a park directory: the page
 * states what is searchable and what is deliberately never shown, then offers
 * one search over the memorials families have chosen to publish. An empty query
 * lists nobody (`matchMemorials` refuses it), a failed match names every reason
 * it may exist — including a private memorial — without confirming anything,
 * and the demo store publishes no one at all, which the page says plainly.
 *
 * No person is ever fabricated here: every name comes from a record whose
 * visibility is `published` (lib/api-client/memorials.ts drops every other
 * record), and `tests/unit/memorials-pages.test.tsx` asserts the unavailable
 * fixture state leaks no name.
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
      <nav className="mem-crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li aria-current="page">Digital memorial search</li>
        </ol>
      </nav>

      <section className="hero-premium mem-hero" aria-labelledby="memorials-title">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Digital memorial search</p>
            <h1 className="hero-premium__title" id="memorials-title">
              Find a memorial
            </h1>
            {/* The page's one-line answer (reading budget, captain 2026-09-18). */}
            <p className="hero-premium__lead">
              Search the memorials families have published.
            </p>
            <div className="hero-premium__actions">
              <a className="btn btn--primary" href="#search">
                Search by name
              </a>
              <Link className="btn btn--secondary" href={MEMORIAL_FIND_HREF}>
                Find my loved one
              </Link>
            </div>
          </div>
          <div className="mem-hero__card">
            <Lock size={22} aria-hidden="true" />
            <h2 className="mem-hero__card-title">Only what a family publishes</h2>
            <p className="mem-hero__card-line">
              Nothing appears here by default, and the family can change or close it at any time.
            </p>
          </div>
        </div>
      </section>

      <section className="mem-rules" id="rules" aria-labelledby="rules-title">
        <p className="mem-kicker">Before you search</p>
        <h2 className="mem-section-title" id="rules-title">
          What this search can show
        </h2>
        <p className="mem-intro">These rules apply to every search on this page.</p>
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
        {/* The three choices the family portal names, in a visitor's terms — so a
            visitor understands why they may not find someone. */}
        <VisibilityChoices />
      </section>

      <section className="mem-search" id="search" aria-labelledby="search-title">
        <h2 className="mem-section-title" id="search-title">
          Search by name and dates
        </h2>
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
                {results.map((memorial) => (
                  <li className="mem-result" key={memorial.id}>
                    <div>
                      <h3 className="mem-result__name">{memorial.name}</h3>
                      <p className="mem-result__dates">{memorial.life_dates.display}</p>
                      {memorialRestingLine(memorial) ? (
                        <p className="mem-result__place">{memorialRestingLine(memorial)}</p>
                      ) : null}
                      <p className="mem-result__line">{memorialFirstLine(memorial)}</p>
                    </div>
                    <Link className="btn btn--secondary" href={`/memorials/${memorial.id}`}>
                      View memorial
                    </Link>
                  </li>
                ))}
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

      <section className="mem-shape" aria-labelledby="shape-title">
        <p className="mem-kicker">What a published memorial shows</p>
        <h2 className="mem-section-title" id="shape-title">
          The five things a family decides
        </h2>
        <p className="mem-intro">The shape below is an example — no real person is shown.</p>
        <dl className="mem-shape__facts">
          <div>
            <dt>Name</dt>
            <dd>The name the family published</dd>
          </div>
          <div>
            <dt>Life dates</dt>
            <dd>The years on the office record</dd>
          </div>
          <div>
            <dt>Photograph</dt>
            <dd>Only if the family shared one</dd>
          </div>
          <div>
            <dt>The family&rsquo;s words</dt>
            <dd>The remembrance they wrote</dd>
          </div>
          <div>
            <dt>Where they rest</dt>
            <dd>The park, section and lot</dd>
          </div>
        </dl>
      </section>

      <section className="mem-find" aria-labelledby="mem-find-title">
        <div>
          <h2 className="mem-find__title" id="mem-find-title">
            Cannot find them?
          </h2>
          <p className="mem-find__line">
            Private and family-only memorials never appear here.
          </p>
        </div>
        <div className="mem-find__actions">
          <Link className="btn btn--primary" href={MEMORIAL_FIND_HREF}>
            Find my loved one
          </Link>
          <CallAction contact={contact} />
        </div>
      </section>
    </div>
  );
}

/** The office's own line — the only contact any memorial surface publishes. */
function CallAction({ contact }: { contact: ContactInfo }) {
  return (
    <a className="btn btn--secondary" href={contact.phoneHref}>
      Call {contact.phoneDisplay}
    </a>
  );
}
