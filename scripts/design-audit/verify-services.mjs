import { chromium } from "@playwright/test";
import fs from "node:fs";

const OUT = ".design-audit/services-redesign";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const [name, w, h] of [["desk", 1440, 1400], ["phone", 390, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, baseURL: "http://localhost:4000", isMobile: w < 600, hasTouch: w < 600 });
  const page = await ctx.newPage();
  await page.goto("/services", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/services-${name}.png`, fullPage: true });
  const r = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      amounts: (t.match(/₱[\d,]+/g) || []).length,
      hasOrient: !!document.querySelector(".sv-orient"),
      orientFacts: document.querySelectorAll(".sv-orient > li").length,
      hasAside: !!document.querySelector(".sv-aside"),
      hasScope: t.includes("If they will not get the package"),
      hasPlainScope: t.includes("quoted one by one"),
      planLink: !!document.querySelector('.sv-aside a[href="/plans"]'),
      allFive: t.includes("Request a quote for all five"),
      quoteActions: document.querySelectorAll('a[href^="/quote?"]').length,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      under16: [...document.querySelectorAll(".sv-page p, .sv-page li, .sv-page dt, .sv-page dd")]
        .filter((el) => el.textContent?.trim() && parseFloat(getComputedStyle(el).fontSize) < 16).length,
    };
  });
  console.log(`=== ${name} (${w}px) ===`);
  for (const [k, v] of Object.entries(r)) console.log(`  ${k.padEnd(16)}: ${v}`);
  console.log("");
  await ctx.close();
}
await browser.close();
console.log(`shots -> ${OUT}`);
