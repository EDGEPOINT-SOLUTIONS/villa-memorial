#!/usr/bin/env node
/**
 * smoke-public-routes — request every URL the site ADVERTISES and assert it renders.
 *
 * Why this exists: `/price-list` shipped a production-only `HTTP 500` (a Server
 * Component passing `onClick` into the client `ListingShell`) while sitting in
 * `PUBLIC_PAGES` at `priority: 0.9`. It passed `next dev`, `tsc`, `lint` and 2,654
 * unit tests — because `tests/unit/seo.test.ts` asserts a public page is *listed*
 * in `PUBLIC_PAGES`, never that it *renders*. This closes that gap from the outside.
 *
 * It reads the live `sitemap.xml` rather than `lib/seo.ts` on purpose: the sitemap
 * IS the set of URLs search engines are told to crawl, so this asserts the promise
 * the site actually makes — no import of TS internals, no drift possible.
 *
 * Usage:
 *   node scripts/smoke-public-routes.mjs                      # against :4000
 *   node scripts/smoke-public-routes.mjs --base https://…     # against a deploy
 *   npm run build && npx next start -p 4000 &                 # a PRODUCTION build —
 *                                                             # `next dev` can hide this
 * Exit code 1 if any advertised route fails to return 200.
 */

const args = process.argv.slice(2);
const BASE = (args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:4000")
  .replace(/\/$/, "");

async function get(url) {
  const res = await fetch(url, { redirect: "manual" });
  return res;
}

const sitemapRes = await get(`${BASE}/sitemap.xml`);
if (!sitemapRes.ok) {
  console.error(`Could not read ${BASE}/sitemap.xml → HTTP ${sitemapRes.status}`);
  console.error("Is a PRODUCTION build serving on this port? (npm run build, then next start)");
  process.exit(1);
}
const xml = await sitemapRes.text();

// <loc>…</loc>, reduced to a path on BASE (the sitemap carries the public origin).
const paths = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
  .map((m) => {
    try {
      return new URL(m[1]).pathname;
    } catch {
      return m[1];
    }
  })
  .filter((p, i, a) => p && a.indexOf(p) === i)
  .sort();

if (paths.length === 0) {
  console.error("The sitemap listed no URLs — refusing to report success.");
  process.exit(1);
}

console.log(`smoke: ${paths.length} advertised routes against ${BASE}\n`);

const failures = [];
for (const path of paths) {
  try {
    const res = await get(BASE + path);
    const ok = res.status === 200;
    // A 200 that renders an error page is still a failure — check for real bytes.
    const body = ok ? await res.text() : "";
    const looksRendered = ok && body.length > 2000;
    if (!ok || !looksRendered) {
      failures.push({
        path,
        status: res.status,
        reason: ok ? `only ${body.length} bytes rendered` : `HTTP ${res.status}`,
      });
      console.log(`  FAIL  ${path.padEnd(38)} ${ok ? `${body.length} bytes` : "HTTP " + res.status}`);
    } else {
      console.log(`  ok    ${path.padEnd(38)} ${body.length} bytes`);
    }
  } catch (err) {
    failures.push({ path, status: 0, reason: String(err).slice(0, 120) });
    console.log(`  FAIL  ${path.padEnd(38)} ${String(err).slice(0, 80)}`);
  }
}

console.log("");
if (failures.length) {
  console.error(`${failures.length} advertised route(s) did not render:\n`);
  for (const f of failures) console.error(`  ${f.path} — ${f.reason}`);
  console.error(
    "\nA route in the sitemap is a promise to a search engine. Fix it, or take it out of PUBLIC_PAGES."
  );
  process.exit(1);
}
console.log(`All ${paths.length} advertised routes render.`);
