/**
 * Rendered-prose measurement for the reading-budget guard
 * (tests/unit/reading-budget.test.tsx).
 *
 * The customer-facing rule: a page must be understood at a glance, so paragraph
 * prose is budgeted. This helper measures the markup the page actually renders:
 * every `<p>` element is a paragraph (the budget's unit), every `<li>` is a
 * short list item, and everything else on the page — headings, table cells,
 * chips, price blocks, buttons — is structure, not counted prose.
 *
 * Node has no DOM library in this repo, so the extraction is regex-based over
 * the server markup the tests render. That is safe for these pages: `renderToStaticMarkup`
 * emits well-formed, non-nested tags, and the components under test never nest
 * a `<p>` inside a `<p>` (tests/helpers/paragraph-nesting.ts pins that).
 */

export type ProseStats = {
  /** Every visible word in the measured markup (the captain's "words"). */
  words: number;
  /** Number of <p> elements (the budget's paragraphs). */
  paragraphs: number;
  /** Total words inside <p> elements (the budget's paragraph prose). */
  paragraphWords: number;
  /** The longest single paragraph. */
  longest: { words: number; text: string };
  /** <li> list items: count + longest, so a list cannot smuggle a paragraph. */
  listItems: { count: number; longestWords: number; text: string };
};

const ENTITIES: ReadonlyArray<[RegExp, string]> = [
  [/&#x27;|&#39;/g, "'"],
  [/&quot;|&#34;/g, '"'],
  [/&amp;/g, "&"],
  [/&mdash;/g, "—"],
  [/&ndash;/g, "–"],
  [/&hellip;/g, "…"],
  [/&middot;/g, "·"],
  [/&nbsp;/g, " "],
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
];

export function decodeEntities(value: string): string {
  let out = value;
  for (const [pattern, replacement] of ENTITIES) out = out.replace(pattern, replacement);
  // Any remaining numeric entity (\u2019 etc.) — decode to its code point.
  return out.replace(/&#(x?)([0-9a-f]+);/gi, (_, hex: string, digits: string) =>
    String.fromCodePoint(Number.parseInt(digits, hex ? 16 : 10)),
  );
}

/** Visible text of an HTML fragment: tags dropped, whitespace collapsed. */
export function textOf(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/**
 * Words for the reading budget: whitespace-separated runs that contain at
 * least one letter or digit, so "—" and "·" separators are not words and
 * "₱1,500" counts as one token (it is a number the reader skips).
 */
export function wordsOf(text: string): number {
  return (text.match(/[A-Za-z0-9₱][^\s]*/g) ?? []).filter((t) => /[A-Za-z0-9]/.test(t)).length;
}

/** Strip the parts of the document that are not customer prose. */
function contentOnly(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ");
}

/** All matches of one tag's inner HTML, in document order. */
function elements(html: string, tag: string): string[] {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))].map(
    (m) => m[1],
  );
}

export function measureProse(html: string): ProseStats {
  const content = contentOnly(html);
  const paragraphs = elements(content, "p").map(textOf);
  const paragraphCounts = paragraphs.map((p) => ({ text: p, words: wordsOf(p) }));
  const longest = paragraphCounts.reduce(
    (best, p) => (p.words > best.words ? p : best),
    { text: "", words: 0 },
  );
  // <li> items: drop any nested <p> first so the paragraph budget is not double-counted.
  const listItems = elements(content, "li")
    .map((item) => textOf(item.replace(/<p\b[\s\S]*?<\/p>/gi, " ")))
    .filter((item) => item.length > 0);
  const longestItem = listItems.reduce(
    (best, p) => (wordsOf(p) > wordsOf(best) ? p : best),
    "",
  );
  return {
    words: wordsOf(textOf(content)),
    paragraphs: paragraphs.length,
    paragraphWords: paragraphCounts.reduce((n, p) => n + p.words, 0),
    longest,
    listItems: {
      count: listItems.length,
      longestWords: wordsOf(longestItem),
      text: longestItem,
    },
  };
}
