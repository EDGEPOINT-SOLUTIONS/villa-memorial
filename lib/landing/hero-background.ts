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
 * dedicated layer ABOVE the background photo and BELOW every hero copy block
 * (`.hero-home__wash` in styles/components.css). Transparency 0 = the colour is
 * solid; 100 = the layer is fully see-through and therefore absent, so the
 * photograph itself is UNTOUCHED. 100 is the default, so a document that never
 * touched these fields shows the clear photograph (the old constant readability
 * scrim was removed by the captain's 2026-09-21 direction). An image-only hero
 * — a photo and no eyebrow/headline/lead — renders no layer at all.
 *
 * The same module owns the AUTHOR-SETTABLE HERO TEXT COLOUR: the hero carries
 * one optional CSS colour that re-inks its copy through the
 * `--hero-text-colour` custom property the hero rules read. Absent = the
 * shipped token ink, so legacy documents are untouched.
 */
import type { CSSProperties } from "react";

/** 100% = fully transparent = the clear photograph (legacy-document default). */
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

/** Any hero that carries the text-colour field (the landing hero or a page document's). */
export type HeroTextColourFields = { textColour: string | null };

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

/**
 * Tolerant read of the author's hero text colour: a trimmed, non-empty string
 * kept as written (the validator names a bad value; the view never trusts it).
 * Legacy documents lack the field entirely and read as null = the token ink.
 */
export function readHeroTextColour(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
 * The CSS custom property that re-inks a hero's copy, or null when the document
 * carries no valid colour (every hero copy rule falls back to its token ink).
 * Painted on the hero container; the copy rules read
 * `var(--hero-text-colour, <token>)`, so a legacy document is untouched.
 */
export function heroTextColourStyle(fields: HeroTextColourFields): CSSProperties | null {
  const colour = (fields.textColour ?? "").trim();
  if (!isValidCssColor(colour)) return null;
  // The custom property is the one React.CSSProperties does not model for this
  // @types/react version; cast once here so every call site stays typed.
  return { "--hero-text-colour": colour } as CSSProperties;
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
