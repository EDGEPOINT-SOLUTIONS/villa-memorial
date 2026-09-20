/**
 * The publish gate for text typed into ANY content editor.
 *
 * The product owns exactly one face — Inter, self-hosted (styles/fonts.css). It
 * carries no emoji, so an emoji typed into a content editor does not render as a
 * picture or as a fallback face: the browser prints a "tofu" box on the public
 * page. The landing seed shipped one (U+1F33F, the herb) and the home showed the
 * empty box until the publish gate learned to refuse it.
 *
 * The rule is deliberately narrow: it names the astral emoji/pictograph blocks
 * plus the two invisible modifiers that only exist to dress them. Everything the
 * product DOES publish stays legal — ₱ · — → ↑ ↓ ← ↔ ▸ ▾ ◆ ○ ● ⚠ ✓ ✕ are all
 * BMP characters the face carries, and a rule written as "no symbols" would
 * reject the arrows and marks this product uses as text.
 *
 * One home, two consumers: the landing document's validator
 * (lib/api-client/landing.ts re-exports this) and the content catalogue's
 * page-document validator (lib/content-catalog.ts).
 *
 * Returns the offending characters, empty when the text is publishable.
 */
export function unrenderableGlyphs(text: string): string[] {
  const bad: string[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    const emoji =
      (cp >= 0x1f000 && cp <= 0x1faff) || // pictographs, emoticons, transport, symbols
      (cp >= 0x1f1e6 && cp <= 0x1f1ff) || // regional indicators (flags)
      cp === 0xfe0f || // variation selector-16: turns a BMP mark into an emoji
      cp === 0x20e3; // enclosing keycap
    if (emoji) bad.push(ch);
  }
  return bad;
}
