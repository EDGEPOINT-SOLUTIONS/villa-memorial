/**
 * ecc-audit — measure this project against the two vendored ECC skills.
 *
 *   .agents/skills/ecc/make-interfaces-feel-better  (design-engineering polish)
 *   .agents/skills/ecc/design-slop-check           (AI-slop signals)
 *
 * ECC material is REFERENCE ONLY and never outranks our tokens or guards, so this
 * reports what it finds with counts and file:line, and lets the fixes be judged
 * against our own system.
 *
 * Usage: node scripts/design-audit/ecc-audit.mjs
 */

import fs from "node:fs";
import path from "node:path";

const SHEETS = ["styles/components.css", "styles/base.css", "styles/utilities.css", "styles/tokens.css"];
const css = SHEETS.map((f) => ({ f, text: fs.readFileSync(f, "utf8") }));
const all = css.map((c) => c.text).join("\n");

const srcFiles = [];
function walk(d) {
  let entries;
  try {
    entries = fs.readdirSync(d, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (["node_modules", ".next", ".git"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(e.name)) srcFiles.push(p);
  }
}
for (const d of ["app", "components", "lib"]) walk(d);
const rows = [];
const hits = (re, text = all) => [...text.matchAll(re)].length;
const where = (re) => {
  const out = [];
  for (const { f, text } of css) {
    const lines = text.split("\n");
    lines.forEach((l, i) => {
      if (re.test(l)) out.push(`${f}:${i + 1}  ${l.trim().slice(0, 78)}`);
    });
  }
  return out;
};

function row(principle, finding, verdict) {
  rows.push({ principle, finding, verdict });
}

/* ---------- make-interfaces-feel-better ---------- */

const transitionAll = hits(/(?<![-\w])transition:\s*all\b/g);
row("Transition scope", `transition: all — ${transitionAll}`, transitionAll === 0 ? "PASS" : "FIX");

const willChangeAll = hits(/will-change:\s*all\b/g);
row("will-change", `will-change: all — ${willChangeAll}`, willChangeAll === 0 ? "PASS" : "FIX");

const willChange = hits(/will-change:/g);
row("will-change", `will-change used ${willChange} time(s)`, "info");

const tabular = hits(/font-variant-numeric:\s*tabular-nums/g);
row(
  "Tabular numbers",
  `font-variant-numeric: tabular-nums — ${tabular}`,
  tabular === 0 ? "FIX (prices, KPIs, tables all shift as digits change)" : "PASS"
);

const balance = hits(/text-wrap:\s*balance/g);
const pretty = hits(/text-wrap:\s*pretty/g);
row("Text wrapping", `text-wrap: balance ${balance} · pretty ${pretty}`, pretty === 0 ? "FIX (balance only; body/captions want pretty)" : "ok");

const smoothing = hits(/-webkit-font-smoothing:\s*antialiased/g);
const mozSmoothing = hits(/-moz-osx-font-smoothing:\s*grayscale/g);
row("Font smoothing", `-webkit antialiased ${smoothing} · -moz grayscale ${mozSmoothing}`, mozSmoothing === 0 ? "FIX (macOS Firefox)" : "PASS");

const imgOutlineRules = hits(/outline:\s*1px solid rgba\(0,\s*0,\s*0,\s*0?\.1\)/g);
row("Image outlines", `neutral 1px inset image outline — ${imgOutlineRules}`, imgOutlineRules === 0 ? "FIX (image edges blur into the bone ground)" : "PASS");

const pressScale = hits(/scale\(0?\.9[0-9]\)/g);
const activeScale = hits(/:active[^{]*\{[^}]*transform:\s*scale/g);
row("Press state", `box-shadow/scale presses: scale() literals ${pressScale} · :active transform rules ${activeScale}`, "review");

const concentric = hits(/calc\(var\(--radius-[a-z]+\)\s*-\s*var\(--space/g);
row("Concentric radius", `outer = inner + padding expressed — ${concentric}`, concentric === 0 ? "review (nested rounded surfaces)" : "ok");

/* ---------- design-slop-check ---------- */

const gradients = hits(/gradient\(/g);
row("Slop: gratuitous gradients", `gradient functions — ${gradients}`, gradients > 0 ? "review each" : "PASS");

const backdrop = hits(/backdrop-filter:\s*blur/g);
row("Slop: glass morphism", `backdrop-filter: blur — ${backdrop}`, backdrop === 0 ? "PASS" : "review (needs a purpose)");

const purpleHues = [...all.matchAll(/--[a-z-]*purple[a-z-]*:/gi)].length;
row("Slop: purple-to-blue", `purple token names — ${purpleHues}`, purpleHues === 0 ? "PASS (no purple in the palette)" : "FIX");

const radiusTokens = [...all.matchAll(/--radius-[a-z]+:\s*([^;]+);/g)].map((m) => m[1].trim());
row("Radii", `declared radii: ${radiusTokens.join(" · ")}`, "info");

const centeredHero = hits(/text-align:\s*center/g);
row("Slop: generic centered hero", `text-align: center rules — ${centeredHero}`, "review against the heroes");

const scrollAnim = hits(/animation-timeline:|@scroll-timeline|IntersectionObserver/g);
row("Slop: scroll animation", `scroll-linked animation signals — ${scrollAnim}`, scrollAnim === 0 ? "PASS" : "review");

const keyframes = hits(/@keyframes/g);
row("Motion", `@keyframes blocks — ${keyframes} (ECC: reserve for staged entrances)`, "info");

const fontFaces = hits(/@font-face/g);
row("Slop: personality-free type", `@font-face rules — ${fontFaces}; display face is TeX Gyre Bonum (the client's letterhead)`, "PASS");

/* ---------- report ---------- */

const w = Math.max(...rows.map((r) => r.principle.length));
console.log("ECC AUDIT — make-interfaces-feel-better + design-slop-check\n");
for (const r of rows) {
  console.log(`  ${r.principle.padEnd(w)}  ${r.finding}`);
  if (r.verdict !== "info") console.log(`  ${" ".repeat(w)}  -> ${r.verdict}`);
}

console.log("\n--- where the FIX items live ---");
for (const [label, re] of [
  ["transition: all", /(?<![-\w])transition:\s*all\b/],
  ["will-change: all", /will-change:\s*all\b/],
  ["backdrop-filter", /backdrop-filter:\s*blur/],
]) {
  for (const l of where(re).slice(0, 6)) console.log(`  ${label}: ${l}`);
}
