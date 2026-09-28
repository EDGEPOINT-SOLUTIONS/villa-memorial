import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { PublicDisclosure, PublicHero, SectionHead } from "@/components/kit";
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
 * THE RULES COME BEFORE THE RESULTS. This is not a park directory: the page
 * states what is searchable and what is deliberately never shown, then offers
 * one search over the memorials families have chosen to publish. An empty query
 * lists nobody (`matchMemorials` refuses it), a failed match names every reason
 * it may exist — including a private memorial — without confirming anything,
 * and the demo store publishes no one at all, which the page says plainly.
 *
 * Public-minimal identity pass (lane 4, Phase 0 contract): the page opens on the
 * shared `PublicHero`, answers the privacy question in ONE line, and keeps the
 * full rules + the three visibility choices behind the shared `PublicDisclosure`
 * — the six-paragraph rules wall and the "five things a family decides" band are
 * gone. A reading envelope, a calm label scale; no bespoke hero family.
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

      <PublicHero
        variant="interior"
        id="memorials-title"
        eyebrow="Digital memorial search"
        title="Find a memorial"
        lead="Search the memorials families have published."
        primary={{ label: "Search by name", href: "#search" }}
        secondary={{ label: "Find my loved one", href: MEMORIAL_FIND_HREF }}
      />

      {/* The rules come first (id="rules"), and they answer in one line; the
          full vocabulary and the family's three choices sit behind the shared
          disclosure so the search is the next thing a visitor reaches. */}
      <section id="rules" aria-labelledby="rules-title">
        <SectionHead
          id="rules-title"
          kicker="Before you search"
          title="What this search can show"
          lead="Only what a family publishes appears — private and family-only memorials never show."
        />
        <PublicDisclosure summary="What is searchable, and what is never shown">
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
          {/* The three choices the family portal names, in a visitor's terms —
              so a visitor understands why they may not find someone. */}
          <VisibilityChoices />
        </PublicDisclosure>
      </section>

      <section id="search" aria-labelledby="search-title">
        <SectionHead
          id="search-title"
          kicker="Search"
          title="Search by name and dates"
          lead="Enter what you know; every field is optional."
        />
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

      {/* The office line is the page's own end note; the shared closing band
          (PublicShell → NextSteps) is the one action layer above the footer. */}
      <p className="mem-service-note mem-service-note--foot">
        The office only ever confirms a memorial a family has published. Call{" "}
        <a href={contact.phoneHref}>{contact.phoneDisplay}</a> and a person will
        look with you.
      </p>
    </div>
  );
}
