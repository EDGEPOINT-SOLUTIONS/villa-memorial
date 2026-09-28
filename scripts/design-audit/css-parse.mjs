/**
 * css-parse — the ONE brace-aware CSS rule parser for the design-audit tools.
 *
 * It used to live inside `dead-css.mjs`, and `prune-dead-css.mjs` then verified its
 * own output by substring-matching raw text. That made the verifier weaker than the
 * thing it checked: an emptied `@media (max-width: 88rem)` prelude, or two selectors
 * that merely sit next to each other, read as a "lost selector". A verifier built on
 * the same assumptions as the pruner is not a verifier — sharing this parser lets the
 * prune compare real selector SETS instead of raw text.
 */

/** Keyframe steps (`from`/`to`/`50%`) look like rules but are not selectors. */
const KEYFRAME_STEP = /^(from|to|\d+(?:\.\d+)?%)(?:\s*,\s*(?:from|to|\d+(?:\.\d+)?%))*$/i;

/** Blank every comment, preserving length and newlines, so byte offsets still
 *  address the ORIGINAL text.
 *
 *  WHY THIS IS NOT OPTIONAL. The scanner skips comments on its forward pass, but a
 *  rule's selector is recovered by scanning BACKWARD from its `{` to the nearest
 *  `;`, `{` or `}` — and that backward walk knew nothing about comments. When the
 *  comment above a rule contained a `;` (one does, above the phone block at
 *  `@media (max-width: 40rem)`), the captured "selector" began MID-comment: it had
 *  no `/*`, so the strip regex could not remove it, and `@media` was no longer
 *  recognised as an at-rule. The block was recorded as a 3,304-byte "rule" that
 *  swallowed three live ones — the prune would have deleted them (caught
 *  2026-09-28 by the selector-set invariant in `prune-dead-css.mjs`). Masking the
 *  comments before the scan removes the class of bug, not just the instance. */
function maskComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/** Every rule with its absolute byte range, at any nesting depth, plus the chain
 *  of at-rule preludes it sits inside.
 *
 *  The chain matters: a rule inside `@media print` or
 *  `@media (prefers-reduced-motion: reduce)` can NEVER be matched by a viewport
 *  sweep, so treating it as "unused" would delete the product's print stylesheet
 *  and its accessibility affordances. Those blocks are protected instead of
 *  measured — see PROTECTED_AT in `dead-css.mjs`.
 *
 *  The span a caller deletes is the WHOLE rule: the selector too, not just
 *  `{ ... }`. Recording the brace alone left a dangling selector behind and
 *  corrupted everything after it. */
export function extractRules(text) {
  const rules = [];
  const src = maskComments(text);
  let i = 0;
  const stack = [];
  while (i < src.length) {
    const ch = src[i];
    if (ch === "{") {
      let start = i - 1;
      while (start >= 0 && !";}{".includes(src[start])) start--;
      let selStart = start + 1;
      while (selStart < i && /\s/.test(src[selStart])) selStart++;
      const selector = src
        .slice(start + 1, i)
        .replace(/\s+/g, " ")
        .trim();
      const outer = stack[stack.length - 1];
      const atChain = outer ? [...outer.atChain, outer.selector] : [];
      stack.push({ selector, open: i, selStart, atChain });
      i++;
      continue;
    }
    if (ch === "}") {
      const frame = stack.pop();
      if (frame && frame.selector && !frame.selector.startsWith("@") && !KEYFRAME_STEP.test(frame.selector)) {
        rules.push({ selector: frame.selector, start: frame.selStart, end: i + 1, atChain: frame.atChain });
      }
      i++;
      continue;
    }
    i++;
  }
  return rules;
}

/** The way the minifier rewrites selectors: spaces gone, attribute quotes gone,
 *  `::` collapsed to `:`. Comparing raw text classifies intact rules as changed. */
export const squash = (s) => s.replace(/\s+/g, "").replace(/["']/g, "").replace(/::/g, ":");

/** The set of squashed comma-parts across a rule list — the unit a selector is
 *  actually matched by, so membership is an exact test, never a substring. */
export function selectorParts(rules) {
  const set = new Set();
  for (const r of rules) {
    for (const part of r.selector.split(",")) set.add(squash(part.trim()));
  }
  return set;
}
