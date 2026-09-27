/**
 * dead-css — find rules that are BOTH unused at runtime AND unreferenced in source.
 *
 * Two independent signals, and a rule must fail both to be reported as safe:
 *
 *   1. RUNTIME — Chromium's CSS coverage (scripts/design-audit/css-coverage.mjs)
 *      never matched the rule on any of ~200 routes.
 *   2. SOURCE — no class name in the rule appears anywhere in app/, components/,
 *      lib/ or tests/.
 *
 * Signal 1 alone is unsafe: a `:hover`, `:focus-visible`, `[aria-expanded]` or
 * error-state rule reads as unused when nothing triggers it. Signal 2 alone is
 * unsafe: a class can be built dynamically (`\`card--${kind}\``) and never appear
 * literally. Requiring BOTH is what makes the deletion defensible.
 *
 * Usage: node scripts/design-audit/dead-css.mjs [--file styles/components.css]
 * Output: .design-audit/dead-css.md + dead-css.json
 */

import fs from "node:fs";
import path from "node:path";

const FILE = process.argv.includes("--file")
  ? process.argv[process.argv.indexOf("--file") + 1]
  : "styles/components.css";
const OUT = ".design-audit";

const css = fs.readFileSync(FILE, "utf8");

/** Every rule with its absolute byte range, at any nesting depth, plus the chain
 *  of at-rule preludes it sits inside.
 *
 *  The chain matters: a rule inside `@media print` or
 *  `@media (prefers-reduced-motion: reduce)` can NEVER be matched by a viewport
 *  sweep, so treating it as "unused" would delete the product's print stylesheet
 *  and its accessibility affordances. Those blocks are protected instead of
 *  measured — see PROTECTED_AT below.
 *
 *  Keyframe steps (`from`/`to`/`50%`) and at-rule preludes are NOT rules; the
 *  first version of this parser reported them as deletion candidates, which is
 *  how a tool starts lying. */
function extractRules(text) {
  const rules = [];
  let i = 0;
  const stack = [];
  const KEYFRAME_STEP = /^(from|to|\d+(?:\.\d+)?%)(?:\s*,\s*(?:from|to|\d+(?:\.\d+)?%))*$/i;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    if (ch === "{") {
      let start = i - 1;
      while (start >= 0 && !";}{".includes(text[start])) start--;
      // The span a caller deletes must be the WHOLE rule: the selector too, not
      // just `{ ... }`. Recording the brace alone left a dangling selector behind
      // and corrupted everything after it.
      let selStart = start + 1;
      while (selStart < i && /\s/.test(text[selStart])) selStart++;
      const selector = text
        .slice(start + 1, i)
        .replace(/\/\*[\s\S]*?\*\//g, " ")
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

/** At-rules no viewport sweep can reach. Their contents are never candidates. */
const PROTECTED_AT = /print|prefers-reduced-motion|prefers-contrast|forced-colors|color-scheme/i;

const rules = extractRules(css);
console.log(`${FILE}: ${rules.length} rules parsed`);

/* ---- signal 2: source references ---- */
const SRC_DIRS = ["app", "components", "lib", "tests"];
const srcFiles = [];
function walk(d) {
  let entries;
  try {
    entries = fs.readdirSync(d, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|mjs|jsx?)$/.test(e.name)) srcFiles.push(p);
  }
}
for (const d of SRC_DIRS) walk(d);

const source = srcFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
console.log(`source files scanned: ${srcFiles.length} (${(source.length / 1048576).toFixed(1)} MB)`);

const classesIn = (selector) =>
  [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);

/** Is any part of this class name present in the source?
 *
 *  CONSERVATIVE ON PURPOSE, and the first version got this backwards. It asked
 *  for `landing` as a whole token, so `landing` did NOT match `landing__title` —
 *  and the tool then reported the entire `.landing*` block as dead. An
 *  over-deleting tool is far worse than an under-deleting one, so a class counts
 *  as referenced when it appears as a whole token OR as the BEM root of a longer
 *  class (`landing` → `landing__title`, `card` → `card--raised`).
 *
 *  The remaining imprecision is one-directional: a short generic name like `card`
 *  will match inside unrelated text and keep a rule that might be dead. That
 *  costs a little tidiness and never costs a live style. */
function referencedInSource(name) {
  const escaped = name.replace(/[-]/g, "\\-");
  const asToken = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`);
  const asBemRoot = new RegExp(`(?<![\\w-])${escaped}(?=__|--)`);
  return asToken.test(source) || asBemRoot.test(source);
}

/* ---- signal 1: runtime coverage (matched by SELECTOR, not byte offset) ---- */
const coverageFile = path.join(OUT, "css-coverage.json");
const coverage = fs.existsSync(coverageFile) ? JSON.parse(fs.readFileSync(coverageFile, "utf8")) : null;

if (!coverage || !Array.isArray(coverage.usedSelectors)) {
  console.error(`\nNo usable ${coverageFile}. Run scripts/design-audit/css-coverage.mjs first.`);
  console.error("Without it there is only one signal, and one signal is not enough to delete.");
  process.exit(1);
}

/** Compare the way the MINIFIER does, or the two sides never meet.
 *
 *  The served CSS drops attribute quotes (`input[type="checkbox"]` becomes
 *  `input[type=checkbox]`) and Chromium reports the single-colon pseudo-element
 *  form. Matching raw text therefore classified rules that ARE used as unused —
 *  `input[type="checkbox"]` was a deletion candidate, which would have silently
 *  deleted the product's checkbox styling. */
const squash = (s) => s.replace(/\s+/g, "").replace(/["']/g, "").replace(/::/g, ":");

const usedSquashed = new Set(coverage.usedSelectors.map(squash));
console.log(`selectors seen used at runtime: ${usedSquashed.size}`);

/** A source rule counts as used when any of its comma-parts was matched on some
 *  route. Byte offsets are NOT used: a production build serves minified bundles,
 *  so source offsets and served offsets describe different files. */
function isUsed(rule) {
  return rule.selector.split(",").some((part) => usedSquashed.has(squash(part)));
}

/* ---- classify ---- */
const safeToDelete = [];
const interactionStates = [];
const protectedRules = [];
const live = [];

for (const rule of rules) {
  const names = classesIn(rule.selector);

  // Print / reduced-motion / forced-colors: no viewport can trigger these, so
  // "unused" here means nothing. They are never candidates.
  if (rule.atChain.some((at) => PROTECTED_AT.test(at))) {
    protectedRules.push(rule);
    continue;
  }

  const usedAtRuntime = isUsed(rule);
  const referenced = names.length > 0 && names.some(referencedInSource);

  if (usedAtRuntime) live.push(rule);
  else if (referenced) interactionStates.push(rule);
  else safeToDelete.push(rule);
}

const lineOf = (offset) => css.slice(0, offset).split("\n").length;

const md = [];
md.push(`# Dead CSS — measured candidates (${FILE})`);
md.push("");
md.push(`Rules parsed: **${rules.length}**  ·  used at runtime: **${live.length}**  ·  unused but referenced in source: **${interactionStates.length}**  ·  unused AND unreferenced: **${safeToDelete.length}**`);
md.push("");
md.push("A rule is only a deletion candidate when BOTH signals agree, so this list excludes");
md.push("hover/focus/aria/error states that merely were not triggered by the crawl.");
md.push("");
md.push("## Unused at runtime AND unreferenced in source");
md.push("");
md.push("| line | selector | classes |");
md.push("|---|---|---|");
for (const r of safeToDelete.slice(0, 300)) {
  md.push(`| ${lineOf(r.start)} | \`${r.selector.slice(0, 90)}\` | ${classesIn(r.selector).join(", ")} |`);
}
md.push("");
if (safeToDelete.length > 300) md.push(`…and ${safeToDelete.length - 300} more (see dead-css.json).`);
md.push("");
md.push("## Unused at runtime BUT referenced in source — DO NOT DELETE");
md.push("");
md.push("These are the interaction/state rules the crawl did not trigger. They are the reason a");
md.push("coverage-only sweep would have broken the product.");
md.push("");
md.push("| line | selector |");
md.push("|---|---|");
for (const r of interactionStates.slice(0, 150)) {
  md.push(`| ${lineOf(r.start)} | \`${r.selector.slice(0, 90)}\` |`);
}
md.push("");

fs.writeFileSync(path.join(OUT, "dead-css.md"), md.join("\n"));
fs.writeFileSync(
  path.join(OUT, "dead-css.json"),
  JSON.stringify(
    {
      file: FILE,
      counts: { rules: rules.length, live: live.length, interaction: interactionStates.length, dead: safeToDelete.length },
      safeToDelete: safeToDelete.map((r) => ({ line: lineOf(r.start), selector: r.selector, start: r.start, end: r.end })),
      interactionStates: interactionStates.map((r) => ({ line: lineOf(r.start), selector: r.selector })),
    },
    null,
    1
  )
);

console.log(`\nprotected (print / reduced-motion): ${protectedRules.length}`);
console.log(`used at runtime          : ${live.length}`);
console.log(`unused, referenced in src: ${interactionStates.length}  (state rules - keep)`);
console.log(`unused AND unreferenced  : ${safeToDelete.length}  (deletion candidates)`);
console.log(`\nwrote ${OUT}/dead-css.md and dead-css.json`);
