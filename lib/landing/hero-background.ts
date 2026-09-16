/**
 * Hero background theming — the staff-chosen background colour and its
 * transparency for the public home hero (captain's brief, 2026-09-17).
 *
 * Two layers of knowledge live here, kept out of both the view and the content
 * model:
 *  - the BRAND PALETTE the staff editor offers (the site's own token colours,
 *    one entry per token — `tests/unit/hero-background.test.ts` pins every
 *    value back to styles/tokens.css so the picker can never drift from the
 *    palette);
 *  - the pure reader / validator / style helpers that the content model
 *    (lib/api-client/landing.ts) and the public view
 *    (components/landing/landing-view.tsx) share.
 *
 * LAYERING CONTRACT (also stated in the PR): the chosen colour paints as ONE
 * dedicated layer ABOVE the background photo and its readability scrim, and
 * BELOW every hero copy block (`.hero-home__wash` in styles/components.css).
 * Transparency 0 = the colour is solid; 100 = the layer is fully see-through
 * and therefore absent. 100 is the default, so a document that never touched
 * these fields renders today's shipped sky gradient exactly as before.
 */

/** 100% = fully transparent = the shipped hero look (legacy-document default). */
export const HERO_BACKGROUND_TRANSPARENT = 100;

/**
 * Starting point for the free colour inputs when the document carries none.
 * Daylight sky (`--sky-500`) — on-brand, and visible on its own preview.
 */
export const HERO_BACKGROUND_DEFAULT_COLOUR = "#3f97d1";

/**
 * Choosing a colour when the document had none starts here, not at the
 * invisible 100% default: staff pick a swatch and immediately see the layer.
 * Later colour changes keep whatever transparency staff set on the slider.
 */
export const HERO_BACKGROUND_FIRST_PICK_TRANSPARENCY = 40;

export type HeroBackgroundFields = {
  background: string | null;
  backgroundTransparency: number;
};

export type HeroBackgroundPatch = {
  background: string | null;
  backgroundTransparency: number;
};

/** The layer the view renders (absent = no wash element at all). */
export type HeroBackgroundLayer = { background: string; opacity: number };

/**
 * The site's own brand colours, for the editor's palette. `value` mirrors the
 * hex primitive named by `token` in styles/tokens.css one-to-one (a unit test
 * parses that file and fails if they ever drift).
 */
export const HERO_BACKGROUND_PALETTE: ReadonlyArray<{
  name: string;
  value: string;
  token: string;
}> = [
  { name: "Daylight sky", value: "#c4e6f8", token: "--sky-200" },
  { name: "Morning sky", value: "#6bbce8", token: "--sky-400" },
  { name: "Clear sky", value: "#3f97d1", token: "--sky-500" },
  { name: "Deep sky", value: "#22699a", token: "--sky-700" },
  { name: "Sky ink", value: "#0d2c42", token: "--sky-950" },
  { name: "Navy ink", value: "#081c31", token: "--navy-950" },
  { name: "Marble paper", value: "#f5f3ee", token: "--marble-100" },
  { name: "Golden hour", value: "#f1cc5e", token: "--gold-300" },
  { name: "Brass", value: "#c79b1e", token: "--gold-500" },
  { name: "Sage", value: "#6f8f6a", token: "--sage-500" },
  { name: "Clay", value: "#b3695e", token: "--clay-500" },
];

/* ----------------------------- validation -------------------------------- */

const HEX_COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

// The CSS named colours (plus `transparent`). Named colours are a convenience
// for the free text input; anything not on this list and not a hex/functional
// colour is rejected with a clear message.
const NAMED_COLOURS = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue " +
    "blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk " +
    "crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki " +
    "darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
    "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue " +
    "dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite " +
    "gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
    "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen " +
    "lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen " +
    "magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
    "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream " +
    "mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
    "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
    "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
    "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen " +
    "steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow " +
    "yellowgreen transparent"
  ).split(" "),
);

/** rgb()/rgba()/hsl()/hsla()/hwb() with plain numeric arguments only — never a
 * `var()`, `url()` or `calc()` payload sneaking into a content document. */
function isFunctionalColour(value: string): boolean {
  const match = /^(rgba?|hsla?|hwb)\((.*)\)$/i.exec(value);
  if (!match) return false;
  const args = match[2].replace(/deg/gi, "");
  return /^[0-9.+\-\s,%/]*$/.test(args) && /[0-9]/.test(args);
}

/**
 * True for a CSS colour literal the content model may publish: hex (3/4/6/8
 * digits), rgb/rgba/hsl/hsla/hwb with numeric arguments, or a named colour.
 * Deliberately rejects CSS functions that could carry a URL or another
 * declaration (`url()`, `var()`, `color-mix()`, …) — the value is rendered
 * into an inline style.
 */
export function isValidCssColor(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return HEX_COLOUR.test(v) || isFunctionalColour(v) || NAMED_COLOURS.has(v.toLowerCase());
}

/** Tolerant read of the transparency field: finite numbers only, clamped to
 * 0–100; anything else (legacy documents lack the field entirely) reads as the
 * invisible default. */
export function readHeroTransparency(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return HERO_BACKGROUND_TRANSPARENT;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

/* ------------------------------- rendering ------------------------------- */

/**
 * The wash layer the public hero should render, or null when no layer applies
 * (no colour chosen, invalid colour — the view never trusts content blindly —
 * or 100% transparency). At 100% the hero markup stays exactly as before the
 * feature existed.
 */
export function heroBackgroundLayer(fields: HeroBackgroundFields): HeroBackgroundLayer | null {
  const colour = (fields.background ?? "").trim();
  if (!isValidCssColor(colour)) return null;
  const transparency = readHeroTransparency(fields.backgroundTransparency);
  if (transparency >= HERO_BACKGROUND_TRANSPARENT) return null;
  return { background: colour, opacity: (100 - transparency) / 100 };
}

/**
 * The document patch a colour choice in the editor produces. Picking a colour
 * when the document never had one starts at a visible transparency (staff can
 * always slide it back to 100% = the shipped look); every later pick keeps the
 * staff's slider untouched.
 */
export function heroBackgroundPick(
  fields: HeroBackgroundFields,
  colour: string,
): HeroBackgroundPatch {
  const hadNone = !isValidCssColor((fields.background ?? "").trim());
  const current = readHeroTransparency(fields.backgroundTransparency);
  return {
    background: colour,
    backgroundTransparency:
      hadNone && current >= HERO_BACKGROUND_TRANSPARENT
        ? HERO_BACKGROUND_FIRST_PICK_TRANSPARENCY
        : current,
  };
}
