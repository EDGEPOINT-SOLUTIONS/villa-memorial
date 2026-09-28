/**
 * typography-role-audit — proves whether the rendered product honours the
 * role map that styles/tokens.css declares as settled:
 *
 *   page-title    -> --text-3xl  36px   (the route's h1)
 *   section-title -> --text-2xl  28px   (an h2 band/section head)
 *   card-title    -> --text-xl   22px   (a card's own h3)
 *
 * The unit test (tests/unit/typography-system.test.ts) pins the MAP in the CSS.
 * This pins what a person actually sees on each route.
 */

import { chromium } from "@playwright/test";
import fs from "node:fs";
import { staticRoutes } from "./routes.mjs";

const BASE = "http://localhost:4000";
const EXPECT = { H1: 36, H2: 28, H3: 22 };

// pull concrete values for the dynamic routes out of the running app's own links
const browser = await chromium.launch();

const PERSONAS = {
  staff: { email: "staff@vm.demo", password: "Demo-Passw0rd!" },
  agent: { email: "agent@vm.demo", password: "Demo-Passw0rd!" },
  customer: { email: "customer@vm.demo", password: "Demo-Passw0rd!" },
};

/** A gated route must be visited SIGNED IN, or the capture is the sign-in card —
 *  which is how the first run of this script produced 70 bogus "h1 = 28px" rows. */
function personaFor(url) {
  if (url.startsWith("/staff/")) return "staff";
  if (url.startsWith("/client/")) return "customer";
  if (url.startsWith("/agent/")) return "agent";
  return null;
}

const contexts = {};
for (const [name, creds] of Object.entries(PERSONAS)) {
  const c = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
  const res = await c.request.post("/api/auth/login", { data: creds });
  if (!res.ok()) console.error(`login failed for ${name}: ${res.status()}`);
  contexts[name] = c;
}

const seed = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
const page = await seed.newPage();

const routes = staticRoutes().filter((r) => !r.includes("["));
const discovered = new Set();
for (const r of ["/", "/lots", "/plans", "/products", "/memorials", "/login"]) {
  try {
    await page.goto(BASE + r, { waitUntil: "domcontentloaded", timeout: 20000 });
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"))
    );
    hrefs.forEach((h) => {
      if (!h) return;
      const c = h.split("#")[0].split("?")[0];
      if (/^\/(lots|plans|products|memorials)\/[^/]+$/.test(c)) discovered.add(c);
    });
  } catch {}
}
for (const d of discovered) routes.push(d);

const rows = [];
let done = 0;
const seen = new Set();

for (const route of [...new Set(routes)].sort()) {
  if (seen.has(route)) continue;
  seen.add(route);
  const ctx = contexts[personaFor(route) ?? ""] ?? seed;
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  try {
    await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 25000 });
    await p.waitForTimeout(120);
    const heads = await p.evaluate(() => {
      const out = [];
      for (const tag of ["H1", "H2", "H3"]) {
        for (const el of document.querySelectorAll(tag)) {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (r.width < 1) continue;
          out.push({
            tag,
            size: parseFloat(cs.fontSize),
            weight: cs.fontWeight,
            family: cs.fontFamily.split(",")[0].replace(/["']/g, ""),
            text: el.textContent.trim().slice(0, 45),
            cls: typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "",
          });
        }
      }
      return out;
    });
    rows.push({ route, heads });
  } catch (err) {
    rows.push({ route, error: String(err).slice(0, 90) });
  }
  await p.close();
  done++;
  if (done % 25 === 0) console.log(`  ${done}`);
}

await browser.close();
fs.writeFileSync(".design-audit/typography.json", JSON.stringify(rows, null, 2));

/* ------------------------------------------------------------------ report --- */

const sizesFor = (tag) => {
  const m = {};
  for (const r of rows) {
    for (const h of r.heads || []) {
      if (h.tag !== tag || h.family !== "Inter") continue;
      const k = h.size;
      m[k] = m[k] || { n: 0, samples: [] };
      m[k].n++;
      if (m[k].samples.length < 3) m[k].samples.push(`${r.route} — "${h.text}"`);
    }
  }
  return m;
};

const lines = [];
lines.push("# Rendered heading roles vs the declared map");
lines.push("");
lines.push("Declared in `styles/tokens.css`: h1 = 36px, h2 = 28px, h3 = 22px.");
lines.push("");

for (const tag of ["H1", "H2", "H3"]) {
  const m = sizesFor(tag);
  const expected = EXPECT[tag];
  const off = Object.entries(m).filter(([s]) => Number(s) !== expected);
  const total = Object.values(m).reduce((a, b) => a + b.n, 0);
  const offCount = off.reduce((a, [, v]) => a + v.n, 0);
  lines.push(`## ${tag} — expected ${expected}px`);
  lines.push("");
  lines.push(`Rendered ${total} ${tag}s; **${offCount} at the wrong rung** (${Object.keys(m).length} distinct sizes).`);
  lines.push("");
  lines.push("| rendered | count | sample |");
  lines.push("|---|---|---|");
  for (const [s, v] of Object.entries(m).sort((a, b) => b[1].n - a[1].n)) {
    const mark = Number(s) === expected ? "" : " ⚠️";
    lines.push(`| ${s}px${mark} | ${v.n} | ${v.samples[0]} |`);
  }
  lines.push("");
  const wrong = [];
  for (const r of rows) {
    for (const h of r.heads || []) {
      if (h.tag === tag && h.family === "Inter" && h.size !== expected) {
        wrong.push(`- \`${r.route}\` → ${h.size}px \`.${h.cls}\` "${h.text}"`);
      }
    }
  }
  if (wrong.length) {
    lines.push("<details><summary>every off-map heading</summary>");
    lines.push("");
    lines.push(wrong.slice(0, 120).join("\n"));
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }
}

/* multiple h1s / missing h1 */
const multi = rows.filter((r) => (r.heads || []).filter((h) => h.tag === "H1").length > 1);
const none = rows.filter((r) => !r.error && (r.heads || []).filter((h) => h.tag === "H1").length === 0);
lines.push("## Structure");
lines.push("");
lines.push(`- routes with more than one h1: ${multi.length}`);
for (const m of multi.slice(0, 15)) lines.push(`  - \`${m.route}\``);
lines.push(`- routes with no h1: ${none.length}`);
for (const m of none.slice(0, 15)) lines.push(`  - \`${m.route}\``);
lines.push("");

fs.writeFileSync(".design-audit/typography.md", lines.join("\n"));
console.log(`\nwrote .design-audit/typography.md (${rows.length} routes)`);
