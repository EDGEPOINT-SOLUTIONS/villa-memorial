/**
 * css-coverage — measure which SELECTORS of the shipped CSS are ever used.
 *
 * Chromium's CSS coverage reports byte ranges of each SERVED stylesheet that some
 * element actually matched. In a production build those stylesheets are minified
 * and bundled, so their offsets do NOT line up with our source files — matching
 * by byte position would silently compare the wrong things.
 *
 * So this captures the served CSS bodies as well, slices the USED ranges out of
 * them, and extracts the selectors found there. The output is therefore a set of
 * selector strings that some element genuinely matched on some route.
 *
 * Evidence, not a verdict: a rule that only applies to a hover, a focus ring, an
 * open menu or an error state reads as unused, because this run does not trigger
 * it. `scripts/design-audit/dead-css.mjs` intersects this with a source-wide grep
 * before anything is deleted — two signals, or nothing goes.
 *
 * Usage: node scripts/design-audit/css-coverage.mjs [--base URL]
 * Output: .design-audit/css-coverage.json
 *
 * THE SWEEP IS BOUNDED. No single route can stall it (see `withTimeout` below); a
 * route/viewport pair that will not cooperate is skipped and named at the end of
 * the run rather than silently ending it.
 */

import { chromium } from "@playwright/test";
import fs from "node:fs";
import { staticRoutes } from "./routes.mjs";

const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:4000";
const OUT = ".design-audit";

/**
 * Viewports to sweep. THE NARROW ONE MATTERS AS MUCH AS THE WIDE ONE.
 *
 * The first version measured at 1440px only, so every rule inside a
 * `@media (max-width: 40rem)` block read as "never matched" - and the prune that
 * followed deleted phone-only CSS that `tests/unit/phone-layout.test.tsx` pins
 * (the stacked rate table, the capsule radius caps, the pan containers). Five
 * guards caught it. A coverage sweep that only looks at a desktop is not
 * measuring the product, it is measuring one third of it.
 *
 * 320px is here because a `max-width` rule only applies when the viewport is AT
 * OR BELOW its breakpoint, and this stylesheet breaks at 22.5rem (360px) and
 * 23rem (368px) for the smallest phones. Sweeping 390 alone would have missed
 * both tiers.
 *
 * NOT COVERED, AND PROTECTED INSTEAD: `@media print` and
 * `@media (prefers-reduced-motion: reduce)`. No viewport triggers those, so
 * `dead-css.mjs` refuses to treat a rule inside them as a candidate at all.
 */
const VIEWPORTS = [
  { name: "desk", width: 1440, height: 900, mobile: false },
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "small", width: 320, height: 720, mobile: true },
];

const PERSONAS = {
  staff: { email: "staff@vm.demo", password: "Demo-Passw0rd!" },
  admin: { email: "admin@vm.demo", password: "Demo-Passw0rd!" },
  agent: { email: "agent@vm.demo", password: "Demo-Passw0rd!" },
  customer: { email: "customer@vm.demo", password: "Demo-Passw0rd!" },
};

function personaFor(url) {
  if (url.startsWith("/staff/")) return "staff";
  if (url.startsWith("/client/")) return "customer";
  if (url.startsWith("/agent/")) return "agent";
  if (url.startsWith("/platform/") && !/sign-in|sign-up/.test(url)) return "admin";
  return "anon";
}

// Use the routes the audit ACTUALLY visited (report.json), which includes the
// dynamic detail routes resolved from real links — /lots/[id], /products/[sku],
// /staff/cases/[id] and the rest. Falling back to the static list alone would
// mark every rule that only a detail page matches as dead, which is how a
// coverage sweep turns into a wrecking ball.
const reportFile = `${OUT}/report.json`;
let routes;
if (fs.existsSync(reportFile)) {
  const rows = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  routes = [...new Set(rows.map((r) => r.route))].filter((r) => !r.includes("[")).sort();
  console.log(`routes from the audit report: ${routes.length}`);
} else {
  routes = staticRoutes().filter((r) => !r.includes("["));
  console.log(`routes from the app tree (audit report absent): ${routes.length}`);
}

const browser = await chromium.launch();
const contexts = {};
for (const vp of VIEWPORTS) {
  contexts[`anon:${vp.name}`] = await browser.newContext({
    baseURL: BASE,
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
}
for (const [name, creds] of Object.entries(PERSONAS)) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      baseURL: BASE,
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    });
    const res = await ctx.request.post("/api/auth/login", { data: creds });
    if (!res.ok()) console.error(`login failed for ${name}: ${res.status()}`);
    contexts[`${name}:${vp.name}`] = ctx;
  }
}

/** url -> { css, ranges: [[s,e]] } */
const sheets = new Map();
let done = 0;
const total = routes.length * VIEWPORTS.length;
const skipped = [];

/** NO AWAIT IN THIS SWEEP MAY BE UNBOUNDED.
 *
 *  The first version could hang forever and did: it awaited `res.text()` inside a
 *  `page.on("response")` handler, then awaited `page.close()` OUTSIDE the try/catch.
 *  A CSS response that never finished streaming left the handler pending, and the
 *  close (and the sweep) sat there with nothing to time it out — the run stopped
 *  making progress at 300/654 and had to be killed (2026-09-28).
 *
 *  Every step below is now either bounded by Playwright's own `timeout` or by this
 *  race, and a route that will not cooperate is recorded and skipped instead of
 *  ending the run. A tool that silently stops is worse than one that reports what
 *  it could not measure. */
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms (${label})`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const PER_ROUTE_MS = 40_000;

for (const vp of VIEWPORTS) {
  for (const route of routes) {
    const ctx = contexts[`${personaFor(route)}:${vp.name}`];
    const page = await ctx.newPage();
    const bodies = new Map();
    // Fire-and-forget with a catch: a body that never arrives must not hold a handler.
    page.on("response", (res) => {
      const url = res.url().replace(BASE, "").split("?")[0];
      if (!url.includes("/_next/static/css/")) return;
      res
        .text()
        .then((text) => bodies.set(url, text))
        .catch(() => {});
    });

    try {
      await withTimeout(
        (async () => {
          await page.coverage.startCSSCoverage({ resetOnNavigation: true });
          try {
            await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 15_000 });
          } catch {
            /* `networkidle` never fires on a page that keeps polling. The page is
               loaded by then, so measure what is there rather than navigate again. */
          }
          await page.waitForTimeout(120);
          for (const sel of [
            ".anchored-header__explore-trigger",
            ".listing-sheet__toggle",
            ".pill-toggle",
            ".quick-menu-fab",
            ".anchored-phonebar__btn--explore",
          ]) {
            try {
              await page.click(sel, { timeout: 300 });
              await page.waitForTimeout(80);
            } catch {}
          }
          const entries = await page.coverage.stopCSSCoverage();
          for (const e of entries) {
            const url = e.url.replace(BASE, "").split("?")[0];
            if (!url.includes("/_next/static/css/")) continue;
            const rec = sheets.get(url) ?? { css: bodies.get(url) ?? "", ranges: [] };
            if (!rec.css && bodies.has(url)) rec.css = bodies.get(url);
            for (const r of e.ranges) rec.ranges.push([r.start, r.end]);
            sheets.set(url, rec);
          }
        })(),
        PER_ROUTE_MS,
        `${vp.name} ${route}`,
      );
    } catch (err) {
      /* A failing route contributes nothing; record it so the run never hides a gap. */
      skipped.push(`${vp.name} ${route} — ${String(err).slice(0, 80)}`);
    }
    // Closing is outside the route's try, so bound it too — this is where it hung.
    try {
      await withTimeout(page.close(), 5_000, "page.close");
    } catch {}
    done++;
    if (done % 20 === 0) console.log(`  ${done}/${total}`);
  }
}

/* Any sheet whose body never arrived from a response is fetched once, bounded. */
for (const [url, rec] of sheets) {
  if (rec.css) continue;
  for (const ctx of Object.values(contexts)) {
    try {
      const res = await ctx.request.get(BASE + url, { timeout: 10_000 });
      if (res.ok()) {
        rec.css = await res.text();
        break;
      }
    } catch {}
  }
}

await browser.close();

/* ---- slice the USED ranges out of the served CSS and collect selectors ---- */
const usedSelectors = new Set();
const report = {};

for (const [url, rec] of sheets) {
  rec.ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of rec.ranges) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }

  let usedText = "";
  for (const [s, e] of merged) usedText += rec.css.slice(s, e) + "\n";

  // Selectors appearing in the used slices. Minifiers preserve selector text.
  for (const m of usedText.matchAll(/([^{}]+)\{/g)) {
    for (const sel of m[1].split(",")) {
      const t = sel.trim().replace(/\s+/g, " ");
      if (t && !t.startsWith("@") && t.length < 300) usedSelectors.add(t);
    }
  }

  report[url] = { cssLength: rec.css.length, usedRanges: merged.length, usedChars: usedText.length };
}

fs.writeFileSync(
  `${OUT}/css-coverage.json`,
  JSON.stringify({ routes: routes.length, sheets: report, usedSelectors: [...usedSelectors] }, null, 1)
);

console.log(`\nroutes covered : ${routes.length} x ${VIEWPORTS.length} viewports`);
for (const [url, r] of Object.entries(report)) {
  console.log(`  ${url}  ${(r.cssLength / 1024).toFixed(0)} KB css, ${r.usedRanges} ranges, ${r.usedChars} used chars`);
}
console.log(`\ndistinct selectors seen used at runtime: ${usedSelectors.size}`);

if (skipped.length) {
  console.log(`\n${skipped.length} route/viewport pair(s) were skipped after a bounded timeout:`);
  for (const s of skipped.slice(0, 40)) console.log(`  ${s}`);
  if (skipped.length > 40) console.log(`  …and ${skipped.length - 40} more`);
}
