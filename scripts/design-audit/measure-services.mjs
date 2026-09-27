import { chromium } from "@playwright/test";

const BASE = "http://localhost:4000";
const browser = await chromium.launch();

for (const w of [1440, 1024, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1000 }, baseURL: BASE });
  const page = await ctx.newPage();
  await page.goto("/services", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const main = document.querySelector(".sv-main");
    const m = main ? main.getBoundingClientRect() : null;
    const bands = [...(document.querySelectorAll(".sv-main > *") ?? [])].map((el) => ({
      cls: String(el.className).split(" ").slice(0, 2).join("."),
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
    }));
    return {
      vw,
      mainWidth: m ? Math.round(m.width) : null,
      mainLeft: m ? Math.round(m.left) : null,
      deadLeft: m ? Math.round(m.left) : 0,
      deadRight: m ? Math.round(vw - m.right) : 0,
      pageHeight: document.documentElement.scrollHeight,
      bands: bands.map((b) => ({ ...b, widest: 0 })),
    };
  });
  const bandDetail = await page.evaluate(() =>
    [...document.querySelectorAll(".sv-main > *")].map((el) => ({
      cls: String(el.className).split(" ")[0],
      h: Math.round(el.getBoundingClientRect().height),
      w: Math.round(el.getBoundingClientRect().width),
      widestChild: Math.max(
        ...[...el.querySelectorAll("*")].map((c) => Math.round(c.getBoundingClientRect().width)).filter((x) => x > 0),
        0
      ),
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 38),
    }))
  );
  console.log(`\n=== /services at ${w}px ===`);
  console.log(`  viewport ${r.vw}  main ${r.mainWidth}  dead left ${r.deadLeft}  dead right ${r.deadRight}  page ${r.pageHeight}px`);
  for (const b of bandDetail) console.log(`    +${String(b.h).padStart(4)}  w${String(b.w).padStart(4)}  widest ${String(b.widestChild).padStart(4)}  ${b.cls.padEnd(14)} "${b.text}"`);
  await ctx.close();
}
await browser.close();
