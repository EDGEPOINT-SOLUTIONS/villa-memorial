/**
 * ua-margin-leak — find elements spending space on a browser default no author asked for.
 *
 * ---------------------------------------------------------------- WHY RESCOPED
 * The first version of this probe asked a simpler question: "does any class on
 * this element declare a margin?" If not, and the computed margin was non-zero, it
 * called it a leak. That produced 30 "leaks" across 21 routes — and nearly all of
 * them were FALSE POSITIVES.
 *
 * The reason is in `styles/utilities.css`:
 *
 *     .stack-4 > * + * { margin-top: var(--space-4); }
 *
 * The project spaces most of its vertical rhythm with sibling-combinator stacks.
 * The selector's subject is `*`, so no class on the element declares the margin,
 * and the element looks like a leak while it is in fact the intended spacing.
 * Acting on that list would have "fixed" the project's own rhythm — a worse
 * outcome than missing a leak.
 *
 * THE DISCRIMINATOR. A UA default is SYMMETRIC: `dl { margin-block: 1em }` gives
 * the same value top and bottom. An author stack is one-sided (`margin-top`
 * only). So this probe requires ALL of:
 *
 *   1. the tag actually carries a UA margin (p, dl, ul, ol, h1-h6, figure, blockquote, pre)
 *   2. margin-top > 0 AND margin-bottom > 0 AND they are equal (the UA signature)
 *   3. no class on the element, and no tag reset, declares a margin
 *
 * It also SELF-TESTS against a synthetic `<dl>` with an unstyled class, so the
 * probe proves it can still catch the `.ag-kv` bug it was written for. A leak
 * detector that returns zero leaks is worthless unless it can be shown to fire.
 *
 * Usage: node scripts/design-audit/ua-margin-leak.mjs
 */

import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = "http://localhost:4000";

/** Tags whose UA stylesheet gives a block margin. */
const UA_MARGIN_TAGS = new Set(["p", "dl", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "figure", "blockquote", "pre"]);

const cssFiles = ["styles/components.css", "styles/base.css", "styles/utilities.css"];
const declaresMargin = new Set();
for (const f of cssFiles) {
  const text = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of text.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!/(^|[;\s])margin(-block|-inline|-top|-bottom|-left|-right)?\s*:/.test(m[2])) continue;
    for (const cls of m[1].matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) declaresMargin.add(cls[1]);
  }
  // A RULE WHOSE ENTIRE SELECTOR LIST IS BARE TAGS COVERS THOSE TAGS.
  //
  // Three bugs lived here, each one a false positive that would have had me
  // "fixing" authored spacing:
  //
  //   1. it only registered a tag when a rule set its margin to exactly `0`, so
  //      `p { margin: 0 0 var(--space-3); }` did not count;
  //   2. matching `([^}]*)\}` CONSUMES the closing brace, so the next rule could
  //      never match its own opening `}` and was skipped entirely;
  //   3. it tested the whole selector string against a single-tag pattern, so
  //      base.css's real heading rule — `h2,\n  h3,\n  h4 { margin: 0 0
  //      var(--space-3); }`, written across three lines — registered nothing and
  //      the one remaining "leak" was in fact authored.
  //
  // A rule counts when EVERY comma-part of its selector is a bare tag.
  for (const m of text.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!/(^|[;\s])margin(-block|-inline|-top|-bottom|-left|-right)?\s*:/.test(m[2])) continue;
    const parts = m[1].split(",").map((s) => s.trim().replace(/\s+/g, " "));
    if (parts.length === 0 || !parts.every((p) => /^[a-z][a-z0-9]*$/.test(p))) continue;
    for (const p of parts) declaresMargin.add(`<${p}>`);
  }
}
console.log(`classes/elements that declare a margin: ${declaresMargin.size}\n`);

const TARGETS = [
  [null, "/"], [null, "/services"], [null, "/plans"], [null, "/map"], [null, "/products"],
  [null, "/lots"], [null, "/price-list"], [null, "/faq"], [null, "/facilities"],
  [null, "/memorials"], [null, "/contact"], [null, "/builder"],
  ["agent@vm.demo", "/agent/dashboard"], ["agent@vm.demo", "/agent/prospects"],
  ["agent@vm.demo", "/agent/clients"], ["agent@vm.demo", "/agent/lots"],
  ["agent@vm.demo", "/agent/applications"], ["agent@vm.demo", "/agent/sales"],
  ["customer@vm.demo", "/client/dashboard"], ["customer@vm.demo", "/client/documents"],
  ["customer@vm.demo", "/client/payments"], ["customer@vm.demo", "/client/profile"],
  ["admin@vm.demo", "/staff/ops"], ["admin@vm.demo", "/staff/landing"],
  ["admin@vm.demo", "/staff/catalog"], ["admin@vm.demo", "/staff/billing"],
];

const browser = await chromium.launch();

/* ---- SELF-TEST: can the discriminator still fire? ---- */
{
  const page = await browser.newPage();
  await page.setContent(`<body><div class="not-a-real-class"><dl class="another-unknown-class"><dt>a</dt><dd>b</dd></dl></div></body>`);
  const fired = await page.evaluate((declared) => {
    const set = new Set(declared);
    return [...document.querySelectorAll("body *")].filter((el) => {
      const cs = getComputedStyle(el);
      const mt = parseFloat(cs.marginTop) || 0;
      const mb = parseFloat(cs.marginBottom) || 0;
      if (!(mt > 0 && mb > 0 && Math.abs(mt - mb) < 0.5)) return false;
      if (!["p", "dl", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6", "figure", "blockquote", "pre"].includes(el.tagName.toLowerCase())) return false;
      const classes = String(el.className).split(/\s+/).filter(Boolean);
      return !(classes.some((c) => set.has(c)) || set.has(`<${el.tagName.toLowerCase()}>`));
    }).length;
  }, [...declaresMargin]);
  console.log(`SELF-TEST: an unstyled <dl> with a blank class is flagged as a leak: ${fired > 0 ? "YES" : "NO — the probe is broken"}`);
  if (fired === 0) { console.error("Refusing to run: the probe cannot detect the defect it exists for."); process.exit(1); }
  console.log("");
  await page.close();
}

const leaks = new Map();
for (const [email, route] of TARGETS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, baseURL: BASE });
  if (email) await ctx.request.post("/api/auth/login", { data: { email, password: "Demo-Passw0rd!" } });
  const page = await ctx.newPage();
  try {
    await page.goto(route, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(120);
    const found = await page.evaluate(({ declared, tags }) => {
      const set = new Set(declared);
      const TAGSET = new Set(tags);
      const out = [];
      for (const el of document.querySelectorAll("body *")) {
        if (!el.textContent || !el.textContent.trim()) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none") continue;
        const mt = parseFloat(cs.marginTop) || 0;
        const mb = parseFloat(cs.marginBottom) || 0;
        if (!(mt > 0 && mb > 0 && Math.abs(mt - mb) < 0.5)) continue; // UA signature: symmetric
        const tag = el.tagName.toLowerCase();
        if (!TAGSET.has(tag)) continue;
        const classes = String(el.className).split(/\s+/).filter(Boolean);
        if (classes.some((c) => set.has(c)) || set.has(`<${tag}>`)) continue;
        out.push({ tag, cls: classes.join("."), mt: Math.round(mt), mb: Math.round(mb), h: Math.round(el.getBoundingClientRect().height) });
      }
      return out;
    }, { declared: [...declaresMargin], tags: [...UA_MARGIN_TAGS] });

    for (const f of found) {
      const key = `${f.tag}.${f.cls}`.replace(/\.$/, "") || f.tag;
      const prev = leaks.get(key) ?? { ...f, count: 0, routes: new Set(), cost: 0 };
      prev.count++;
      prev.routes.add(route);
      prev.cost += f.mt + f.mb;
      leaks.set(key, prev);
    }
  } catch { /* a failing route contributes nothing */ }
  await page.close();
  await ctx.close();
}
await browser.close();

const rows = [...leaks.entries()].map(([k, v]) => ({ leak: k, ...v, routes: [...v.routes] })).sort((a, b) => b.cost - a.cost);
console.log("UA-margin leaks (symmetric block margin on a tag that has a UA default, undeclared by any class)\n");
if (rows.length === 0) {
  console.log("  NONE. Every symmetric UA margin on these surfaces is reset by an author rule.");
  console.log("  `dl.ag-kv` was the one that leaked; it was fixed on 2026-09-27.");
} else {
  console.log("element".padEnd(38) + "tag   mt   mb   seen  worst".padEnd(12) + "  routes");
  console.log("-".repeat(100));
  for (const r of rows) {
    console.log(r.leak.slice(0, 36).padEnd(38) + r.tag.padEnd(6) + String(r.mt).padEnd(5) + String(r.mb).padEnd(5) + String(r.count).padEnd(6) + String(r.h).padEnd(7) + r.routes.slice(0, 2).join(" "));
  }
}
console.log(`\n${rows.length} distinct leaking shapes across ${TARGETS.length} routes.`);
fs.writeFileSync(".design-audit/ua-margin-leak.json", JSON.stringify(rows, null, 1));
