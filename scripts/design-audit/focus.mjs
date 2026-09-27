/**
 * focus-order audit — the keyboard path through every route.
 *
 * The design audit covered contrast, tap targets, overflow and type; this covers
 * the fourth thing a screenshot cannot show: what happens when someone presses
 * Tab. For each route it walks the real tab order in Chromium and reports
 *
 *   - the first stop (it should be the skip link on a public page),
 *   - how many Tab presses it takes to reach the main content,
 *   - stops that paint NO visible focus indicator (outline-width 0 + no shadow),
 *   - stops on an element that is hidden or has no box at all,
 *   - stops that land outside the viewport (the page scrolled to reach them),
 *   - whether the order cycles back to the body (a trap or a dead end).
 *
 * Usage: node scripts/design-audit/focus.mjs [--base http://localhost:4000]
 * Output: .design-audit/focus.md + focus.json
 */

import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:4000";

const MAX_TABS = 30;
const OUT = ".design-audit";

const PERSONAS = {
  anon: null,
  staff: { email: "staff@vm.demo", password: "Demo-Passw0rd!" },
  agent: { email: "agent@vm.demo", password: "Demo-Passw0rd!" },
  customer: { email: "customer@vm.demo", password: "Demo-Passw0rd!" },
};

function personaFor(url) {
  if (url.startsWith("/staff/")) return "staff";
  if (url.startsWith("/client/")) return "customer";
  if (url.startsWith("/agent/")) return "agent";
  if (url.startsWith("/platform/") && !/sign-in|sign-up/.test(url)) return "staff";
  return "anon";
}

const { staticRoutes } = JSON.parse(fs.readFileSync(`${OUT}/routes.json`, "utf8"));
const routes = staticRoutes.filter((r) => !r.includes("["));

const browser = await chromium.launch();
const contexts = {};
for (const [name, creds] of Object.entries(PERSONAS)) {
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
  if (creds) {
    const res = await ctx.request.post("/api/auth/login", { data: creds });
    if (!res.ok()) console.error(`login failed for ${name}: ${res.status()}`);
  }
  contexts[name] = ctx;
}

/** Read the focus state of whatever currently holds focus. */
const READ_FOCUS = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return { wrap: true };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const outline =
    cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 ? true : false;
  const shadow = cs.boxShadow && cs.boxShadow !== "none";
  return {
    tag: el.tagName.toLowerCase(),
    cls: typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "",
    text: (el.textContent || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 42),
    href: el.getAttribute("href") || "",
    indicator: outline || !!shadow,
    zeroBox: r.width < 1 || r.height < 1,
    // "off-screen" = the element sits outside the current viewport on the
    // vertical axis (the page had to scroll to reach it) — normal for long
    // pages, but recorded so a jump-to-footer order is visible.
    y: Math.round(r.top),
    inMain: !!el.closest("#main"),
    tabindex: el.getAttribute("tabindex"),
  };
};

const results = [];
let done = 0;

for (const route of routes) {
  const persona = personaFor(route);
  const ctx = contexts[persona];
  const page = await ctx.newPage();
  const rec = { route, persona, stops: [] };
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(100);
    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(READ_FOCUS);
      if (stop.wrap) {
        rec.cycled = true;
        break;
      }
      rec.stops.push(stop);
      // stop early once we are well inside the page content
      if (stop.inMain && rec.stops.filter((s) => s.inMain).length >= 3) break;
    }
  } catch (err) {
    rec.error = String(err).slice(0, 120);
  }
  await page.close();

  rec.first = rec.stops[0] || null;
  rec.hasSkipLink = !!rec.first && /skip|anchored-skip/.test(`${rec.first.cls} ${rec.first.text} ${rec.first.href}`);
  rec.noIndicator = rec.stops.filter((s) => !s.indicator);
  rec.zeroBox = rec.stops.filter((s) => s.zeroBox);
  rec.tabsToMain = rec.stops.findIndex((s) => s.inMain);
  results.push(rec);

  done++;
  if (done % 25 === 0) console.log(`  ${done}/${routes.length}`);
}

await browser.close();
fs.writeFileSync(`${OUT}/focus.json`, JSON.stringify(results, null, 2));

/* ------------------------------------------------------------------ report --- */

const lines = [];
lines.push("# Focus order — the keyboard path (Tab), 1440px");
lines.push("");
lines.push(`Routes: ${results.length} · up to ${MAX_TABS} Tab presses each.`);
lines.push("");

const errored = results.filter((r) => r.error);
const noSkip = results.filter((r) => !r.error && !r.hasSkipLink && !r.route.startsWith("/staff") && !r.route.startsWith("/client") && !r.route.startsWith("/agent") && !r.route.startsWith("/platform"));
const missing = results.filter((r) => r.noIndicator.length > 0);
const zero = results.filter((r) => r.zeroBox.length > 0);

lines.push("## Summary");
lines.push("");
lines.push(`- public routes whose FIRST tab stop is not the skip link: **${noSkip.length}**`);
lines.push(`- routes with a stop that paints no visible focus indicator: **${missing.length}**`);
lines.push(`- routes with a stop on a zero-box (unclickable) element: **${zero.length}**`);
lines.push(`- routes that errored: ${errored.length}`);
lines.push("");

const burdens = results
  .filter((r) => typeof r.tabsToMain === "number" && r.tabsToMain >= 0)
  .map((r) => ({ route: r.route, n: r.tabsToMain }))
  .sort((a, b) => b.n - a.n);
lines.push("## Tab burden — presses to reach the main content");
lines.push("");
lines.push("| route | Tab presses to `#main` |");
lines.push("|---|---|");
for (const b of burdens.slice(0, 15)) lines.push(`| \`${b.route}\` | ${b.n} |`);
lines.push("");

lines.push("## Public routes with no skip link as the first stop");
lines.push("");
for (const r of noSkip.slice(0, 30)) {
  lines.push(`- \`${r.route}\` → first stop \`${r.first?.tag}.${r.first?.cls}\` "${r.first?.text}"`);
}
lines.push("");

lines.push("## Stops with no visible focus indicator");
lines.push("");
const noIndAgg = {};
for (const r of missing) {
  for (const s of r.noIndicator) {
    const k = `${s.tag}.${s.cls}`;
    noIndAgg[k] = noIndAgg[k] || { n: 0, sample: s.text, routes: new Set() };
    noIndAgg[k].n++;
    noIndAgg[k].routes.add(r.route);
  }
}
lines.push("| element | stops | routes | sample text |");
lines.push("|---|---|---|---|");
for (const [k, v] of Object.entries(noIndAgg).sort((a, b) => b[1].n - a[1].n).slice(0, 25)) {
  lines.push(`| \`${k}\` | ${v.n} | ${v.routes.size} | ${String(v.sample).replace(/\|/g, "/")} |`);
}
lines.push("");

lines.push("## Stops on a zero-box element");
lines.push("");
for (const r of zero.slice(0, 20)) {
  for (const s of r.zeroBox) {
    lines.push(`- \`${r.route}\` → \`${s.tag}.${s.cls}\` "${s.text}"`);
  }
}
lines.push("");

lines.push("## Sample first five stops per route (the opening of each page)");
lines.push("");
for (const r of results.slice(0, 40)) {
  lines.push(`- \`${r.route}\` — ${r.stops.slice(0, 5).map((s) => `${s.tag}${s.cls ? "." + s.cls : ""}`).join(" → ")}`);
}
lines.push("");

fs.writeFileSync(`${OUT}/focus.md`, lines.join("\n"));
console.log(`\nwrote ${OUT}/focus.md (${results.length} routes)`);
