/**
 * Digital memorial — the public privacy rules and the search vocabulary (F-04).
 *
 * This is the most sensitive surface in the product: a stranger may search for
 * someone who has died, and a family's grief becomes public. The digital-memorial
 * service does not exist yet (`docs/06-cultural-digital-memorial/digital-memorial.md`,
 * blueprint §22–23), so the rules below are the SCREEN'S OWN contract, not a
 * promise deferred to a service:
 *
 *   · NOTHING IS PUBLISHED BY DEFAULT. A memorial exists on the public side only
 *     when the family chose `published` for it — `matchMemorials` refuses to list
 *     anyone for an empty query, and the reader (`lib/api-client/memorials.ts`)
 *     drops every record that is not marked published.
 *   · The three visibility choices are the same three the family portal shows
 *     (`app/(family)/client/memorials/page.tsx`), worded from the visitor's side
 *     so a visitor understands why they may not find someone. The family-facing
 *     words are kept here ONLY as the drift pin (`familyLabel`) — the public
 *     pages print `visitorLabel`/`meaning`.
 *   · The living are never shown: no relatives, addresses, dates of birth or
 *     contact details — the office's own line is the only contact on a memorial.
 *   · The search is not a directory. An empty query lists nobody, and "nothing
 *     found" never reveals whether the person exists.
 *
 * The client's own public-search/privacy rules are still an open question
 * (`docs/07-client-villa/open-questions.md` — "Public memorial search/privacy
 * rules"). The pages publish the floor the product guarantees today and name that
 * open item plainly; they never assume an answer.
 */

/** The three visibility choices, exactly as the family portal names them. */
export type MemorialVisibility = "private" | "family" | "published";

/** The one visibility that may ever reach a public page. */
export const PUBLISHED_VISIBILITY: MemorialVisibility = "published";

/** A visibility value is legal only when it is one of the three known choices. */
export function isMemorialVisibility(value: unknown): value is MemorialVisibility {
  return value === "private" || value === "family" || value === "published";
}

export type VisibilityChoice = {
  id: MemorialVisibility;
  /** The family portal's own words (the drift pin — not printed publicly). */
  familyLabel: string;
  /** The same choice in a visitor's terms — what this search can show. */
  visitorLabel: string;
  /** One short line: what a visitor may or may not find. */
  meaning: string;
};

/**
 * The three choices, in the family portal's order (private → family → published).
 * `tests/unit/memorials.test.ts` reads the family portal page and fails if a
 * `familyLabel` here stops matching the words that screen publishes.
 */
export const MEMORIAL_VISIBILITY: ReadonlyArray<VisibilityChoice> = [
  {
    id: "private",
    familyLabel: "Only your family",
    visitorLabel: "Kept private",
    meaning: "Not shown here, and we do not confirm that a memorial exists.",
  },
  {
    id: "family",
    familyLabel: "Relatives with a private link",
    visitorLabel: "Family only",
    meaning: "Reached from a private link the family shares, never from this search.",
  },
  {
    id: "published",
    familyLabel: "Anyone who looks for them",
    visitorLabel: "Published",
    meaning: "The family chose to publish it, so it can appear in this search.",
  },
];

/** The family portal's own wording for each choice id — re-exported for the drift pin. */
export function familyVisibilityLabel(id: MemorialVisibility): string {
  return MEMORIAL_VISIBILITY.find((choice) => choice.id === id)?.familyLabel ?? "";
}

/** What the search reads. Kept deliberately narrow — nothing else is searchable. */
export const MEMORIAL_SEARCHABLE: ReadonlyArray<string> = [
  "The name the family published.",
  "The life dates on the record.",
  "The words, photograph and resting place on their memorial.",
];

/** What the search will never show — the privacy floor, in one place. */
export const MEMORIAL_NEVER_SHOWN: ReadonlyArray<string> = [
  "Living relatives — no names, addresses, dates or contact details.",
  "A memorial kept private, or shared only with family.",
  "Anyone whose family has not published a memorial.",
  "The office's own record of everyone in the park.",
];

/** The promises the memorial pages publish (one short line each). */
export const MEMORIAL_PROMISES: ReadonlyArray<string> = [
  "Nothing is published by default.",
  "Only what the family published appears.",
  "The only contact shown is the park office's own line.",
  "A family can change or close a memorial at any time.",
];

/* ------------------------------------------------------------------ search */

export type MemorialSearch = {
  name: string;
  /** Four-digit birth year, or "". */
  born: string;
  /** Four-digit death year, or "". */
  died: string;
};

export type MemorialSearchParse = {
  query: MemorialSearch;
  /** Set when the visitor typed something we cannot read (validation state). */
  error: string | null;
};

/** One field's limit — untrusted input is clamped, never trusted. */
export const MEMORIAL_SEARCH_FIELD_MAX = 80;

const YEAR_RE = /^\d{4}$/;

/** First value of a search param, trimmed, collapsed and clamped. */
function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().replace(/\s+/g, " ").slice(0, MEMORIAL_SEARCH_FIELD_MAX);
}

/** The visitor's own year error, in plain words. */
export const YEAR_FORMAT_ERROR = "Enter each year as four digits — for example 1948.";
export const YEAR_ORDER_ERROR = "The first year is later than the second.";

/**
 * Read the query from untrusted search params. A malformed year is a real
 * validation state (the page renders the message), not a silent drop, and every
 * field is clamped before it reaches the matcher.
 */
export function parseMemorialSearch(
  params: Record<string, string | string[] | undefined>,
): MemorialSearchParse {
  const name = firstParam(params.name);
  const born = firstParam(params.born);
  const died = firstParam(params.died);
  const query = { name, born, died };
  if (born && !YEAR_RE.test(born)) return { query, error: YEAR_FORMAT_ERROR };
  if (died && !YEAR_RE.test(died)) return { query, error: YEAR_FORMAT_ERROR };
  if (born && died && Number(born) > Number(died)) return { query, error: YEAR_ORDER_ERROR };
  return { query, error: null };
}

/** Did the visitor actually ask for someone? An empty search never lists anyone. */
export function hasMemorialSearch(query: MemorialSearch): boolean {
  return Boolean(query.name || query.born || query.died);
}

/** Case- and accent-insensitive folding for name matching. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/* ---------------------------------------------------------- the record shape */

export type MemorialLifeDates = {
  /** Earliest year on the record, when known. */
  from: number | null;
  /** Latest year on the record, when known. */
  to: number | null;
  /** What the memorial prints, exactly as the family sees it. */
  display: string;
};

export type MemorialPhoto = {
  /** Family-supplied image source; the view never invents one. */
  src: string;
  /** The family's own description, or a plain one when they gave none. */
  alt: string;
};

export type MemorialRestingPlace = {
  park: string;
  section: string;
  lot: string;
  /**
   * The plot's stable code on the park map (e.g. "A-001"), when the family
   * published one. The map deep-link (`/map?plot=`) keys on this code, so the
   * resting place can be found on the masterplan and in the 3D park without
   * matching display text (the record's `lot` is a label like "A-01").
   */
  plot?: string | null;
};

/**
 * A memorial the family has published. This is the ONLY shape any public screen
 * may render, and only the reader may build it — from a record whose visibility
 * is `published`.
 */
export type PublishedMemorial = {
  /** URL segment. In the real service this is unguessable; here it is the record id. */
  id: string;
  name: string;
  life_dates: MemorialLifeDates;
  /** The family's own words, one paragraph per line, in their order. */
  remembrance: readonly string[];
  photo: MemorialPhoto | null;
  resting_place: MemorialRestingPlace | null;
  published_on: string | null;
};

/** The first line of the remembrance — what a visitor reads at a glance. */
export function memorialFirstLine(memorial: PublishedMemorial): string {
  return memorial.remembrance[0] ?? "";
}

/** Where they rest, in one line; null when the family published no resting place. */
export function memorialRestingLine(memorial: PublishedMemorial): string | null {
  const place = memorial.resting_place;
  if (!place) return null;
  return [
    place.park,
    place.section ? `Section ${place.section}` : "",
    place.lot ? `Lot ${place.lot}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The plot's stable code for the map, or null when the record carries none.
 * This is the ONLY bridge from a memorial to the park map: a page must never
 * guess a plot from the resting-place text.
 */
export function memorialPlotCode(memorial: PublishedMemorial): string | null {
  const plot = memorial.resting_place?.plot;
  return typeof plot === "string" && plot.trim().length > 0 ? plot.trim() : null;
}

/**
 * The ONE action a found memorial offers: the 3D park opened on the plot
 * (`view=3d`). Null when the family published no plot, so the page renders an
 * honest fallback instead of a dead button.
 *
 * `park=villa` is the product's ONE park (components/public-park-map.tsx —
 * `VILLA_PARK_ID`); the record's `park` is a display name, never the id.
 */
export function memorialPlotHref(memorial: PublishedMemorial): string | null {
  const plot = memorialPlotCode(memorial);
  if (!plot) return null;
  return `/map?park=villa&plot=${encodeURIComponent(plot)}&view=3d`;
}

/* ---------------------------------------------------------------- matching */

/**
 * The search. An empty query matches NOBODY — this function is the rule that
 * makes the screen a search instead of a park directory, so it is asserted
 * directly in `tests/unit/memorials.test.ts`.
 *
 * Name: every word the visitor typed must appear in the published name (accent-
 * and case-insensitive, any order). Years: `born` matches the record's first
 * year, `died` matches its last — an unmatched year excludes the memorial.
 */
export function matchMemorials(
  memorials: readonly PublishedMemorial[],
  query: MemorialSearch,
): PublishedMemorial[] {
  if (!hasMemorialSearch(query)) return [];

  const tokens = fold(query.name).split(/\s+/).filter(Boolean);
  return memorials.filter((memorial) => {
    if (tokens.length > 0) {
      const haystack = fold(memorial.name);
      if (!tokens.every((token) => haystack.includes(token))) return false;
    }
    if (query.born && String(memorial.life_dates.from ?? "") !== query.born) return false;
    if (query.died && String(memorial.life_dates.to ?? "") !== query.died) return false;
    return true;
  });
}

/* ------------------------------------------------------------------- copy */

/** The search's empty state — honest about every reason, including privacy. */
export const MEMORIAL_SEARCH_EMPTY_TITLE = "No memorial matches that search";
export const MEMORIAL_SEARCH_EMPTY_HINT =
  "It may be kept private, family only, or not exist. Only a family can publish a memorial.";

/**
 * The stronger empty state: the store holds NOTHING published at all, so the
 * honest answer is not "no match" but "nothing is published yet".
 */
export const MEMORIAL_SEARCH_NOBODY_TITLE = "No memorial can be found yet";
export const MEMORIAL_SEARCH_NOBODY_HINT =
  "Nothing is published yet. A memorial appears only when its family publishes it.";

/** Said plainly on every memorial surface while the service does not exist. */
export const MEMORIAL_SERVICE_NOTE =
  "The digital-memorial service is not switched on yet, so no family has been able to publish a memorial.";

/** The detail page's uniform answer for absent AND unpublished ids. */
export const MEMORIAL_UNAVAILABLE_TITLE = "This memorial cannot be shown here";
export const MEMORIAL_UNAVAILABLE_LEAD =
  "It may be kept private, family only, or not exist.";
export const MEMORIAL_UNAVAILABLE_HINT =
  "We cannot say which. A memorial appears only when its family publishes it.";

/** The family-search door the office answers. */
export const MEMORIAL_FIND_HREF = "/memorials/find";
