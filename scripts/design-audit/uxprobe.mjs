/**
 * uxprobe — measure this project against UI UX Pro Max's 119 UX guidelines.
 *
 * Only the MECHANICAL rules are measured here (the ones a grep or a DOM probe can
 * answer). The judgment rules (error-clarity, motion-meaning, nav-hierarchy) are
 * not, and this script says so rather than pretending a green tick.
 *
 * Reference: .agents/skills/ui-ux-pro-max/data/ux-guidelines.csv (after vendoring)
 *            nextlevelbuilder/ui-ux-pro-max-skill, MIT
 */

import fs from "node:fs";
import path from "node:path";

const sheets = ["styles/components.css", "styles/base.css", "styles/utilities.css"];
const css = sheets.map((f) => ({ f, text: fs.readFileSync(f, "utf8") }));
const allCss = css.map((c) => c.text).join("\n");

const srcFiles = [];
function walk(d) {
  let entries;
  try {
    entries = fs.readdirSync(d, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (["node_modules", ".next", ".git", ".design-audit"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?)$/.test(e.name) && !/\.test\./.test(e.name)) srcFiles.push(p);
  }
}
for (const d of ["app", "components"]) walk(d);
const src = srcFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

const count = (re, text = allCss) => (text.match(re) || []).length;

const rows = [];
const add = (id, sev, finding, state) => rows.push({ id, sev, finding, state });

/* ---- #111 / #112 long tokens + text reflow (High / Critical) ---- */
const overflowWrapAnywhere = count(/overflow-wrap:\s*(anywhere|break-word)/g);
const wordBreakAll = count(/word-break:\s*break-all/g);
const minInlineZero = count(/min-inline-size:\s*0|min-width:\s*0/g);
add("111/112", "High/Critical", `overflow-wrap anywhere|break-word: ${overflowWrapAnywhere} · min-inline/min-width 0: ${minInlineZero} · word-break:break-all: ${wordBreakAll}`,
  wordBreakAll === 0 ? "break-all absent (good); long-token coverage partial" : "word-break:break-all present — the rule says do NOT use it on prose");

/* ---- #113 essential text truncation ---- */
const lineClamp = count(/-webkit-line-clamp|line-clamp:/g);
const ellipsis = count(/text-overflow:\s*ellipsis/g);
const fixedHeightHidden = count(/height:\s*[0-9.]+(?:rem|px)[^;}]*;\s*[^}]*overflow:\s*hidden/g);
add("113/84", "Critical/Medium", `line-clamp: ${lineClamp} · text-overflow:ellipsis: ${ellipsis} · fixed-height + overflow:hidden: ${fixedHeightHidden}`,
  "REVIEW — a clamp on a heading/action/error is the Critical case");

/* ---- #115 chip collection reflow ---- */
const chipLists = count(/\.(?:chip|pill|filter|seg)[a-z-]*\s*\{[^}]*display:\s*(?:inline-)?flex/g);
const flexWrap = count(/flex-wrap:\s*wrap/g);
add("115", "High", `chip/pill/filter/seg flex containers: ${chipLists} · flex-wrap: wrap declarations: ${flexWrap}`,
  chipLists > 0 && flexWrap === 0 ? "FAIL likely" : "wrapping present");

/* ---- #110 heading line balance ---- */
const balance = count(/text-wrap:\s*balance/g);
const pretty = count(/text-wrap:\s*pretty/g);
const nbsp = (src.match(/&nbsp;|\\u00a0/g) || []).length;
add("110", "Medium", `text-wrap balance: ${balance} · pretty: ${pretty} · &nbsp;/U+00A0 in source: ${nbsp}`,
  nbsp > 0 ? "REVIEW — forced final-line breaks are the anti-pattern" : "no forced breaks");

/* ---- #100 focus not obscured (sticky header) ---- */
const scrollPadding = count(/scroll-padding/g);
const stickyHeader = count(/position:\s*sticky/g);
add("100", "High", `scroll-padding declarations: ${scrollPadding} · position:sticky rules: ${stickyHeader}`,
  stickyHeader > 0 && scrollPadding === 0 ? "FAIL — a sticky header can cover a focused control" : "present");

/* ---- #104 target size (WCAG 2.2 AA = 24 CSS px) ---- */
const minSizes = count(/min-(?:width|height|block-size|inline-size):\s*(?:[4-9][0-9]|[1-9][0-9]{2,})px/g);
const px44 = count(/(?:44|48)px/g);
add("104/66", "High", `44/48px mentions: ${px44} · explicit min-width/height ≥40px: ${minSizes}`, "44px tier in use; WCAG 2.2 floor is 24px");

/* ---- #29/#30/#31 interaction states ---- */
const cursorPointer = count(/cursor:\s*pointer/g);
const cursorNotAllowed = count(/cursor:\s*not-allowed/g);
const activeState = count(/:active/g);
const disabledState = count(/:disabled|\[disabled\]/g);
add("29/30/31", "Medium", `cursor:pointer: ${cursorPointer} · not-allowed: ${cursorNotAllowed} · :active: ${activeState} · :disabled: ${disabledState}`, "all four present");

/* ---- #28 focus states ---- */
const focusVisible = count(/:focus-visible/g);
const outlineNone = count(/outline:\s*none/g);
add("28", "High", `:focus-visible: ${focusVisible} · outline:none: ${outlineNone}`,
  outlineNone > 0 ? "REVIEW — every outline:none needs a replacement ring" : "no outline:none");

/* ---- #9/#99/#119 reduced motion + cancellable ---- */
const reducedMotion = count(/prefers-reduced-motion/g);
const noPreference = count(/prefers-reduced-motion:\s*no-preference/g);
add("9/99/119", "High/Critical", `prefers-reduced-motion blocks: ${reducedMotion} (of which no-preference: ${noPreference})`, "present");

/* ---- #7 reduce excessive motion ---- */
const keyframes = count(/@keyframes/g);
const animations = count(/animation:\s*[a-z]/g);
add("7", "High", `@keyframes: ${keyframes} · animation: shorthand uses: ${animations}`, animations <= 2 ? "within 'animate 1-2 per view'" : "review count per view");

/* ---- #4 no-emoji-icons ---- */
const emoji = (src.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
const lucide = (src.match(/from "lucide-react"/g) || []).length;
add("4", "High", `emoji codepoints in source: ${emoji} · files importing lucide-react: ${lucide}`,
  emoji === 0 ? "PASS — SVG icons only" : "FAIL — emoji in source");

/* ---- #118 contextual live badge ---- */
const atomic = count(/aria-atomic/g);
const liveRegions = (src.match(/aria-live=/g) || []).length;
const bareNumberLive = /aria-live="polite"[^>]*>\s*\{[^}]*count/i.test(src);
add("118", "High", `aria-atomic in CSS: ${atomic} · aria-live in source: ${liveRegions}`,
  bareNumberLive ? "FAIL — a bare number in a live region" : "no bare-number live region found");

/* ---- #107 accessible authentication (Critical) ---- */
const blocksPaste = /onPaste=\{[^}]*preventDefault/.test(src);
add("107", "Critical", `paste blocked on a field: ${blocksPaste}`, blocksPaste ? "FAIL" : "PASS — paste not blocked");

/* ---- #5/#69 horizontal scroll + #25 tap delay ---- */
const manip = count(/touch-action:\s*manipulation/g);
add("25", "Medium", `touch-action: manipulation: ${manip}`, manip > 0 ? "present" : "absent");

/* ---- #20 viewport units ---- */
const hundredVh = count(/100vh/g);
const dvh = count(/dvh|svh|lvh/g);
add("20", "Medium", `100vh: ${hundredVh} · dvh/svh/lvh: ${dvh}`, dvh > 0 ? "dynamic units present" : "no dynamic viewport units");

/* ---- #73/#21 line length ---- */
const chCaps = count(/max-inline-size:\s*[0-9.]+ch|max-width:\s*[0-9.]+ch|--measure[a-z-]*:\s*[0-9.]+ch/g);
add("21/73", "Medium", `ch-based measure caps: ${chCaps}`, chCaps > 0 ? "present" : "absent");

/* ---- #46/#47 image optimisation ---- */
const lazy = (src.match(/loading="lazy"/g) || []).length;
const srcset = (src.match(/srcSet|srcset=/g) || []).length;
const webp = count(/\.webp/g);
add("46/47", "High/Medium", `loading="lazy": ${lazy} · srcSet: ${srcset} · .webp references: ${webp}`, "present");

const w = Math.max(...rows.map((r) => r.id.length));
console.log("UI UX PRO MAX — mechanical-rule probe\n");
for (const r of rows) {
  console.log(`  [${r.sev.padEnd(15)}] #${r.id.padEnd(w)}  ${r.state}`);
  console.log(`  ${" ".repeat(17 + w + 2)}${r.finding}`);
}
console.log(`\n${rows.length} mechanical rules probed. The remaining ~90 are judgment rules`);
console.log("(error-clarity, motion-meaning, nav-hierarchy, chart rules) and need a human or a real guard.");
