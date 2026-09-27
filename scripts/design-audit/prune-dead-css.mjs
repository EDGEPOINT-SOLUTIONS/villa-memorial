/**
 * prune-dead-css — delete the measured dead rules from a stylesheet.
 *
 * It deletes ONLY the rules in .design-audit/dead-css.json, which already passed
 * two independent signals (never matched at runtime across 208 routes, and no
 * class name present anywhere in the source).
 *
 * TWO THINGS THIS TOOL LEARNED THE HARD WAY, both kept as guards because both
 * silently corrupt a stylesheet:
 *
 *  1. DELETE BY BYTE RANGE, NEVER BY LINE. The first version expanded each rule
 *     to whole lines. components.css has rules that share a line with their
 *     neighbour, so removing ".a's line" also removed ".b" — the invariant caught
 *     229 live selectors about to disappear. Line-granular editing of a
 *     stylesheet is a delete key with extra steps.
 *
 *  2. STATE AND CHECK AN INVARIANT BEFORE WRITING. Every selector that WAS
 *     matched at runtime must still exist afterwards. If it does not, this
 *     refuses to write rather than producing a subtly broken product.
 *
 * A comment block immediately above a deleted rule goes with it — an orphaned
 * comment describing a rule that no longer exists is the same lie as a stale doc.
 *
 * Usage: node scripts/design-audit/prune-dead-css.mjs [--file path] [--dry]
 */

import fs from "node:fs";

const args = process.argv.slice(2);
const FILE = args.includes("--file") ? args[args.indexOf("--file") + 1] : "styles/components.css";
const DRY = args.includes("--dry");

const css = fs.readFileSync(FILE, "utf8");
const dead = JSON.parse(fs.readFileSync(".design-audit/dead-css.json", "utf8"));
const coverage = JSON.parse(fs.readFileSync(".design-audit/css-coverage.json", "utf8"));

if (dead.file !== FILE) {
  console.error(`dead-css.json is for ${dead.file}, not ${FILE}. Re-run dead-css.mjs first.`);
  process.exit(1);
}

const normalize = (s) => s.trim().replace(/\s+/g, " ");

/** The byte span of a comment block that sits directly above `offset`. */
function commentSpanBefore(offset) {
  // walk back over whitespace only
  let p = offset;
  while (p > 0 && /\s/.test(css[p - 1])) p--;
  if (p < 2 || css[p - 1] !== "/" || css[p - 2] !== "*") return null;
  const open = css.lastIndexOf("/*", p - 2);
  return open === -1 ? null : [open, offset];
}

/* ---- byte-precise spans ---- */
const spans = [];
for (const r of dead.safeToDelete) {
  const c = commentSpanBefore(r.start);
  spans.push(c ? [c[0], r.end] : [r.start, r.end]);
}

spans.sort((a, b) => a[0] - b[0]);
const merged = [];
for (const [s, e] of spans) {
  const last = merged[merged.length - 1];
  if (last && s <= last[1]) last[1] = Math.max(last[1], e);
  else merged.push([s, e]);
}

const removedBytes = merged.reduce((a, [s, e]) => a + (e - s), 0);
let out = "";
let cursor = 0;
for (const [s, e] of merged) {
  out += css.slice(cursor, s);
  cursor = e;
}
out += css.slice(cursor);

/* ---- tidy: drop @media blocks that lost every rule, then squeeze blank runs ---- */
let emptied = 0;
out = out.replace(/@media[^{]*\{\s*\}/g, () => {
  emptied++;
  return "";
});
// squeeze the blank line a removed rule left behind, but keep paragraph breaks
out = out.replace(/\n[ \t]*\n[ \t]*\n+/g, "\n\n");
out = out.replace(/[ \t]+\n/g, "\n");

/* ---- THE INVARIANT ----
 *
 * Two lessons, both from watching it cry wolf:
 *
 *  · CHECK BY SUBSTRING, NOT BY RE-PARSING. The first version re-extracted
 *    selectors from the pruned text with the same hand-rolled parser and reported
 *    279 live selectors as "lost" — including `.btn--accent`, which was sitting
 *    right there in the output. A verifier built on the same assumptions as the
 *    thing it verifies is not a verifier; it is a second guess.
 *
 *  · COMPARE NORMALIZED, BECAUSE THE MINIFIER REWRITES SELECTORS. The served CSS
 *    drops attribute quotes (`[type="checkbox"]` → `[type=checkbox]`) and
 *    Chromium may report the single-colon pseudo-element form. Comparing raw text
 *    therefore flagged 169 perfectly intact rules. Normalizing whitespace, quotes
 *    and `::`→`:` on BOTH sides leaves only real differences.
 */
const squash = (s) => s.replace(/\s+/g, "").replace(/["']/g, "").replace(/::/g, ":");
const haystack = squash(out);
const usedSelectors = new Set(coverage.usedSelectors.map(normalize));

/* Only assert about selectors THIS FILE actually contained. The runtime selector
   set spans every stylesheet plus the libraries — utilities.css's `.mt-4`,
   base.css's `::placeholder` and Leaflet's own `.leaflet-pane` were all reported
   as "lost from components.css", which they never were. */
const originalSquashed = squash(css);
const owned = [...usedSelectors].filter((s) => originalSquashed.includes(squash(s)));
const lost = owned.filter((s) => !haystack.includes(squash(s)));

console.log(`file                   : ${FILE}`);
console.log(`rules to delete        : ${dead.safeToDelete.length}`);
console.log(`byte spans removed     : ${merged.length}`);
console.log(`bytes removed          : ${removedBytes} of ${css.length} (${((removedBytes / css.length) * 100).toFixed(1)}%)`);
console.log(`lines                  : ${css.split("\n").length} -> ${out.split("\n").length}`);
console.log(`empty @media removed   : ${emptied}`);
console.log(`runtime-used selectors : ${usedSelectors.size}`);
console.log(`  of which this file owns: ${owned.length}`);
console.log(`  ...that would be LOST  : ${lost.length}`);

if (lost.length) {
  console.error("\nREFUSING TO WRITE — these selectors were matched at runtime and would disappear:");
  for (const l of lost.slice(0, 25)) console.error(`   ${l}`);
  process.exit(1);
}

console.log("\nINVARIANT HOLDS: every selector matched at runtime survives the prune.");

if (DRY) {
  console.log("\n--dry: nothing written.");
} else {
  fs.writeFileSync(FILE, out, "utf8");
  console.log(`\nwrote ${FILE}`);
}
