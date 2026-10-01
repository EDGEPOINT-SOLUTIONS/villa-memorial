/**
 * Digital memorial — the public privacy rules, the family's choices and the
 * search vocabulary (F-04).
 *
 * This is the most sensitive surface in the product: a stranger may search for
 * someone who has died, and a family's grief becomes public. The digital-memorial
 * service does not exist yet (`docs/06-cultural-digital-memorial/digital-memorial.md`,
 * blueprint §22–23), so the rules below are the SCREEN'S OWN contract, not a
 * promise deferred to a service:
 *
 *   · NOTHING IS PUBLISHED BY DEFAULT. A loved one has ONE switch, default OFF.
 *     `publishedMemorials` only ever builds a public shape for a loved one whose
 *     family turned the switch on, and `matchMemorials` refuses to list anyone
 *     for an empty query.
 *   · THE FAMILY CHOOSES EVERY FIELD. The name is shown whenever the switch is
 *     on and is not optional; the photograph, the birth year, the death year and
 *     the lot number are each the family's own choice and each defaults OFF. A
 *     memorial with the name alone is a complete page — a birth or death date is
 *     never required.
 *   · The living are never shown: no relatives, addresses, dates of birth beyond
 *     the one the family chose, or contact details — the office's own line is the
 *     only contact on a memorial.
 *   · The search is not a directory. An empty query lists nobody, and "nothing
 *     found" never reveals whether the person exists.
 *
 * The client's own public-search/privacy rules are still an open question
 * (`docs/07-client-villa/open-questions.md` — "Public memorial search/privacy
 * rules"). The pages publish the floor the product guarantees today and name that
 * open item plainly; they never assume an answer.
 */

/* ------------------------------------------------------- the family's choices */

/**
 * The fields a family may show, beside the one switch. The NAME is deliberately
 * absent: it is shown whenever the switch is on and is not optional.
 */
export type MemorialFieldKey = "photo" | "birth" | "death" | "lot";

/**
 * One loved one's memorial consent: the ONE switch plus what each field may
 * show. Every field defaults OFF — nothing is published until the family says so.
 */
export type MemorialConsent = {
  /** The one switch. Off means nothing about the person is public. */
  visible: boolean;
  show_photo: boolean;
  show_birth: boolean;
  show_death: boolean;
  show_lot: boolean;
};

/** The safe default: nothing public, every field off. */
export const MEMORIAL_CONSENT_DEFAULT: MemorialConsent = {
  visible: false,
  show_photo: false,
  show_birth: false,
  show_death: false,
  show_lot: false,
};

/**
 * One loved one's consent as the family page reads it: the choices plus the
 * person they belong to, who saved them and when. The public reader never exposes
 * `owner_user_id` (it only uses it to find the private portrait).
 */
export type MemorialConsentRecord = MemorialConsent & {
  person_id: string;
  owner_user_id: string | null;
  updated_at: string | null;
};

/** Every field key of a consent, so a validator can never miss one. */
export const MEMORIAL_FIELD_KEYS: ReadonlyArray<keyof MemorialConsent> = [
  "visible",
  "show_photo",
  "show_birth",
  "show_death",
  "show_lot",
];

/**
 * The field choices, in the family's order, each with the family's own label and
 * one short meaning. The family page renders these in order and the drift test
 * (`tests/unit/memorials.test.ts`) reads this list; the meanings stay ≤20 words.
 */
export const MEMORIAL_FIELD_CHOICES: ReadonlyArray<{
  key: MemorialFieldKey;
  label: string;
  meaning: string;
}> = [
  {
    key: "photo",
    label: "Show their photograph",
    meaning: "Only used if you have attached one. Private otherwise.",
  },
  {
    key: "birth",
    label: "Show the year they were born",
    meaning: "Leave it off and the year stays private.",
  },
  {
    key: "death",
    label: "Show the year they died",
    meaning: "Leave it off and the year stays private.",
  },
  {
    key: "lot",
    label: "Show the lot number",
    meaning: "The lot is your family's private business.",
  },
];

/**
 * The same choices in a VISITOR's terms, for the search page and the unavailable
 * memorial page (one component renders this list, so the two surfaces cannot
 * describe the choices differently).
 */
export const MEMORIAL_PUBLIC_CHOICES: ReadonlyArray<{
  id: "visible" | "name" | "photo" | "dates" | "lot";
  label: string;
  meaning: string;
}> = [
  {
    id: "visible",
    label: "Kept private until the family says so",
    meaning: "Nothing appears until a family turns their memorial on.",
  },
  {
    id: "name",
    label: "The name",
    meaning: "The name shows whenever a family turns the memorial on.",
  },
  {
    id: "photo",
    label: "A photograph",
    meaning: "Shown only when the family allows it and attaches one.",
  },
  {
    id: "dates",
    label: "The years",
    meaning: "The birth and death years are each the family's own choice.",
  },
  {
    id: "lot",
    label: "The resting place",
    meaning: "The lot number stays private unless the family allows it.",
  },
];

/**
 * The family page's own words for one field choice, keyed by the field. Exported
 * so the page and the drift pin read the same list (no second copy).
 */
export function memorialFieldChoice(key: MemorialFieldKey) {
  return MEMORIAL_FIELD_CHOICES.find((choice) => choice.key === key);
}

/* ---------------------------------------------------------- consent reading */

/**
 * Is this a structurally complete consent? Every boolean must be present and a
 * real boolean — an unknown shape is refused rather than guessed.
 */
export function isMemorialConsent(value: unknown): value is MemorialConsent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return MEMORIAL_FIELD_KEYS.every((key) => typeof raw[key] === "boolean");
}

/**
 * Read one consent tolerantly: a missing/unknown field falls back to the safe
 * default (OFF). A caller never gets `undefined` for a field, so a view cannot
 * accidentally treat "not recorded" as "publish it".
 */
export function normalizeMemorialConsent(value: unknown): MemorialConsent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...MEMORIAL_CONSENT_DEFAULT };
  }
  const raw = value as Record<string, unknown>;
  return {
    visible: raw.visible === true,
    show_photo: raw.show_photo === true,
    show_birth: raw.show_birth === true,
    show_death: raw.show_death === true,
    show_lot: raw.show_lot === true,
  };
}

/* --------------------------------------------------------------- life dates */

export type MemorialLifeDates = {
  /** The birth year the family chose to show, or null when hidden/unknown. */
  from: number | null;
  /** The death year the family chose to show, or null when hidden/unknown. */
  to: number | null;
  /** What the memorial prints — the chosen years only. Empty when none shown. */
  display: string;
};

/** The one place the chosen years become words. Never invents a date. */
export function memorialLifeDatesDisplay(from: number | null, to: number | null): string {
  if (from !== null && to !== null) return `${from} – ${to}`;
  if (from !== null) return `Born ${from}`;
  if (to !== null) return `Died ${to}`;
  return "";
}

/**
 * Read the office record's own life-dates display ("1948 – 2026") into the two
 * years. Two years are the expected shape; a single year is read as the birth
 * year (the record is the office's, never re-worded here).
 */
export function parseLifeDatesYears(display: string): { from: number | null; to: number | null } {
  const years = [...display.matchAll(/\d{4}/g)].map((match) => Number(match[0]));
  if (years.length >= 2) return { from: years[0], to: years[years.length - 1] };
  if (years.length === 1) return { from: years[0], to: null };
  return { from: null, to: null };
}

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
 * may render, and only the reader may build it — from a record whose switch is
 * on. `life_dates.display` may be empty (a name-only memorial) and
 * `remembrance` may be empty (no story is authored yet).
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

/* ---------------------------------------------------------------- matching */

/**
 * The search. An empty query matches NOBODY — this function is the rule that
 * makes the screen a search instead of a park directory, so it is asserted
 * directly in `tests/unit/memorials.test.ts`.
 *
 * Name: every word the visitor typed must appear in the published name (accent-
 * and case-insensitive, any order). Years: `born` matches the record's first
 * year, `died` matches its last — an unmatched year excludes the memorial. A
 * hidden year is `null`, so a hidden date can never be searched for.
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
  "It may be kept private, or not exist. Only a family can publish a memorial.";

/**
 * The stronger empty state: the store holds NOTHING published at all, so the
 * honest answer is not "no match" but "nothing is published yet".
 */
export const MEMORIAL_SEARCH_NOBODY_TITLE = "No memorial can be found yet";
export const MEMORIAL_SEARCH_NOBODY_HINT =
  "Nothing is published yet. A memorial appears only when its family switches it on.";

/**
 * Said plainly on every memorial surface while the OFFICE's memorial service
 * (stories, messages, moderation) does not exist. A family CAN switch a memorial
 * on today, so this line never claims otherwise — it names what is still missing.
 */
export const MEMORIAL_SERVICE_NOTE =
  "A family can switch a memorial on today; stories and messages are still being built by the office.";

/** The detail page's uniform answer for absent AND hidden ids. */
export const MEMORIAL_UNAVAILABLE_TITLE = "This memorial cannot be shown here";
export const MEMORIAL_UNAVAILABLE_LEAD =
  "It may be kept private, or not exist.";
export const MEMORIAL_UNAVAILABLE_HINT =
  "We cannot say which. A memorial appears only when its family switches it on.";

/** The family-search door the office answers. */
export const MEMORIAL_FIND_HREF = "/memorials/find";

/** What the search reads. Kept deliberately narrow — nothing else is searchable. */
export const MEMORIAL_SEARCHABLE: ReadonlyArray<string> = [
  "The name the family published.",
  "The birth and death years the family chose to show.",
  "A photograph the family chose to share.",
  "The resting place the family chose to show.",
];

/** What the search will never show — the privacy floor, in one place. */
export const MEMORIAL_NEVER_SHOWN: ReadonlyArray<string> = [
  "Living relatives — no names, addresses, dates or contact details.",
  "A memorial the family has not switched on.",
  "Anyone whose family has not published a memorial.",
  "The office's own record of everyone in the park.",
];

/** The promises the memorial pages publish (one short line each). */
export const MEMORIAL_PROMISES: ReadonlyArray<string> = [
  "Nothing is published by default.",
  "Only what the family chose to show appears.",
  "The only contact shown is the park office's own line.",
  "A family can change or close a memorial at any time.",
];
