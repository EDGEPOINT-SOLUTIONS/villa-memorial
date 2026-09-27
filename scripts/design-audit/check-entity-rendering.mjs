import { chromium } from "@playwright/test";

/**
 * Do the catalogue captions render their HTML entities literally?
 *
 * `lib/catalogue-imagery.ts` stores captions like
 * "The office&rsquo;s at-need call." — an HTML ENTITY. React escapes a string child,
 * so `{caption}` renders the six characters `&rsquo;` on the page rather than an
 * apostrophe. If that is what is happening, it is a real defect, and it will show
 * on every surface that prints a catalogue caption — not just the new service
 * cards.
 */
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, baseURL: "http://localhost:4000" });
const page = await ctx.newPage();

for (const route of ["/services", "/plans", "/products"]) {
  await page.goto(route, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const text = document.body.innerText;
    const entities = (text.match(/&[a-z]+;|&amp;[a-z]+;/gi) || []).slice(0, 6);
    // The raw HTML, to see whether React escaped an entity into the DOM as text.
    const html = document.documentElement.innerHTML;
    return {
      entitiesInText: entities,
      escapedInHtml: (html.match(/&amp;(rsquo|amp|mdash|hellip|nbsp);/g) || []).slice(0, 6),
      captions: [...document.querySelectorAll("figcaption, .shop-card__caption, .public-image__caption")]
        .map((f) => (f.textContent || "").trim())
        .slice(0, 8),
    };
  });
  console.log(`\n=== ${route} ===`);
  console.log(`  entity text visible : ${r.entitiesInText.length ? r.entitiesInText.join("  ") : "none"}`);
  console.log(`  escaped in the DOM  : ${r.escapedInHtml.length ? r.escapedInHtml.join("  ") : "none"}`);
  for (const c of r.captions) console.log(`    caption: ${c.slice(0, 78)}`);
}
await browser.close();
