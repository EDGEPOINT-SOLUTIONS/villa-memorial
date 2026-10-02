import { chromium } from "@playwright/test";

/**
 * Which element is 1,272px wide in a 390px viewport?
 *
 * The audit reports ~1,272px of horizontal overflow on nearly every public page at
 * phone width — suspiciously close to the folio envelope (99rem = 1,267px at the
 * 80% root), which points at one shared element rather than 99 page bugs.
 */
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: "http://localhost:4000", isMobile: true, hasTouch: true });
const page = await ctx.newPage();

for (const route of ["/", "/services", "/facilities"]) {
  await page.goto(route, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const b = el.getBoundingClientRect();
      if (b.width <= vw + 1) continue;
      // Report only the OUTERMOST offenders: a wide parent with wide children is
      // one bug, not twenty.
      let p = el.parentElement;
      let parentWide = false;
      while (p && p !== document.body) {
        if (p.getBoundingClientRect().width > vw + 1) {
          parentWide = true;
          break;
        }
        p = p.parentElement;
      }
      if (parentWide) continue;
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || "").slice(0, 60),
        id: el.id || "",
        w: Math.round(b.width),
        left: Math.round(b.left),
      });
    }
    return { vw, scrollW: document.documentElement.scrollWidth, offenders: offenders.slice(0, 12) };
  });
  console.log(`\n=== ${route} — viewport ${r.vw}, scrollWidth ${r.scrollW} ===`);
  for (const o of r.offenders) {
    console.log(`  ${String(o.w).padStart(5)}px  left ${String(o.left).padStart(5)}  <${o.tag}${o.id ? ` id="${o.id}"` : ""} class="${o.cls}">`);
  }
}
await browser.close();
