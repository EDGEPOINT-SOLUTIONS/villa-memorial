import { expect } from "vitest";

/**
 * Guards the hydration error class the captain reported on the family dashboard:
 * React's server HTML nested a `<p>` inside the note's `<p class="ag-note">`, and
 * the browser parser split it, so hydration mismatched. React's own warning is
 * easy to miss in a passing suite; asserting on the rendered markup is not.
 *
 * `renderToStaticMarkup` emits tags in the exact nesting they were composed with
 * (no browser auto-correction), so scanning the string for a `<p>` opened while
 * another `<p>` is still open reproduces the browser's complaint exactly.
 */
export function assertNoParagraphNesting(html: string, where: string): void {
  const tags = html.match(/<\/?p(?:\s[^>]*)?>/gi) ?? [];
  let depth = 0;
  for (const tag of tags) {
    if (tag.startsWith("</")) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    expect(depth, `${where}: a <p> is nested inside another <p> — React hydration error`).toBe(0);
    depth += 1;
  }
  expect(depth, `${where}: unbalanced <p> tags`).toBe(0);
}
